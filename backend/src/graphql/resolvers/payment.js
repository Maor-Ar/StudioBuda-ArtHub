import paymentService from '../../services/paymentService.js';
import transactionService from '../../services/transactionService.js';
import productService from '../../services/productService.js';
import { requireAuthenticated } from '../middleware/permissions.js';
import { ValidationError } from '../../utils/errors.js';

export const paymentResolvers = {
  Query: {
    paymentStatus: async (_, { uniqueId }, context) => {
      await requireAuthenticated(context);

      const metadata = await paymentService.getSessionMetadata(uniqueId);
      const existing = await transactionService.getTransactionByHypOrderId(uniqueId);

      if (existing && existing.userId === context.user.id) {
        return {
          status: 'completed',
          transactionId: existing.id,
          message: 'התשלום הושלם בהצלחה',
        };
      }

      if (metadata) {
        if (metadata.userId && metadata.userId !== context.user.id) {
          return {
            status: 'unknown',
            transactionId: null,
            message: 'לא נמצא תהליך תשלום פעיל',
          };
        }
        return {
          status: 'pending',
          transactionId: null,
          message: 'תהליך התשלום בתהליך',
        };
      }

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
