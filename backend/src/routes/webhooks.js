import express from 'express';
import paymentService from '../services/paymentService.js';
import transactionService from '../services/transactionService.js';
import userService from '../services/userService.js';
import logger from '../utils/logger.js';
import { TRANSACTION_TYPES } from '../config/constants.js';

const router = express.Router();

/**
 * ZCredit Payment Callback Endpoint
 * 
 * Called by ZCredit after a successful payment to deliver payment details.
 * This endpoint creates the transaction record in our database.
 * 
 * POST /api/payment/callback
 */
router.post('/callback', async (req, res) => {
  const startTime = Date.now();
  
  logger.info('Received ZCredit callback', {
    hasToken: !!req.body.Token,
    sessionId: req.body.SessionId,
    uniqueId: req.body.UniqueID,
    referenceNumber: req.body.ReferenceNumber,
    total: req.body.Total,
  });

  try {
    // Process the callback data
    const paymentData = await paymentService.processCallbackData(req.body);
    
    if (!paymentData.metadata?.userId || !paymentData.metadata?.productId) {
      logger.error('Callback missing required metadata', {
        sessionId: paymentData.sessionId,
        metadata: paymentData.metadata,
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required metadata (userId or productId)',
      });
    }

    const { userId, productId, productType, isRecurring, monthlyEntries, totalEntries, amount } = paymentData.metadata;

    // Verify user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      logger.error('User not found for payment callback', { userId, sessionId: paymentData.sessionId });
      return res.status(400).json({
        success: false,
        error: 'User not found',
      });
    }

    // Create transaction based on product type
    const now = new Date();
    let transactionData = {
      userId,
      transactionType: productType,
      amount: paymentData.amount || amount,
      zcreditReferenceNumber: paymentData.referenceNumber,
      cardLast4: paymentData.cardLast4,
      cardBrand: paymentData.cardBrand,
      lastPaymentDate: now,
      purchaseDate: now,
      isActive: true,
    };

    // Add type-specific fields
    switch (productType) {
      case TRANSACTION_TYPES.SUBSCRIPTION:
        transactionData = {
          ...transactionData,
          monthlyEntries: monthlyEntries || 0,
          entriesUsedThisMonth: 0,
          lastRenewalDate: now,
          // Store token only for subscriptions (needed for recurring payments)
          paymentToken: paymentData.token || null,
        };
        break;
      
      case TRANSACTION_TYPES.PUNCH_CARD:
        transactionData = {
          ...transactionData,
          totalEntries: totalEntries || 0,
          entriesRemaining: totalEntries || 0,
          // No token stored for one-time payments
        };
        break;
      
      case TRANSACTION_TYPES.TRIAL_LESSON:
        transactionData = {
          ...transactionData,
          // Mark trial as used for this user
        };
        break;
      
      default:
        logger.warn('Unknown product type in callback', { productType, sessionId: paymentData.sessionId });
    }

    // Create the transaction
    const transaction = await transactionService.createTransaction(transactionData);

    logger.info('Payment callback processed - transaction created', {
      sessionId: paymentData.sessionId,
      transactionId: transaction.id,
      userId,
      productType,
      amount: transactionData.amount,
      hasToken: !!transactionData.paymentToken,
      processingTime: Date.now() - startTime,
    });

    // Return success
    res.json({
      success: true,
      transactionId: transaction.id,
      message: 'Payment processed successfully',
    });

  } catch (error) {
    logger.error('Payment callback processing failed', {
      error: error.message,
      stack: error.stack,
      sessionId: req.body.SessionId,
      uniqueId: req.body.UniqueID,
      processingTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process payment callback',
    });
  }
});

/**
 * ZCredit Payment Failure Callback
 * 
 * Called when a payment fails (optional endpoint)
 * 
 * POST /api/payment/failure-callback
 */
router.post('/failure-callback', async (req, res) => {
  logger.warn('Received ZCredit failure callback', {
    sessionId: req.body.SessionId,
    uniqueId: req.body.UniqueID,
    error: req.body.ErrorMessage || req.body.ReturnMessage,
    errorCode: req.body.ErrorCode || req.body.ReturnCode,
  });

  // Clean up any stored metadata
  if (req.body.UniqueID) {
    await paymentService.deleteSessionMetadata(req.body.UniqueID);
  }

  res.json({ success: true, message: 'Failure acknowledged' });
});

/**
 * Get payment session status (for frontend polling)
 * 
 * GET /api/payment/status/:uniqueId
 */
router.get('/status/:uniqueId', async (req, res) => {
  const { uniqueId } = req.params;
  
  try {
    // Check if we have metadata stored (means session exists but not yet completed)
    const metadata = await paymentService.getSessionMetadata(uniqueId);
    
    if (metadata) {
      // Session exists, payment not yet completed
      return res.json({
        status: 'pending',
        message: 'Payment session in progress',
      });
    }

    // Metadata was cleaned up, try to find the transaction
    // Parse uniqueId to get userId: format is userId-productId-timestamp
    const parts = uniqueId.split('-');
    if (parts.length >= 2) {
      const userId = parts[0];
      // Check for recent transaction by this user
      const transactions = await transactionService.getUserActiveTransactions(userId, false);
      
      // Find a transaction that was created recently (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentTransaction = transactions.find(tx => 
        tx.createdAt && new Date(tx.createdAt) > fiveMinutesAgo
      );

      if (recentTransaction) {
        return res.json({
          status: 'completed',
          transactionId: recentTransaction.id,
          message: 'Payment completed successfully',
        });
      }
    }

    // Session not found
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
