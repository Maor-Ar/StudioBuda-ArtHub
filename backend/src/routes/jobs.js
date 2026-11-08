import express from 'express';
import dailyPaymentSyncService from '../services/dailyPaymentSyncService.js';
import logger from '../utils/logger.js';

const router = express.Router();

function requireCronSecret(req, res, next) {
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: 'CRON_SECRET is not configured on the server',
    });
  }

  const header = req.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : (req.get('x-cron-secret') || '').trim();

  if (!token || token !== expected) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return next();
}

/**
 * Cloud Scheduler / cron trigger:
 *   POST /api/jobs/daily-payment-sync
 *   Authorization: Bearer <CRON_SECRET>
 *   Optional body: { "dryRun": true }
 */
router.post('/daily-payment-sync', requireCronSecret, async (req, res) => {
  const dryRun = Boolean(req.body?.dryRun) || req.query.dryRun === 'true';
  try {
    const summary = await dailyPaymentSyncService.run({ dryRun });
    return res.json({ ok: true, summary });
  } catch (error) {
    logger.error('Daily payment sync job failed', { message: error.message });
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
