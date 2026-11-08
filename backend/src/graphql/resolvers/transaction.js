import transactionService from '../../services/transactionService.js';
import eventService from '../../services/eventService.js';
import { requireManager, requireAuthenticated } from '../middleware/permissions.js';
import { AuthorizationError, NotFoundError } from '../../utils/errors.js';
import { accessEndsDateFromTransaction } from '../../utils/reservedRegulars.js';

export const transactionResolvers = {
  Query: {
    myTransactions: async (_, __, context) => {
      const user = await requireAuthenticated(context);
      return await transactionService.getUserActiveTransactions(user.id, false);
    },

    transactions: async (_, __, context) => {
      await requireManager(context);
      // Get all transactions (manager/admin only)
      const { db } = await import('../../config/firebase.js');
      const snapshot = await db.collection('transactions').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
  },

  Mutation: {
    createTransaction: async (_, { input }, context) => {
      const user = await requireAuthenticated(context);
      return await transactionService.createTransaction({
        ...input,
        userId: user.id,
      });
    },

    updateTransaction: async (_, { id, input }, context) => {
      await requireManager(context);
      return await transactionService.updateTransaction(id, input);
    },

    renewSubscription: async (_, { id }, context) => {
      const manager = await requireManager(context);
      return await transactionService.renewSubscription(id, manager.id);
    },

    cancelSubscription: async (_, { id }, context) => {
      const user = await requireAuthenticated(context);
      
      // Get the transaction to check ownership
      const transaction = await transactionService.getTransactionById(id);
      
      // Allow if user owns the transaction OR if user is manager/admin
      const isOwner = transaction.userId === user.id;
      const isManager = user.role === 'manager' || user.role === 'admin';
      
      if (!isOwner && !isManager) {
        throw new AuthorizationError('אין לך הרשאה לבטל מנוי זה');
      }

      const updatedTransaction = await transactionService.cancelSubscription(id, user.id);
      
      return updatedTransaction;
    },
  },

  Transaction: {
    purchaseDate: (transaction) => {
      if (transaction.purchaseDate?.toDate) {
        return transaction.purchaseDate.toDate().toISOString();
      }
      return new Date(transaction.purchaseDate).toISOString();
    },
    lastRenewalDate: (transaction) => {
      if (!transaction.lastRenewalDate) return null;
      if (transaction.lastRenewalDate?.toDate) {
        return transaction.lastRenewalDate.toDate().toISOString();
      }
      return new Date(transaction.lastRenewalDate).toISOString();
    },
    lastPaymentDate: (transaction) => {
      if (!transaction.lastPaymentDate) return null;
      if (transaction.lastPaymentDate?.toDate) {
        return transaction.lastPaymentDate.toDate().toISOString();
      }
      return new Date(transaction.lastPaymentDate).toISOString();
    },
    paymentSource: (transaction) => transaction.paymentSource ?? null,
    adminNote: (transaction) => transaction.adminNote ?? null,
    hypTransactionId: (transaction) => transaction.hypTransactionId ?? null,
    hypHkId: (transaction) => transaction.hypHkId ?? null,
    hypOrderId: (transaction) => transaction.hypOrderId ?? null,
    reservedEventId: (transaction) => transaction.reservedEventId ?? null,
    reservationReleaseAt: (transaction) => {
      if (!transaction.reservationReleaseAt) return null;
      if (transaction.reservationReleaseAt?.toDate) {
        return transaction.reservationReleaseAt.toDate().toISOString();
      }
      return new Date(transaction.reservationReleaseAt).toISOString();
    },
    reservedEventTitle: async (transaction) => {
      if (!transaction.reservedEventId) return null;
      try {
        const event = await eventService.getEvent(transaction.reservedEventId);
        return event?.title || null;
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        return null;
      }
    },
    accessEndsDate: (transaction) => accessEndsDateFromTransaction(transaction),
    createdAt: (transaction) => {
      if (transaction.createdAt?.toDate) {
        return transaction.createdAt.toDate().toISOString();
      }
      return new Date(transaction.createdAt).toISOString();
    },
    updatedAt: (transaction) => {
      if (transaction.updatedAt?.toDate) {
        return transaction.updatedAt.toDate().toISOString();
      }
      return new Date(transaction.updatedAt).toISOString();
    },
  },
};

