/**
 * Recurring Payments Processing Script
 * 
 * This script should be run daily via cron job to process recurring subscription payments.
 * It finds all active subscriptions where the last payment was more than 30 days ago
 * and charges them using their stored payment token.
 * 
 * Usage:
 *   node scripts/processRecurringPayments.js
 * 
 * Environment variables:
 *   DRY_RUN=true - Run without actually charging (for testing)
 *   FORCE=true - Process all active subscriptions regardless of date
 * 
 * Cron example (run daily at 6 AM):
 *   0 6 * * * cd /path/to/backend && node scripts/processRecurringPayments.js >> /var/log/recurring-payments.log 2>&1
 */

import { db } from '../src/config/firebase.js';
import paymentService from '../src/services/paymentService.js';
import transactionService from '../src/services/transactionService.js';
import { TRANSACTION_TYPES } from '../src/config/constants.js';
import logger from '../src/utils/logger.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const FORCE = process.env.FORCE === 'true';
const DAYS_BETWEEN_PAYMENTS = 30;

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date2 - date1) / oneDay));
}

/**
 * Get the last payment date from a transaction
 */
function getLastPaymentDate(transaction) {
  if (transaction.lastPaymentDate?.toDate) {
    return transaction.lastPaymentDate.toDate();
  } else if (transaction.lastPaymentDate) {
    return new Date(transaction.lastPaymentDate);
  } else if (transaction.purchaseDate?.toDate) {
    return transaction.purchaseDate.toDate();
  } else if (transaction.purchaseDate) {
    return new Date(transaction.purchaseDate);
  }
  return null;
}

/**
 * Process recurring payments for all due subscriptions
 */
async function processRecurringPayments() {
  const startTime = Date.now();
  const results = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    noToken: 0,
    errors: [],
  };

  logger.info('Starting recurring payments processing', {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    force: FORCE,
  });

  console.log('\n=== Recurring Payments Processing ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no charges)' : 'LIVE'}`);
  console.log(`Force: ${FORCE ? 'Yes (processing all)' : 'No'}`);
  console.log('');

  try {
    // Find all active subscriptions
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

    const now = new Date();

    for (const doc of snapshot.docs) {
      const transaction = { id: doc.id, ...doc.data() };
      const lastPaymentDate = getLastPaymentDate(transaction);
      const daysSincePayment = lastPaymentDate ? daysBetween(lastPaymentDate, now) : 999;

      console.log(`\nProcessing: ${transaction.id}`);
      console.log(`  User: ${transaction.userId}`);
      console.log(`  Amount: ₪${transaction.amount}`);
      console.log(`  Last Payment: ${lastPaymentDate?.toISOString() || 'Unknown'}`);
      console.log(`  Days Since Payment: ${daysSincePayment}`);
      console.log(`  Has Token: ${transaction.paymentToken ? 'Yes' : 'No'}`);

      // Check if payment is due
      if (!FORCE && daysSincePayment < DAYS_BETWEEN_PAYMENTS) {
        console.log(`  Status: SKIPPED (not due yet, ${DAYS_BETWEEN_PAYMENTS - daysSincePayment} days remaining)`);
        results.skipped++;
        continue;
      }

      // Check if we have a payment token
      if (!transaction.paymentToken) {
        console.log(`  Status: SKIPPED (no payment token stored)`);
        logger.warn('Subscription has no payment token', {
          transactionId: transaction.id,
          userId: transaction.userId,
        });
        results.noToken++;
        continue;
      }

      results.processed++;
      logger.info('Processing subscription payment', {
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        daysSincePayment,
      });

      if (DRY_RUN) {
        console.log(`  Status: WOULD CHARGE (dry run)`);
        results.successful++;
        continue;
      }

      // Attempt to charge the token
      try {
        const chargeResult = await paymentService.chargeToken(
          transaction.paymentToken,
          transaction.amount,
          transaction.id
        );

        // Update transaction with new payment date
        await transactionService.updateTransaction(transaction.id, {
          lastPaymentDate: now,
          entriesUsedThisMonth: 0,
          zcreditReferenceNumber: chargeResult.referenceNumber,
        });

        logger.info('Subscription payment successful', {
          transactionId: transaction.id,
          userId: transaction.userId,
          referenceNumber: chargeResult.referenceNumber,
          newLastPaymentDate: now.toISOString(),
        });

        console.log(`  Status: SUCCESS`);
        console.log(`  Reference: ${chargeResult.referenceNumber}`);
        results.successful++;

      } catch (error) {
        logger.error('Subscription payment failed', {
          transactionId: transaction.id,
          userId: transaction.userId,
          error: error.message,
          errorCode: error.code,
        });

        console.log(`  Status: FAILED`);
        console.log(`  Error: ${error.message}`);

        // Deactivate the subscription after payment failure
        try {
          await transactionService.updateTransaction(transaction.id, { 
            isActive: false,
          });
          console.log(`  Action: Subscription deactivated`);
          logger.warn('Subscription deactivated due to payment failure', {
            transactionId: transaction.id,
            userId: transaction.userId,
          });
        } catch (updateError) {
          logger.error('Failed to deactivate subscription after payment failure', {
            transactionId: transaction.id,
            error: updateError.message,
          });
        }

        results.failed++;
        results.errors.push({
          transactionId: transaction.id,
          userId: transaction.userId,
          error: error.message,
        });

        // TODO: Send email notification to user about failed payment
      }
    }

  } catch (error) {
    logger.error('Fatal error in recurring payments processing', {
      error: error.message,
      stack: error.stack,
    });
    console.error('\nFATAL ERROR:', error.message);
    throw error;
  }

  const duration = Date.now() - startTime;

  logger.info('Recurring payments processing completed', {
    total: results.total,
    processed: results.processed,
    successful: results.successful,
    failed: results.failed,
    skipped: results.skipped,
    noToken: results.noToken,
    duration: `${duration}ms`,
  });

  console.log('\n=== Summary ===');
  console.log(`Total Active Subscriptions: ${results.total}`);
  console.log(`Processed: ${results.processed}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped (not due): ${results.skipped}`);
  console.log(`Skipped (no token): ${results.noToken}`);
  console.log(`Duration: ${duration}ms`);
  console.log('');

  if (results.errors.length > 0) {
    console.log('=== Errors ===');
    results.errors.forEach(err => {
      console.log(`  Transaction ${err.transactionId}: ${err.error}`);
    });
    console.log('');
  }

  return results;
}

// Run the script
(async () => {
  try {
    await processRecurringPayments();
    console.log('Script completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
})();
