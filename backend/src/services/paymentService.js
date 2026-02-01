import config from '../config/environment.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { ExternalServiceError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { db } from '../config/firebase.js';

const PAYMENT_SESSION_COLLECTION = 'payment_sessions';

/**
 * ZCredit (SmartBee) Payment Service
 * 
 * Handles payment processing via:
 * - WebCheckout API: For creating iframe checkout sessions
 * - WebService API: For charging tokens (recurring payments)
 */
class PaymentService {
  constructor() {
    this.webCheckoutUrl = `${config.zcredit.apiUrl}/webcheckout/api/WebCheckout`;
    this.webServiceUrl = `${config.zcredit.apiUrl}/ZCreditWS/api/Transaction`;
    // Session metadata TTL: 1 hour
    this.sessionMetadataTTL = 3600;
  }

  /**
   * Store session metadata for callback processing
   */
  async storeSessionMetadata(uniqueId, metadata) {
    if (!uniqueId) return;

    const expiresAt = new Date(Date.now() + this.sessionMetadataTTL * 1000);

    // Store in Firestore so this works without Redis and across instances.
    await db.collection(PAYMENT_SESSION_COLLECTION).doc(uniqueId).set(
      {
        metadata,
        expiresAt,
        createdAt: new Date(),
      },
      { merge: true }
    );

    logger.debug('Stored session metadata (Firestore)', { uniqueId });
  }

  /**
   * Retrieve session metadata
   */
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
        // Best-effort cleanup
        await this.deleteSessionMetadata(uniqueId);
        return null;
      }

      if (data.metadata) {
        logger.debug('Retrieved session metadata (Firestore)', { uniqueId });
      } else {
        logger.warn('Session metadata doc missing metadata field', { uniqueId });
      }

      return data.metadata || null;
    } catch (error) {
      logger.error('Failed to retrieve session metadata', { uniqueId, error: error.message });
      return null;
    }
  }

  /**
   * Delete session metadata after processing
   */
  async deleteSessionMetadata(uniqueId) {
    if (!uniqueId) return;
    try {
      await db.collection(PAYMENT_SESSION_COLLECTION).doc(uniqueId).delete();
    } catch (error) {
      // Best-effort cleanup
      logger.warn('Failed to delete session metadata', { uniqueId, error: error.message });
    }
  }

  /**
   * Determine if a transaction type requires recurring payments
   * @param {string} transactionType 
   * @returns {boolean}
   */
  isRecurringType(transactionType) {
    return transactionType === TRANSACTION_TYPES.SUBSCRIPTION;
  }

  /**
   * Create a WebCheckout session for iframe embedding
   * @param {string} userId - User ID
   * @param {string} productId - Product ID  
   * @param {Object} productData - Product details (type, price, name, etc.)
   * @param {Object} options - Optional settings
   * @returns {Promise<Object>} Session data with URL
   */
  async createCheckoutSession(userId, productId, productData, options = {}) {
    const uniqueId = `${userId}-${productId}-${Date.now()}`;
    const isRecurring = this.isRecurringType(productData.type);

    logger.info('Creating checkout session', {
      userId,
      productId,
      productType: productData.type,
      amount: productData.price,
      isRecurring,
      uniqueId,
    });

    // We store metadata in a structured UniqueID format since AdditionalText doesn't allow special chars
    // Format: userId|productId|productType|timestamp
    // We'll parse this on callback
    const metadataString = `${userId}|${productId}|${productData.type}|${Date.now()}`;
    
    const requestBody = {
      Key: config.zcredit.key,
      UniqueID: uniqueId,
      Local: 'He', // Hebrew language
      
      // Callback URLs
      CallBackUrl: `${config.urls.backend}/api/payment/callback`,
      SuccessUrl: `${config.urls.frontend}/payment/success?uniqueId=${encodeURIComponent(uniqueId)}`,
      CancelUrl: `${config.urls.frontend}/payment/cancel?uniqueId=${encodeURIComponent(uniqueId)}`,
      FailureRedirectUrl: `${config.urls.frontend}/payment/failure?uniqueId=${encodeURIComponent(uniqueId)}`,
      
      // Payment settings
      PaymentType: 'regular', // Always charge first payment
      ShowCart: false, // Minimal UI for iframe
      
      // Total amount (required)
      Total: productData.price,
      
      // Cart items
      CartItems: [{
        Amount: productData.price,
        Description: productData.name,
        Quantity: 1,
      }],
      
      // Currency (1 = ILS)
      Currency: 1,
      
      // Customer info if provided
      ...(options.customerEmail && { CustomerEmail: options.customerEmail }),
      ...(options.customerName && { CustomerName: options.customerName }),
      ...(options.customerPhone && { CustomerPhone: options.customerPhone }),
    };

    logger.info('ZCredit CreateSession request', {
      uniqueId,
      callbackUrl: requestBody.CallBackUrl,
      amount: productData.price,
    });

    try {
      const response = await fetch(`${this.webCheckoutUrl}/CreateSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      logger.debug('ZCredit CreateSession raw response', {
        statusCode: response.status,
        hasError: responseData.HasError,
        dataHasError: responseData.Data?.HasError,
      });

      // Response structure: { HasError, Data: { HasError, ReturnCode, SessionId, SessionUrl, ... } }
      const data = responseData.Data || responseData;

      if (!response.ok || responseData.HasError || data.HasError || !data.SessionUrl) {
        logger.error('ZCredit CreateSession failed', {
          error: data.ReturnMessage || 'Unknown error',
          errorCode: data.ReturnCode,
          hasError: data.HasError,
          userId,
          productId,
        });
        throw new ExternalServiceError(
          data.ReturnMessage || 'שגיאה ביצירת עמוד תשלום. אנא נסה שנית.',
          'PAYMENT_SESSION_ERROR'
        );
      }

      logger.info('ZCredit CreateSession response', {
        sessionId: data.SessionId,
        hasSessionUrl: !!data.SessionUrl,
        uniqueId,
      });

      // Store session metadata for callback processing
      await this.storeSessionMetadata(uniqueId, {
        userId,
        productId,
        productType: productData.type,
        isRecurring,
        amount: productData.price,
        monthlyEntries: productData.monthlyEntries || null,
        totalEntries: productData.totalEntries || null,
        sessionId: data.SessionId,
      });

      return {
        sessionId: data.SessionId,
        sessionUrl: data.SessionUrl,
        uniqueId,
        isRecurring,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      
      logger.error('ZCredit CreateSession network error', {
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
   * Process callback data from ZCredit after successful payment
   * @param {Object} callbackData - Data received from ZCredit callback
   * @returns {Promise<Object>} Processed payment data with metadata
   */
  async processCallbackData(callbackData) {
    const {
      SessionId,
      ReferenceNumber,
      Token,
      Total,
      CardNum,
      CardName,
      ApprovalNumber,
      UniqueID,
      CustomerEmail,
      CustomerName,
      CustomerPhone,
      ExpDate_MMYY,
    } = callbackData;

    logger.info('Processing payment callback', {
      sessionId: SessionId,
      referenceNumber: ReferenceNumber,
      hasToken: !!Token,
      total: Total,
      uniqueId: UniqueID,
    });

    // Retrieve stored metadata using UniqueID
    let metadata = await this.getSessionMetadata(UniqueID);
    
    if (!metadata) {
      logger.error('No metadata found for payment callback', {
        sessionId: SessionId,
        uniqueId: UniqueID,
      });
      // Try to parse UniqueID format: userId-productId-timestamp
      const parts = UniqueID ? UniqueID.split('-') : [];
      if (parts.length >= 2) {
        metadata = {
          userId: parts[0],
          productId: parts.slice(1, -1).join('-'), // Everything except last part (timestamp)
        };
        logger.warn('Using parsed UniqueID as fallback metadata', { metadata });
      }
    }

    const processedData = {
      sessionId: SessionId,
      referenceNumber: ReferenceNumber,
      token: Token || null,
      amount: Total,
      cardLast4: CardNum || null,
      cardBrand: CardName || null,
      approvalNumber: ApprovalNumber,
      uniqueId: UniqueID,
      cardExpiry: ExpDate_MMYY || null,
      customer: {
        email: CustomerEmail || null,
        name: CustomerName || null,
        phone: CustomerPhone || null,
      },
      metadata: metadata || {},
    };

    logger.info('Payment callback processed successfully', {
      sessionId: SessionId,
      userId: metadata?.userId,
      productId: metadata?.productId,
      tokenStored: metadata?.isRecurring && !!Token,
    });

    // Clean up stored metadata
    if (UniqueID) {
      await this.deleteSessionMetadata(UniqueID);
    }

    return processedData;
  }

  /**
   * Charge a token for recurring payment (used by cron script)
   * @param {string} token - Payment token
   * @param {number} amount - Amount to charge
   * @param {string} transactionId - Transaction ID for reference
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Charge result
   */
  async chargeToken(token, amount, transactionId, options = {}) {
    const uniqueId = `recurring-${transactionId}-${Date.now()}`;

    logger.info('Charging token for recurring payment', {
      transactionId,
      amount,
      uniqueId,
    });

    const requestBody = {
      TerminalNumber: config.zcredit.terminalNumber,
      Password: config.zcredit.password,
      
      // Token as card number
      CardNumber: token,
      
      // Transaction details
      TransactionSum: amount,
      TransactionUniqueIdForQuery: uniqueId,
      
      // Transaction type
      J: 0, // Regular charge
      CreditType: 1, // Regular payment (not installments)
      Currency: 1, // ILS
      
      // Optional customer info
      ...(options.holderId && { HolderID: options.holderId }),
    };

    try {
      const response = await fetch(`${this.webServiceUrl}/CommitFullTransaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data.HasError || data.ReturnCode !== 0) {
        logger.error('Token charge failed', {
          transactionId,
          error: data.ReturnMessage || 'Unknown error',
          errorCode: data.ReturnCode,
          amount,
        });
        throw new ExternalServiceError(
          data.ReturnMessage || 'שגיאה בחיוב התשלום החוזר',
          'RECURRING_CHARGE_FAILED'
        );
      }

      logger.info('Token charge successful', {
        transactionId,
        referenceNumber: data.ReferenceNumber,
        amount,
      });

      return {
        success: true,
        referenceNumber: data.ReferenceNumber,
        approvalNumber: data.AuthNum,
        amount,
        transactionId,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      logger.error('Token charge network error', {
        transactionId,
        error: error.message,
        amount,
      });
      throw new ExternalServiceError(
        'שגיאה בהתחברות לשרת התשלומים לחיוב חוזר',
        'RECURRING_NETWORK_ERROR'
      );
    }
  }

  /**
   * Get token data (card info) from ZCredit
   * @param {string} token - Payment token
   * @returns {Promise<Object>} Token data
   */
  async getTokenData(token) {
    logger.info('Fetching token data', { hasToken: !!token });

    const requestBody = {
      TerminalNumber: config.zcredit.terminalNumber,
      Password: config.zcredit.password,
      Token: token,
    };

    try {
      const response = await fetch(`${this.webServiceUrl}/GetTokenData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data.HasError) {
        logger.error('GetTokenData failed', {
          error: data.ReturnMessage || 'Unknown error',
          errorCode: data.ReturnCode,
        });
        return null;
      }

      return {
        cardNumber: data.CardNumber, // Masked card number
        expiryDate: data.ExpDate_MMYY,
        holderId: data.HolderID,
      };
    } catch (error) {
      logger.error('GetTokenData network error', { error: error.message });
      return null;
    }
  }

  /**
   * Refund a transaction
   * @param {string} referenceNumber - ZCredit reference number
   * @param {number} amount - Amount to refund (optional, full refund if not provided)
   * @returns {Promise<Object>} Refund result
   */
  async refundTransaction(referenceNumber, amount = null) {
    logger.info('Initiating refund', { referenceNumber, amount });

    const requestBody = {
      TerminalNumber: config.zcredit.terminalNumber,
      Password: config.zcredit.password,
      ReferenceNumber: referenceNumber,
      ...(amount && { PartialSum: amount }),
    };

    try {
      const response = await fetch(`${this.webServiceUrl}/RefundTransaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data.HasError) {
        logger.error('Refund failed', {
          referenceNumber,
          error: data.ReturnMessage || 'Unknown error',
          errorCode: data.ReturnCode,
        });
        throw new ExternalServiceError(
          'שגיאה בביצוע הזיכוי',
          'REFUND_FAILED'
        );
      }

      logger.info('Refund successful', {
        referenceNumber,
        newReferenceNumber: data.ReferenceNumber,
      });

      return {
        success: true,
        referenceNumber: data.ReferenceNumber,
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      logger.error('Refund network error', {
        referenceNumber,
        error: error.message,
      });
      throw new ExternalServiceError(
        'שגיאה בהתחברות לשרת התשלומים לביצוע זיכוי',
        'REFUND_NETWORK_ERROR'
      );
    }
  }

  /**
   * Query transaction status by reference ID
   * @param {string} referenceNumber - ZCredit reference number
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(referenceNumber) {
    logger.info('Querying transaction status', { referenceNumber });

    const requestBody = {
      TerminalNumber: config.zcredit.terminalNumber,
      Password: config.zcredit.password,
      ReferenceNumber: referenceNumber,
    };

    try {
      const response = await fetch(`${this.webServiceUrl}/GetTransactionStatusByReferenceId`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data.HasError) {
        logger.warn('GetTransactionStatus failed', {
          referenceNumber,
          error: data.ReturnMessage,
        });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('GetTransactionStatus network error', {
        referenceNumber,
        error: error.message,
      });
      return null;
    }
  }
}

export default new PaymentService();
