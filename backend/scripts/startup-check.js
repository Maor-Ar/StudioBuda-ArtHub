#!/usr/bin/env node
/**
 * Startup check - logs env status before main app loads.
 * Helps debug Cloud Run deployment failures.
 */
const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());

console.log('[STARTUP] PORT=', process.env.PORT || '(not set)');
console.log('[STARTUP] NODE_ENV=', process.env.NODE_ENV || '(not set)');
console.log('[STARTUP] FIREBASE_PROJECT_ID=', process.env.FIREBASE_PROJECT_ID ? 'set' : 'MISSING');
console.log('[STARTUP] FIREBASE_CLIENT_EMAIL=', process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'MISSING');
console.log('[STARTUP] FIREBASE_PRIVATE_KEY=', process.env.FIREBASE_PRIVATE_KEY ? 'set (length=' + String(process.env.FIREBASE_PRIVATE_KEY).length + ')' : 'MISSING');

// In Cloud Run, PORT is always set. Warn if Firebase vars missing but don't exit
// (Secrets might be mounted differently, or server should handle gracefully)
if (missing.length > 0 && process.env.PORT) {
  console.error('[STARTUP] WARNING: Missing required env vars:', missing.join(', '));
  console.error('[STARTUP] Server will start but Firebase features may not work.');
  console.error('[STARTUP] Configure in Cloud Run Console: Edit service -> Variables & Secrets');
  console.error('[STARTUP] Or check Secret Manager: https://console.cloud.google.com/security/secret-manager');
  // Don't exit - let server start and handle errors gracefully
  // This allows Cloud Run to see the port listening even if secrets are misconfigured
}

console.log('[STARTUP] Env check completed, starting server...');
