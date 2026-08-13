import express from 'express';
import paymentService, { getParam } from '../services/paymentService.js';
import transactionService from '../services/transactionService.js';
import userService from '../services/userService.js';
import logger from '../utils/logger.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/environment.js';

const router = express.Router();

function collectHypParams(req) {
  const fromQuery = req.query && typeof req.query === 'object' ? req.query : {};
  const fromBody = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  return { ...fromQuery, ...fromBody };
}

function rawQueryFromRequest(req) {
  if (req.url && req.url.includes('?')) {
    return req.url.split('?').slice(1).join('?');
  }
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (body && Object.keys(body).length > 0) {
    return new URLSearchParams(body).toString();
  }
  return '';
}

function paymentResultHtml({ type, uniqueId, message }) {
  const payload = JSON.stringify({ type, uniqueId: uniqueId || null });
  const frontendBase = (config.urls.frontend || 'http://localhost:8081').replace(/\/$/, '');
  const frontendReturn = `${frontendBase}/?payment=${encodeURIComponent(type)}&uniqueId=${encodeURIComponent(uniqueId || '')}`;
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>תשלום</title>
<style>
  body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; color: #4E0D66; }
  p { font-size: 16px; text-align: center; padding: 24px; }
</style>
</head>
<body>
  <p>${message}</p>
  <script>
    (function () {
      var payload = ${payload};
      var frontendReturn = ${JSON.stringify(frontendReturn)};
      var inFrame = false;
      try { inFrame = window.parent && window.parent !== window; } catch (e) { inFrame = true; }

      function notify() {
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, '*');
          }
        } catch (e) {}
        try {
          if (window.top && window.top !== window) {
            window.top.postMessage(payload, '*');
          }
        } catch (e) {}
      }

      notify();
      setTimeout(notify, 250);
      setTimeout(notify, 1000);
      setTimeout(notify, 2000);

      if (!inFrame) {
        setTimeout(function () {
          window.location.replace(frontendReturn);
        }, 800);
      }
    })();
  </script>
</body>
</html>`;
}

function sendBrowserResult(res, { type, uniqueId, message }) {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors *"
  );
  res.status(200).type('html').send(
    paymentResultHtml({ type, uniqueId, message })
  );
}

async function createTransactionFromPayment(paymentData) {
  const { userId, productId, productType, monthlyEntries, totalEntries, amount } =
    paymentData.metadata || {};

  if (!userId || !productId) {
    throw new ValidationError('Missing required metadata (userId or productId)', 'metadata');
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ValidationError('User not found', 'userId');
  }

  const now = new Date();
  let transactionData = {
    userId,
    transactionType: productType,
    amount: paymentData.amount || amount,
    hypTransactionId: paymentData.hypTransactionId,
    hypOrderId: paymentData.uniqueId || null,
    invoiceId: paymentData.hypTransactionId || paymentData.uniqueId,
    cardLast4: paymentData.cardLast4 || null,
    cardBrand: paymentData.cardBrand || null,
    lastPaymentDate: now,
    purchaseDate: now,
    isActive: true,
  };

  switch (productType) {
    case TRANSACTION_TYPES.SUBSCRIPTION:
      transactionData = {
        ...transactionData,
        monthlyEntries: monthlyEntries || 0,
        entriesUsedThisMonth: 0,
        lastRenewalDate: now,
        hypHkId: paymentData.hypHkId || null,
      };
      break;
    case TRANSACTION_TYPES.PUNCH_CARD:
      transactionData = {
        ...transactionData,
        totalEntries: totalEntries || 0,
        entriesRemaining: totalEntries || 0,
      };
      break;
    case TRANSACTION_TYPES.TRIAL_LESSON:
      break;
    default:
      logger.warn('Unknown product type in Hyp payment', {
        productType,
        uniqueId: paymentData.uniqueId,
      });
  }

  return transactionService.createTransaction(transactionData);
}

/**
 * Complete an initial checkout (payment_sessions lookup) or a recurring HK charge.
 * Idempotent on Hyp transaction Id.
 */
async function fulfillHypPayment(hypParams, rawQuery, { requireSignature = true } = {}) {
  const paymentData = await paymentService.processSuccessfulPayment(hypParams, rawQuery, {
    requireSignature,
  });

  if (paymentData.hypTransactionId) {
    const existing = await transactionService.getTransactionByHypTransactionId(
      paymentData.hypTransactionId
    );
    if (existing) {
      if (paymentData.uniqueId) {
        await paymentService.deleteSessionMetadata(paymentData.uniqueId);
      }
      return { transaction: existing, duplicate: true };
    }
  }

  const hasSession = Boolean(paymentData.metadata?.userId && paymentData.metadata?.productId);
  if (hasSession) {
    const transaction = await createTransactionFromPayment(paymentData);
    if (paymentData.uniqueId) {
      await paymentService.deleteSessionMetadata(paymentData.uniqueId);
    }
    return { transaction, duplicate: false };
  }

  if (paymentData.hypHkId) {
    const transaction = await transactionService.applyHypRecurringCharge(paymentData.hypHkId, {
      hypTransactionId: paymentData.hypTransactionId,
    });
    if (transaction) {
      return { transaction, duplicate: false, recurring: true };
    }
  }

  throw new ValidationError('No matching payment session or subscription for Hyp payment', 'Order');
}

async function handleSuccess(req, res) {
  const hypParams = collectHypParams(req);
  const rawQuery = rawQueryFromRequest(req);
  const uniqueId = getParam(hypParams, 'Order');

  try {
    const result = await fulfillHypPayment(hypParams, rawQuery, { requireSignature: true });
    logger.info('Hyp payment success fulfilled', {
      uniqueId,
      transactionId: result?.transaction?.id,
      duplicate: result?.duplicate,
    });
    sendBrowserResult(res, {
      type: 'payment_success',
      uniqueId,
      message: 'התשלום הושלם בהצלחה',
    });
    return result;
  } catch (error) {
    logger.error('Hyp payment success handling failed', {
      error: error.message,
      uniqueId,
      hypId: getParam(hypParams, 'Id'),
    });
    sendBrowserResult(res, {
      type: 'payment_failure',
      uniqueId,
      message: 'התשלום נכשל או לא אומת',
    });
  }
}

async function handleWebhook(req, res) {
  const hypParams = collectHypParams(req);
  const rawQuery = rawQueryFromRequest(req);
  const ccode = String(getParam(hypParams, 'CCode') ?? '');

  if (ccode !== '0') {
    logger.warn('Hyp webhook non-success', { ccode, order: getParam(hypParams, 'Order') });
    return res.json({ success: true, ignored: true });
  }

  try {
    const hasSign = Boolean(getParam(hypParams, 'Sign', 'signature'));
    await fulfillHypPayment(hypParams, rawQuery, { requireSignature: hasSign });
    return res.json({ success: true });
  } catch (error) {
    logger.error('Hyp webhook processing failed', {
      error: error.message,
      order: getParam(hypParams, 'Order'),
      hkId: getParam(hypParams, 'HKId'),
    });
    return res.status(500).json({ success: false, error: 'Failed to process payment webhook' });
  }
}

/**
 * Hyp Pay success redirect (browser / iframe).
 * GET /api/payment/success
 */
router.get('/success', handleSuccess);
router.post('/success', handleSuccess);

/**
 * Hyp Pay server-to-server webhook (enable in Hyp Portal / support).
 * Used for recurring HK charges after the first payment.
 */
router.get('/webhook', handleWebhook);
router.post('/webhook', handleWebhook);

/**
 * Optional failure redirect if configured in Hyp Portal.
 */
router.get('/failure', async (req, res) => {
  const hypParams = collectHypParams(req);
  const uniqueId = getParam(hypParams, 'Order');
  logger.warn('Hyp payment failure redirect', {
    uniqueId,
    ccode: getParam(hypParams, 'CCode'),
  });
  if (uniqueId) {
    await paymentService.deleteSessionMetadata(uniqueId);
  }
  sendBrowserResult(res, {
    type: 'payment_failure',
    uniqueId,
    message: 'התשלום נכשל',
  });
});

/**
 * Get payment session status (for frontend polling)
 * GET /api/payment/status/:uniqueId
 */
router.get('/status/:uniqueId', async (req, res) => {
  const { uniqueId } = req.params;

  try {
    const existing = await transactionService.getTransactionByHypOrderId(uniqueId);
    if (existing) {
      return res.json({
        status: 'completed',
        transactionId: existing.id,
        message: 'Payment completed successfully',
      });
    }

    const metadata = await paymentService.getSessionMetadata(uniqueId);
    if (metadata) {
      return res.json({
        status: 'pending',
        message: 'Payment session in progress',
      });
    }

    res.json({
      status: 'unknown',
      message: 'Payment session not found or expired',
    });
  } catch (error) {
    logger.error('Error checking payment status', {
      uniqueId,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to check payment status',
    });
  }
});

export default router;
