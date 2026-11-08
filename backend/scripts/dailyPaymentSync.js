/**
 * Daily Hyp + Grow payment sync
 *
 * Hyp:
 *   Monthly charges continue via Hyp HK webhooks (/api/payment/webhook).
 *   This job only resets monthly entries if a billing month rolled without a webhook.
 *
 * Grow (no public API):
 *   Reads payment receipts from the configured Gmail inbox and renews matching
 *   non-Hyp subscriptions. Overdue Grow subs without a receipt are deactivated
 *   after GROW_PAYMENT_GRACE_DAYS (default 5).
 *
 * Usage:
 *   node scripts/dailyPaymentSync.js
 *   DRY_RUN=true node scripts/dailyPaymentSync.js
 *
 * Cron / Cloud Scheduler (daily ~06:00 Israel):
 *   0 6 * * * cd /path/to/backend && node scripts/dailyPaymentSync.js >> /var/log/daily-payment-sync.log 2>&1
 *   Or POST /api/jobs/daily-payment-sync with header Authorization: Bearer $CRON_SECRET
 *
 * Gmail setup (Grow):
 *   Re-run `npm run gmail:refresh-token` after enabling gmail.readonly on the OAuth client,
 *   using the mailbox that receives Grow payment emails.
 *   Optional: GROW_GMAIL_QUERY, GROW_PAYMENT_GRACE_DAYS
 */

import dailyPaymentSyncService from '../src/services/dailyPaymentSyncService.js';

const DRY_RUN =
  process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

async function main() {
  console.log('\n=== Daily payment sync (Hyp + Grow email) ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const summary = await dailyPaymentSyncService.run({ dryRun: DRY_RUN });

  console.log('\n--- Hyp entry reset ---');
  console.log(JSON.stringify(summary.hyp, null, 2));
  console.log('\n--- Grow email sync ---');
  console.log(JSON.stringify(summary.grow, null, 2));
  console.log('\nDone.\n');

  const hasErrors =
    (summary.hyp?.errors?.length || 0) > 0 || (summary.grow?.errors?.length || 0) > 0;
  process.exit(hasErrors ? 1 : 0);
}

main().catch((error) => {
  console.error('FATAL:', error);
  process.exit(1);
});
