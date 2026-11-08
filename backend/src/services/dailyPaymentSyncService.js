import { db } from '../config/firebase.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { isPreviousMonth, updateToCurrentMonth } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import transactionService from './transactionService.js';
import growEmailSyncService from './growEmailSyncService.js';
import reservedRegularService from './reservedRegularService.js';

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Daily reconciliation:
 * - Hyp: entry-reset fallback for active HK subscriptions (charges still via Hyp webhook)
 * - Grow: parse payment emails from Gmail and renew/deactivate non-Hyp subscriptions
 */
class DailyPaymentSyncService {
  async syncHypEntryResets({ dryRun = false } = {}) {
    const results = {
      total: 0,
      reset: 0,
      skipped: 0,
      noHk: 0,
      errors: [],
    };

    const snapshot = await db
      .collection('transactions')
      .where('transactionType', '==', TRANSACTION_TYPES.SUBSCRIPTION)
      .where('isActive', '==', true)
      .get();

    results.total = snapshot.size;

    for (const doc of snapshot.docs) {
      const transaction = { id: doc.id, ...doc.data() };
      const lastRenewal =
        toDate(transaction.lastRenewalDate) || toDate(transaction.lastPaymentDate);

      if (!transaction.hypHkId) {
        results.noHk++;
        continue;
      }

      if (!lastRenewal || !isPreviousMonth(lastRenewal)) {
        results.skipped++;
        continue;
      }

      if (dryRun) {
        results.reset++;
        continue;
      }

      try {
        const purchaseDate = toDate(transaction.purchaseDate) || new Date();
        await transactionService.updateTransaction(transaction.id, {
          lastRenewalDate: updateToCurrentMonth(purchaseDate),
          entriesUsedThisMonth: 0,
        });
        results.reset++;
      } catch (error) {
        results.errors.push({ transactionId: transaction.id, error: error.message });
      }
    }

    return results;
  }

  async run({ dryRun = false } = {}) {
    const startedAt = new Date();
    logger.info('Daily payment sync started', { dryRun });

    const hyp = await this.syncHypEntryResets({ dryRun });
    const grow = await growEmailSyncService.syncFromInbox({ dryRun });
    const reservedSeats = await reservedRegularService.releaseDueReservations({ dryRun });

    const summary = {
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      dryRun,
      hyp,
      grow,
      reservedSeats,
    };

    logger.info('Daily payment sync finished', summary);
    return summary;
  }
}

export default new DailyPaymentSyncService();
