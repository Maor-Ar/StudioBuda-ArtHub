import paymentService from '../../services/paymentService.js';
import transactionService from '../../services/transactionService.js';
import productService from '../../services/productService.js';
import reservedRegularService from '../../services/reservedRegularService.js';
import { requireAuthenticated } from '../middleware/permissions.js';
import { ValidationError } from '../../utils/errors.js';
import { TRANSACTION_TYPES } from '../../config/constants.js';
import { accessEndsDateFromTransaction } from '../../utils/reservedRegulars.js';

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
    createPaymentSession: async (_, { productId, product: productInput, reservedEventId }, context) => {
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

      let sessionEventId = null;
      if (serverProduct.type === TRANSACTION_TYPES.RESERVED_SUBSCRIPTION) {
        if (!reservedEventId) {
          throw new ValidationError('יש לבחור שיעור קבוע', 'reservedEventId');
        }
        await reservedRegularService.releaseExpiredSeatsForUser(userId);
        await reservedRegularService.assertNoHoldingReservation(userId);
        const event = await reservedRegularService.assertClassAvailable(reservedEventId);
        sessionEventId = event.id;
      } else if (reservedEventId) {
        throw new ValidationError('reservedEventId is only valid for a reserved subscription', 'reservedEventId');
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
          reservedEventId: sessionEventId,
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
export const transactionAccessEndsDateResolver = (transaction) =>
  accessEndsDateFromTransaction(transaction);
