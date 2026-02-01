import transactionService from '../../services/transactionService.js';
import { requireManager, requireAuthenticated } from '../middleware/permissions.js';
import { AuthorizationError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

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

      logger.info('Canceling subscription', {
        transactionId: id,
        userId: user.id,
        isOwner,
        isManager,
      });

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
    accessEndsDate: (transaction) => {
      // Only applicable to subscriptions
      if (transaction.transactionType !== 'subscription') {
        return null;
      }

      // Get the last payment date
      let lastPaymentDate;
      if (transaction.lastPaymentDate?.toDate) {
        lastPaymentDate = transaction.lastPaymentDate.toDate();
      } else if (transaction.lastPaymentDate) {
        lastPaymentDate = new Date(transaction.lastPaymentDate);
      } else {
        // Fallback to purchase date
        lastPaymentDate = transaction.purchaseDate?.toDate
          ? transaction.purchaseDate.toDate()
          : new Date(transaction.purchaseDate);
      }

      if (!lastPaymentDate || isNaN(lastPaymentDate.getTime())) {
        return null;
      }

      // Add 30 days to last payment date
      const accessEndsDate = new Date(lastPaymentDate);
      accessEndsDate.setDate(accessEndsDate.getDate() + 30);

      return accessEndsDate.toISOString();
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

