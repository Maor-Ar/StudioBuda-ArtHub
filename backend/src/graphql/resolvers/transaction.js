import transactionService from '../../services/transactionService.js';
import { requireManager, requireAuthenticated } from '../middleware/permissions.js';

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
      const manager = await requireManager(context);
      return await transactionService.cancelSubscription(id, manager.id);
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

