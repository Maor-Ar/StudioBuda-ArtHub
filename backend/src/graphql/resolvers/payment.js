import paymentService from '../../services/paymentService.js';
import transactionService from '../../services/transactionService.js';
import productService from '../../services/productService.js';
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
    createPaymentSession: async (_, { productId, product: productInput }, context) => {
      await requireAuthenticated(context);

      const userId = context.user.id;

      const serverProduct = await productService.getActivePurchasableForCheckout(productId);

      if (serverProduct.price <= 0) {
        throw new ValidationError('Product price must be greater than 0');
      }

      if (productInput) {
        if (productInput.price != null && Number(productInput.price) !== Number(serverProduct.price)) {
          throw new ValidationError('Product price does not match catalog', 'product');
        }
        if (productInput.type && productInput.type !== serverProduct.type) {
          throw new ValidationError('Product type does not match catalog', 'product');
        }
      }

      logger.info('Creating payment session via GraphQL', {
        userId,
        productId,
        productType: serverProduct.type,
        amount: serverProduct.price,
      });

      const session = await paymentService.createCheckoutSession(
        userId,
        productId,
        {
          type: serverProduct.type,
          price: serverProduct.price,
          name: serverProduct.title,
          monthlyEntries: serverProduct.monthlyEntries,
          totalEntries: serverProduct.totalEntries,
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
 * Calculates when access will end (lastRenewalDate + 1 month, i.e. end of current billing period)
 */
export const transactionAccessEndsDateResolver = (transaction) => {
  if (transaction.transactionType !== 'subscription') {
    return null;
  }

  let periodStart;
  if (transaction.lastRenewalDate?.toDate) {
    periodStart = transaction.lastRenewalDate.toDate();
  } else if (transaction.lastRenewalDate) {
    periodStart = new Date(transaction.lastRenewalDate);
  } else if (transaction.lastPaymentDate?.toDate) {
    periodStart = transaction.lastPaymentDate.toDate();
  } else {
    periodStart = new Date(transaction.lastPaymentDate);
  }

  if (!periodStart || isNaN(periodStart.getTime())) {
    return null;
  }

  // Access ends one month after the start of the current period
  const accessEndsDate = new Date(periodStart);
  accessEndsDate.setMonth(accessEndsDate.getMonth() + 1);

  return accessEndsDate.toISOString();
};
