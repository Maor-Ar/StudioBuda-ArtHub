/**
 * Subscription entry-reset fallback
 *
 * Hyp Pay charges monthly subscriptions via Hyp-managed HK (Horaat Keva).
 * Recurring charges should reset studio entries through POST /api/payment/webhook.
 * This script is a fallback if webhooks are delayed: it resets monthly entries
 * when lastRenewalDate is in a previous calendar month. It does not charge cards.
 *
 * Usage:
 *   node scripts/processRecurringPayments.js
 *
 * Environment variables:
 *   DRY_RUN=true - Log what would be updated without writing
 *
 * Cron example (run daily at 6 AM):
 *   0 6 * * * cd /path/to/backend && node scripts/processRecurringPayments.js >> /var/log/recurring-payments.log 2>&1
 */

import { db } from '../src/config/firebase.js';
import transactionService from '../src/services/transactionService.js';
import { TRANSACTION_TYPES } from '../src/config/constants.js';
import { isPreviousMonth, updateToCurrentMonth } from '../src/utils/helpers.js';
import logger from '../src/utils/logger.js';

const DRY_RUN = process.env.DRY_RUN === 'true';

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  return new Date(value);
}

async function resetMonthlyEntries() {
  const startTime = Date.now();
  const results = {
    total: 0,
    reset: 0,
    skipped: 0,
    noHk: 0,
    errors: [],
  };

  console.log('\n=== Hyp subscription entry reset (fallback) ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('');

  try {
    const snapshot = await db.collection('transactions')
      .where('transactionType', '==', TRANSACTION_TYPES.SUBSCRIPTION)
      .where('isActive', '==', true)
      .get();

    results.total = snapshot.docs.length;
    logger.info('Found active subscriptions', { count: results.total });
    console.log(`Found ${results.total} active subscriptions\n`);

    if (results.total === 0) {
      console.log('No active subscriptions to process.');
      return results;
    }

    for (const doc of snapshot.docs) {
      const transaction = { id: doc.id, ...doc.data() };
      const lastRenewal = toDate(transaction.lastRenewalDate) || toDate(transaction.lastPaymentDate);

      console.log(`\nProcessing: ${transaction.id}`);
      console.log(`  User: ${transaction.userId}`);
      console.log(`  HKId: ${transaction.hypHkId || 'none'}`);
      console.log(`  Last renewal: ${lastRenewal?.toISOString() || 'Unknown'}`);

      if (!transaction.hypHkId) {
        console.log('  Status: SKIPPED (no Hyp HK agreement — not a Hyp subscription)');
        results.noHk++;
        continue;
      }

      if (!lastRenewal || !isPreviousMonth(lastRenewal)) {
        console.log('  Status: SKIPPED (still in current billing month)');
        results.skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log('  Status: WOULD RESET entries (dry run)');
        results.reset++;
        continue;
      }

      try {
        const purchaseDate = toDate(transaction.purchaseDate) || new Date();
        await transactionService.updateTransaction(transaction.id, {
          lastRenewalDate: updateToCurrentMonth(purchaseDate),
          entriesUsedThisMonth: 0,
        });
        console.log('  Status: RESET');
        results.reset++;
      } catch (error) {
        logger.error('Failed to reset subscription entries', {
          transactionId: transaction.id,
          error: error.message,
        });
        console.log(`  Status: FAILED (${error.message})`);
        results.errors.push({
          transactionId: transaction.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    logger.error('Fatal error in subscription entry reset', {
      error: error.message,
      stack: error.stack,
    });
    console.error('\nFATAL ERROR:', error.message);
    throw error;
  }

  const duration = Date.now() - startTime;
  console.log('\n=== Summary ===');
  console.log(`Total Active Subscriptions: ${results.total}`);
  console.log(`Reset: ${results.reset}`);
  console.log(`Skipped (current month): ${results.skipped}`);
  console.log(`Skipped (no Hyp HK): ${results.noHk}`);
  console.log(`Duration: ${duration}ms`);
  console.log('');

  return results;
}

(async () => {
  try {
    await resetMonthlyEntries();
    console.log('Script completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
})();
