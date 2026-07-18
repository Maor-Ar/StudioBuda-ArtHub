/**
 * Stamps the PWA service worker cache name with a unique build id.
 * Run after `expo export` so dist/sw.js is updated for deploy.
 *
 * Important: public/sw.js in git stays as a placeholder (`studiobuda-pwa-vdev`).
 * Only the built artifact under dist/ is stamped — that is what GitHub Pages serves.
 *
 * Also writes dist/build-id.txt so the running app can detect a newer deploy even
 * when Fastly caches /sw.js for max-age=600 (query-string fetch bypasses that).
 *
 * Build id sources (first match wins):
 *   PWA_BUILD_ID, EXPO_PUBLIC_BUILD_ID, GITHUB_SHA, or current timestamp
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const distSw = path.join(distDir, 'sw.js');
const buildIdPath = path.join(distDir, 'build-id.txt');

// Never rewrite public/sw.js — that would look like a one-time version bump in git.
if (!fs.existsSync(distSw)) {
  console.error(
    `[stamp-sw-version] dist/sw.js not found. Run expo export first (refusing to stamp public/sw.js).`
  );
  process.exit(1);
}

const rawId =
  process.env.PWA_BUILD_ID ||
  process.env.EXPO_PUBLIC_BUILD_ID ||
  process.env.GITHUB_SHA ||
  new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const buildId = String(rawId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || Date.now().toString(36);
const cacheName = `studiobuda-pwa-v${buildId}`;

const original = fs.readFileSync(distSw, 'utf8');
let updated = original.replace(
  /const CACHE_NAME = ['"][^'"]+['"]/,
  `const CACHE_NAME = '${cacheName}'`
);

if (updated === original) {
  console.error('[stamp-sw-version] Could not find CACHE_NAME assignment in dist/sw.js');
  process.exit(1);
}

// Ensure the deployed SW bytes always change even if CACHE_NAME somehow matched.
const buildMarker = `// build-id: ${buildId}`;
if (updated.includes('// build-id:')) {
  updated = updated.replace(/\/\/ build-id: .*/, buildMarker);
} else {
  updated = `${buildMarker}\n${updated}`;
}

fs.writeFileSync(distSw, updated, 'utf8');
fs.writeFileSync(buildIdPath, `${buildId}\n`, 'utf8');

console.log(`[stamp-sw-version] dist/sw.js → ${cacheName}`);
console.log(`[stamp-sw-version] dist/build-id.txt → ${buildId}`);
