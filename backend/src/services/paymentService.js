import { randomBytes } from 'crypto';
import config from '../config/environment.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { ExternalServiceError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { db } from '../config/firebase.js';

/**
 * Temporary session metadata for checkout flow (see docs/database.md).
 * Written when creating the Hyp Pay page (before payment). Hyp redirect/webhook
 * sends Order + gateway fields; we look up userId/productId here to create the transaction.
 * Docs are deleted after success; TTL 1h.
 */
const PAYMENT_SESSION_COLLECTION = 'payment_sessions';

function parseHypQuery(text) {
  const raw = String(text || '').trim().replace(/^\?/, '');
  const params = new URLSearchParams(raw);
  const obj = {};
  for (const [key, value] of params.entries()) {
    obj[key] = value;
  }
  return obj;
}

function getParam(params, ...names) {
  for (const name of names) {
    if (params[name] != null && params[name] !== '') {
      return params[name];
    }
    const match = Object.keys(params).find((k) => k.toLowerCase() === name.toLowerCase());
    if (match && params[match] != null && params[match] !== '') {
      return params[match];
    }
  }
  return null;
}

function hypSignErrorMessage(ccode) {
  if (ccode === '902' || ccode === '901') {
    return 'שגיאת אימות מול Hyp. בדקו ש-HYP_MASOF, HYP_KEY ו-HYP_PASSP תואמים לסיסמת ה-API בפורטל (לא סיסמת ההתחברות).';
  }
  return 'שגיאה ביצירת עמוד תשלום. אנא נסה שנית.';
}

class PaymentService {
  constructor() {
    this.apiUrl = (config.hyp.apiUrl || 'https://pay.hyp.co.il/p/').replace(/\?+$/, '');
    this.sessionMetadataTTL = 3600;
  }

  getCredentials() {
    const masof = config.hyp.masof;
    const key = config.hyp.key;
    const passP = config.hyp.passP;
    if (!masof || !key || !passP) {
      throw new ValidationError(
        'Hyp Pay credentials are not configured (HYP_MASOF, HYP_KEY, HYP_PASSP)',
        'hyp'
      );
    }
    return { masof, key, passP };
  }

  async storeSessionMetadata(uniqueId, metadata) {
    if (!uniqueId) return;

    const expiresAt = new Date(Date.now() + this.sessionMetadataTTL * 1000);

    await db.collection(PAYMENT_SESSION_COLLECTION).doc(uniqueId).set(
      {
        metadata,
        expiresAt,
        createdAt: new Date(),
      },
      { merge: true }
    );
  }

  async getSessionMetadata(uniqueId) {
    if (!uniqueId) return null;

    try {
      const doc = await db.collection(PAYMENT_SESSION_COLLECTION).doc(uniqueId).get();
      if (!doc.exists) {
        logger.warn('Session metadata not found', { uniqueId });
        return null;
      }

      const data = doc.data() || {};
      const expiresAt =
        data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : null);

      if (expiresAt && Date.now() > expiresAt.getTime()) {
        logger.warn('Session metadata expired', { uniqueId });
        await this.deleteSessionMetadata(uniqueId);
        return null;
      }

      if (!data.metadata) {
        logger.warn('Session metadata doc missing metadata field', { uniqueId });
      }

      return data.metadata || null;
    } catch (error) {
      logger.error('Failed to retrieve session metadata', { uniqueId, error: error.message });
      return null;
    }
  }

  async deleteSessionMetadata(uniqueId) {
    if (!uniqueId) return;
    try {
      await db.collection(PAYMENT_SESSION_COLLECTION).doc(uniqueId).delete();
    } catch (error) {
      logger.warn('Failed to delete session metadata', { uniqueId, error: error.message });
    }
  }

  isRecurringType(transactionType) {
    return transactionType === TRANSACTION_TYPES.SUBSCRIPTION;
  }

  /**
   * Create a Hyp Pay hosted payment page URL for iframe/WebView checkout.
   */
  async createCheckoutSession(userId, productId, productData, options = {}) {
    const uniqueId = `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
    const isRecurring = this.isRecurringType(productData.type);
    const { masof, key, passP } = this.getCredentials();

    const successUrl = `${config.urls.backend}/api/payment/success`;
    const params = new URLSearchParams({
      action: 'APISign',
      What: 'SIGN',
      Sign: 'True',
      Masof: masof,
      KEY: key,
      PassP: passP,
      Amount: String(productData.price),
      Coin: '1',
      PageLang: 'HEB',
      UTF8: 'True',
      UTF8out: 'True',
      Order: uniqueId,
      Info: productData.name || 'StudioBuda',
      OKURL: successUrl,
      MoreData: 'True',
    });

    if (isRecurring) {
      // Tash=999 = unlimited monthly HK charges. FirstPaymentTash=1 = first charge is one payment (no installment picker).
      params.set('HK', 'True');
      params.set('freq', '1');
      params.set('Tash', '999');
      params.set('FirstPaymentTash', '1');
      params.set('OnlyOnApprove', 'True');
    } else {
      // Terminal defaults often allow many installments; lock this purchase to a single charge.
      params.set('Tash', '1');
      params.set('FixTash', 'True');
    }

    if (options.customerName) {
      const parts = String(options.customerName).trim().split(/\s+/);
      if (parts[0]) params.set('ClientName', parts[0]);
      if (parts.length > 1) params.set('ClientLName', parts.slice(1).join(' '));
    }
    if (options.customerEmail) params.set('email', options.customerEmail);
    if (options.customerPhone) params.set('cell', options.customerPhone);

    try {
      const signUrl = `${this.apiUrl}?${params.toString()}`;
      const response = await fetch(signUrl, { method: 'GET' });
      const responseText = (await response.text()).trim();

      if (!response.ok) {
        logger.error('Hyp APISign failed', {
          status: response.status,
          userId,
          productId,
        });
        throw new ExternalServiceError(
          'שגיאה ביצירת עמוד תשלום. אנא נסה שנית.',
          'PAYMENT_SESSION_ERROR'
        );
      }

      const signed = parseHypQuery(responseText);
      const resultCode = getParam(signed, 'CCode');
      if (resultCode && resultCode !== '0') {
        logger.error('Hyp APISign rejected', { ccode: resultCode, userId, productId });
        throw new ExternalServiceError(
          hypSignErrorMessage(resultCode),
          'PAYMENT_SESSION_ERROR'
        );
      }

      if (!getParam(signed, 'signature') && !responseText.includes('action=pay')) {
        logger.error('Hyp APISign missing signature', { userId, productId });
        throw new ExternalServiceError(
          'שגיאה ביצירת עמוד תשלום. אנא נסה שנית.',
          'PAYMENT_SESSION_ERROR'
        );
      }

      const sessionUrl = responseText.startsWith('http')
        ? responseText
        : `${this.apiUrl}?${responseText.replace(/^\?/, '')}`;

      await this.storeSessionMetadata(uniqueId, {
        userId,
        productId,
        productType: productData.type,
        isRecurring,
        amount: productData.price,
        monthlyEntries: productData.monthlyEntries || null,
        totalEntries: productData.totalEntries || null,
      });

      return {
        sessionId: uniqueId,
        sessionUrl,
        uniqueId,
        isRecurring,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError || error instanceof ValidationError) {
        throw error;
      }

      logger.error('Hyp APISign network error', {
        error: error.message,
        userId,
        productId,
      });
      throw new ExternalServiceError(
        'שגיאה בהתחברות לשרת התשלומים. אנא נסה שנית.',
        'PAYMENT_NETWORK_ERROR'
      );
    }
  }

  /**
   * Verify Hyp Pay redirect/webhook parameters (APISign What=VERIFY).
   * rawQuery should be the original query string in the same order Hyp sent it.
   */
  async verifyRedirect(rawQuery, hypParams = {}) {
    const { masof, key, passP } = this.getCredentials();
    const query = String(rawQuery || '').replace(/^\?/, '');
    const fallback = new URLSearchParams(hypParams).toString();
    const payload = query || fallback;

    if (!payload) {
      return false;
    }

    const verifyParams = new URLSearchParams({
      action: 'APISign',
      What: 'VERIFY',
      Masof: masof,
      KEY: key,
      PassP: passP,
    });

    try {
      const verifyUrl = `${this.apiUrl}?${verifyParams.toString()}&${payload}`;
      const response = await fetch(verifyUrl, { method: 'GET' });
      const text = (await response.text()).trim();
      const parsed = parseHypQuery(text);
      return getParam(parsed, 'CCode') === '0';
    } catch (error) {
      logger.error('Hyp VERIFY network error', { error: error.message });
      return false;
    }
  }

  /**
   * Parse and validate a successful Hyp Pay completion (redirect or webhook).
   */
  async processSuccessfulPayment(hypParams, rawQuery, { requireSignature = true } = {}) {
    const ccode = String(getParam(hypParams, 'CCode') ?? '');
    if (ccode !== '0') {
      throw new ValidationError('התשלום לא אושר', 'CCode');
    }

    const hasSign = Boolean(getParam(hypParams, 'Sign', 'signature'));
    if (requireSignature || hasSign) {
      const verified = await this.verifyRedirect(rawQuery, hypParams);
      if (!verified) {
        throw new ValidationError('אימות התשלום נכשל', 'Sign');
      }
    }

    const uniqueId = getParam(hypParams, 'Order');
    const metadata = uniqueId ? await this.getSessionMetadata(uniqueId) : null;

    return {
      uniqueId,
      hypTransactionId: getParam(hypParams, 'Id') || null,
      hypHkId: getParam(hypParams, 'HKId') || null,
      amount: parseFloat(getParam(hypParams, 'Amount')) || null,
      approvalNumber: getParam(hypParams, 'ACode') || null,
      cardLast4: getParam(hypParams, 'L4digit', 'CardNum') || null,
      cardBrand: getParam(hypParams, 'Brand', 'CardName') || null,
      metadata: metadata || {},
    };
  }

  /**
   * Terminate a Hyp-managed recurring agreement (Horaat Keva).
   */
  async cancelHypAgreement(hkId) {
    if (!hkId) return { success: true, alreadyTerminated: true };

    const { masof, passP } = this.getCredentials();
    const params = new URLSearchParams({
      action: 'HKStatus',
      Masof: masof,
      PassP: passP,
      HKId: String(hkId),
      NewStat: '1',
    });

    try {
      const response = await fetch(`${this.apiUrl}?${params.toString()}`, { method: 'GET' });
      const text = (await response.text()).trim();
      const parsed = parseHypQuery(text);
      const ccode = getParam(parsed, 'CCode');

      // 0 = updated, 906 = agreement does not exist (already gone)
      if (ccode === '0' || ccode === '906') {
        return { success: true, alreadyTerminated: ccode === '906' };
      }

      logger.error('Hyp HKStatus failed', { hkId, ccode });
      throw new ExternalServiceError('שגיאה בביטול הוראת הקבע', 'HK_CANCEL_FAILED');
    } catch (error) {
      if (error instanceof ExternalServiceError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Hyp HKStatus network error', { hkId, error: error.message });
      throw new ExternalServiceError(
        'שגיאה בהתחברות לשרת התשלומים לביטול הוראת קבע',
        'HK_CANCEL_NETWORK_ERROR'
      );
    }
  }
}

export default new PaymentService();
export { parseHypQuery, getParam };
