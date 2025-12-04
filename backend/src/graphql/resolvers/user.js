import { requireAuth } from '../middleware/auth.js';

export const userResolvers = {
  Query: {
    me: async (_, __, context) => {
      const user = requireAuth(context);
      return user;
    },
  },
};

