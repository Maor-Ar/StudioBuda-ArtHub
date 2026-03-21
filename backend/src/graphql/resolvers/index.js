import { authResolvers } from './auth.js';
import { userResolvers } from './user.js';
import { eventResolvers } from './event.js';
import { transactionResolvers } from './transaction.js';
import { registrationResolvers } from './registration.js';
import { paymentResolvers } from './payment.js';
import { productResolvers } from './product.js';
import { adminResolvers } from './admin.js';
import userService from '../../services/userService.js';

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...eventResolvers.Query,
    ...transactionResolvers.Query,
    ...registrationResolvers.Query,
    ...paymentResolvers.Query,
    users: async (_, __, context) => {
      const { requireManager } = await import('../middleware/permissions.js');
      await requireManager(context);
      const { db } = await import('../../config/firebase.js');
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    ...productResolvers.Query,
  },

  Mutation: {
    ...authResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...transactionResolvers.Mutation,
    ...registrationResolvers.Mutation,
    ...paymentResolvers.Mutation,
    ...productResolvers.Mutation,
    ...adminResolvers.Mutation,
  },

  User: {
    createdAt: (user) => {
      if (user.createdAt?.toDate) {
        return user.createdAt.toDate().toISOString();
      }
      return new Date(user.createdAt).toISOString();
    },
    updatedAt: (user) => {
      if (user.updatedAt?.toDate) {
        return user.updatedAt.toDate().toISOString();
      }
      if (user.updatedAt) {
        return new Date(user.updatedAt).toISOString();
      }
      if (user.createdAt?.toDate) {
        return user.createdAt.toDate().toISOString();
      }
      return new Date(user.createdAt || Date.now()).toISOString();
    },
  },

  Event: {
    ...eventResolvers.Event,
  },

  Transaction: {
    ...transactionResolvers.Transaction,
  },

  EventRegistration: {
    ...registrationResolvers.EventRegistration,
  },

  Product: {
    ...productResolvers.Product,
  },
};

