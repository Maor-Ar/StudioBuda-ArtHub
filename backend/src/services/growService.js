import growEmailSyncService from './growEmailSyncService.js';
import logger from '../utils/logger.js';

/**
 * Grow has no usable public API for this project.
 * Verification is based on payment receipts synced from Gmail
 * (`growEmailSyncService` / daily payment sync job).
 */
class GrowService {
  async verifyPayment(invoiceId, userId) {
    try {
      return await growEmailSyncService.verifyPayment(invoiceId, userId);
    } catch (error) {
      logger.error('Grow verifyPayment failed', {
        invoiceId,
        userId,
        message: error.message,
      });
      return { verified: false, paymentDate: null };
    }
  }

  async initiatePayment() {
    throw new Error(
      'Grow checkout is not used in-app. Use Hyp for new purchases; Grow renewals sync from email.'
    );
  }
}

export default new GrowService();
