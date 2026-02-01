import paymentService from '../../services/paymentService.js';
import transactionService from '../../services/transactionService.js';
import { requireAuthenticated } from '../middleware/permissions.js';
import { ValidationError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export const paymentResolvers = {
  Query: {
    paymentStatus: async (_, { uniqueId }, context) => {
      await requireAuthenticated(context);
      
      logger.info('Checking payment status', { uniqueId, userId: context.user.id });

      // Check if we have metadata stored (means session exists but not yet completed)
      const metadata = await paymentService.getSessionMetadata(uniqueId);
      
      if (metadata) {
        // Session exists, payment not yet completed
        return {
          status: 'pending',
          transactionId: null,
          message: 'תהליך התשלום בתהליך',
        };
      }

      // Check for recent transaction by this user
      try {
        const transactions = await transactionService.getUserActiveTransactions(context.user.id, false);
        
        // Find a transaction that was created recently (within last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentTransaction = transactions.find(tx => {
          const createdAt = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
          return createdAt > fiveMinutesAgo;
        });

        if (recentTransaction) {
          return {
            status: 'completed',
            transactionId: recentTransaction.id,
            message: 'התשלום הושלם בהצלחה',
          };
        }
      } catch (error) {
        logger.warn('Error checking recent transactions', { error: error.message, uniqueId });
      }

      // Session not found
      return {
        status: 'unknown',
        transactionId: null,
        message: 'לא נמצא תהליך תשלום פעיל',
      };
    },
  },

  Mutation: {
    createPaymentSession: async (_, { productId, product }, context) => {
      await requireAuthenticated(context);
      
      const userId = context.user.id;
      
      logger.info('Creating payment session via GraphQL', {
        userId,
        productId,
        productType: product.type,
        amount: product.price,
      });

      // Validate product data
      if (!product.type || !product.price || !product.name) {
        throw new ValidationError('Product must have type, price, and name');
      }

      if (product.price <= 0) {
        throw new ValidationError('Product price must be greater than 0');
      }

      // Create the checkout session
      const session = await paymentService.createCheckoutSession(
        userId,
        productId,
        {
          type: product.type,
          price: product.price,
          name: product.name,
          monthlyEntries: product.monthlyEntries,
          totalEntries: product.totalEntries,
        },
        {
          customerEmail: context.user.email,
          customerName: `${context.user.firstName} ${context.user.lastName}`.trim() || null,
          customerPhone: context.user.phone || null,
        }
      );

      logger.info('Payment session created via GraphQL', {
        userId,
        productId,
        sessionId: session.sessionId,
        isRecurring: session.isRecurring,
      });

      return session;
    },
  },
};

/**
 * Transaction field resolver for accessEndsDate
 * Calculates when access will end (lastPaymentDate + 30 days)
 */
export const transactionAccessEndsDateResolver = (transaction) => {
  if (transaction.transactionType !== 'subscription') {
    return null;
  }

  const lastPaymentDate = transaction.lastPaymentDate?.toDate
    ? transaction.lastPaymentDate.toDate()
    : new Date(transaction.lastPaymentDate);

  if (!lastPaymentDate || isNaN(lastPaymentDate.getTime())) {
    return null;
  }

  // Add 30 days to last payment date
  const accessEndsDate = new Date(lastPaymentDate);
  accessEndsDate.setDate(accessEndsDate.getDate() + 30);

  return accessEndsDate.toISOString();
};
