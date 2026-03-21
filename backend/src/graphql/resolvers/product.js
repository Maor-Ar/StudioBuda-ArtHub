import productService from '../../services/productService.js';
import { requireAuthenticated, requireManager } from '../middleware/permissions.js';

function toIso(v) {
  if (!v) return new Date(0).toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return new Date(v).toISOString();
}

export const productResolvers = {
  Query: {
    products: async (_, __, context) => {
      await requireAuthenticated(context);
      return productService.listActiveForPurchase();
    },

    allProducts: async (_, __, context) => {
      await requireManager(context);
      return productService.listAll();
    },
  },

  Mutation: {
    createProduct: async (_, { input }, context) => {
      await requireManager(context);
      const created = await productService.create(input.id, input);
      return created;
    },

    updateProduct: async (_, { id, input }, context) => {
      await requireManager(context);
      return productService.update(id, input);
    },

    deleteProduct: async (_, { id }, context) => {
      await requireManager(context);
      return productService.softDelete(id);
    },
  },

  Product: {
    createdAt: (p) => toIso(p.createdAt),
    updatedAt: (p) => toIso(p.updatedAt),
  },
};
