import adminDashboardService from '../../services/adminDashboardService.js';
import { requireManager } from '../middleware/permissions.js';

export const adminDashboardResolvers = {
  Query: {
    adminDashboardMetrics: async (_, __, context) => {
      await requireManager(context);
      return adminDashboardService.getDashboardMetrics();
    },
  },
};
