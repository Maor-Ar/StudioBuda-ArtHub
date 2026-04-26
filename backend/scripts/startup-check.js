#!/usr/bin/env node
/**
 * Startup check - logs env status before main app loads.
 * Helps debug Cloud Run deployment failures.
 */
import 'dotenv/config';
import { buildGmailConfig, loadGmailOAuthClientJson } from '../src/config/gmailFromEnv.js';

const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());

console.log('[STARTUP] PORT=', process.env.PORT || '(not set)');
console.log('[STARTUP] NODE_ENV=', process.env.NODE_ENV || '(not set)');
console.log('[STARTUP] FIREBASE_PROJECT_ID=', process.env.FIREBASE_PROJECT_ID ? 'set' : 'MISSING');
console.log('[STARTUP] FIREBASE_CLIENT_EMAIL=', process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'MISSING');
console.log('[STARTUP] FIREBASE_PRIVATE_KEY=', process.env.FIREBASE_PRIVATE_KEY ? 'set (length=' + String(process.env.FIREBASE_PRIVATE_KEY).length + ')' : 'MISSING');

const gmailJson = loadGmailOAuthClientJson();
if (process.env.GMAIL_OAUTH_CLIENT_JSON && String(process.env.GMAIL_OAUTH_CLIENT_JSON).trim() && !gmailJson) {
  console.error('[STARTUP] GMAIL_OAUTH_CLIENT_JSON: set but JSON.parse failed (check newlines/escaping in Secret Manager).');
} else {
  console.log(
    '[STARTUP] GMAIL_OAUTH_CLIENT_JSON=',
    process.env.GMAIL_OAUTH_CLIENT_JSON ? 'set (parsed=' + (gmailJson ? 'ok' : 'fail') + ')' : 'missing'
  );
}
console.log('[STARTUP] GMAIL_REFRESH_TOKEN=', process.env.GMAIL_REFRESH_TOKEN ? 'set' : 'MISSING');
console.log(
  '[STARTUP] sender email (GMAIL_SENDER_EMAIL or EMAIL_FROM_ADDRESS)=',
  (process.env.GMAIL_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS) ? 'set' : 'MISSING'
);

const gmail = buildGmailConfig(gmailJson);
console.log('[STARTUP] Gmail/reset ready (gmail.isReady):', gmail.isReady);
if (!gmail.isReady) {
  console.log(
    '[STARTUP] Gmail flags (no values):',
    'clientId=' + !!gmail.clientId,
    'clientSecret=' + !!gmail.clientSecret,
    'refreshToken=' + !!gmail.refreshToken,
    'senderEmail=' + !!gmail.senderEmail,
    'serviceAccountJson=' + !!gmail.serviceAccountJson
  );
}

if (missing.length > 0 && process.env.PORT) {
  console.error('[STARTUP] WARNING: Missing required env vars:', missing.join(', '));
  console.error('[STARTUP] Server will start but Firebase features may not work.');
  console.error('[STARTUP] Configure in Cloud Run Console: Edit service -> Variables & Secrets');
  console.error('[STARTUP] Or check Secret Manager: https://console.cloud.google.com/security/secret-manager');
}

console.log('[STARTUP] Env check completed, starting server...');
