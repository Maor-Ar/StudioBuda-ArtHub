/**
 * Stamps the PWA service worker cache name with a unique build id.
 * Run after `expo export` so dist/sw.js is updated for deploy.
 *
 * Build id sources (first match wins):
 *   PWA_BUILD_ID, GITHUB_SHA, or current timestamp
 */
const fs = require('fs');
const path = require('path');

const distSw = path.join(__dirname, '..', 'dist', 'sw.js');
const publicSw = path.join(__dirname, '..', 'public', 'sw.js');
const swPath = fs.existsSync(distSw) ? distSw : publicSw;

if (!fs.existsSync(swPath)) {
  console.error(`[stamp-sw-version] sw.js not found at ${swPath}`);
  process.exit(1);
}

const rawId =
  process.env.PWA_BUILD_ID ||
  process.env.GITHUB_SHA ||
  new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const buildId = String(rawId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || Date.now().toString(36);
const cacheName = `studiobuda-pwa-v${buildId}`;

const original = fs.readFileSync(swPath, 'utf8');
const updated = original.replace(
  /const CACHE_NAME = ['"][^'"]+['"]/,
  `const CACHE_NAME = '${cacheName}'`
);

if (updated === original) {
  console.error('[stamp-sw-version] Could not find CACHE_NAME assignment in sw.js');
  process.exit(1);
}

fs.writeFileSync(swPath, updated, 'utf8');
console.log(`[stamp-sw-version] ${path.relative(process.cwd(), swPath)} → ${cacheName}`);
