/**
 * CI check: dist/sw.js must be stamped with this build's id (not the vdev placeholder).
 */
const fs = require('fs');
const path = require('path');

const distSw = path.join(__dirname, '..', 'dist', 'sw.js');
const buildIdPath = path.join(__dirname, '..', 'dist', 'build-id.txt');

const rawId =
  process.env.PWA_BUILD_ID ||
  process.env.EXPO_PUBLIC_BUILD_ID ||
  process.env.GITHUB_SHA;

if (!rawId) {
  console.error('[verify-sw-version] PWA_BUILD_ID / GITHUB_SHA missing');
  process.exit(1);
}

const buildId = String(rawId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
const expectedCache = `studiobuda-pwa-v${buildId}`;

if (!fs.existsSync(distSw)) {
  console.error('[verify-sw-version] dist/sw.js missing');
  process.exit(1);
}

const sw = fs.readFileSync(distSw, 'utf8');
const cacheLine = (sw.match(/const CACHE_NAME = ['"][^'"]+['"]/) || [])[0] || '';

console.log(`[verify-sw-version] ${cacheLine}`);

if (!cacheLine.includes(expectedCache)) {
  console.error(`[verify-sw-version] expected ${expectedCache}`);
  process.exit(1);
}

if (cacheLine.includes('studiobuda-pwa-vdev')) {
  console.error('[verify-sw-version] still placeholder vdev');
  process.exit(1);
}

if (!fs.existsSync(buildIdPath) || fs.readFileSync(buildIdPath, 'utf8').trim() !== buildId) {
  console.error(`[verify-sw-version] dist/build-id.txt must be "${buildId}"`);
  process.exit(1);
}

console.log('[verify-sw-version] OK');
