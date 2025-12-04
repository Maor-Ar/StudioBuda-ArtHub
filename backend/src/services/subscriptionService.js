import transactionService from './transactionService.js';
import growService from './growService.js';
import { isPreviousMonth, updateToCurrentMonth } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class SubscriptionService {
  async checkAndRenewSubscriptions(userId) {
    const transactions = await transactionService.getUserActiveTransactions(userId, false);
    return await transactionService.checkAndRenewSubscriptions(transactions, userId);
  }

  async verifyGrowPayment(invoiceId, userId) {
    return await growService.verifyPayment(invoiceId, userId);
  }
}

export default new SubscriptionService();

