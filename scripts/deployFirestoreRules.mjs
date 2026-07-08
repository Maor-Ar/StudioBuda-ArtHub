/**
 * Deploy firestore.rules using the backend service-account env vars.
 * Usage (from StudioBuda-ArtHub/StudioBuda-ArtHub):
 *   node scripts/deployFirestoreRules.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(path.join(root, 'backend', 'package.json'));
const { GoogleAuth } = require('google-auth-library');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(root, 'backend', '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

const rulesPath = path.join(root, 'firestore.rules');
const source = fs.readFileSync(rulesPath, 'utf8');

async function main() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  console.log('Creating ruleset for', projectId);
  const createRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token || token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: source }],
        },
      }),
    }
  );

  const createBody = await createRes.json();
  if (!createRes.ok) {
    console.error('Failed creating ruleset:', createRes.status, JSON.stringify(createBody, null, 2));
    process.exit(1);
  }

  const rulesetName = createBody.name;
  console.log('Created ruleset:', rulesetName);

  const releaseName = `projects/${projectId}/releases/cloud.firestore`;
  const authHeader = {
    Authorization: `Bearer ${token.token || token}`,
    'Content-Type': 'application/json',
  };

  console.log('Checking existing release...');
  const getRelease = await fetch(
    `https://firebaserules.googleapis.com/v1/${releaseName}`,
    { headers: authHeader }
  );

  if (getRelease.status === 404) {
    console.log('Creating release cloud.firestore...');
    const createRelease = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
      {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          name: releaseName,
          rulesetName,
        }),
      }
    );
    const releaseBody = await createRelease.json();
    if (!createRelease.ok) {
      console.error('Failed creating release:', createRelease.status, JSON.stringify(releaseBody, null, 2));
      process.exit(1);
    }
    console.log('Created release:', releaseBody.name || 'ok');
  } else {
    console.log('Updating existing release...');
    const releaseRes = await fetch(
      `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
      {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({
          release: {
            name: releaseName,
            rulesetName,
          },
        }),
      }
    );
    const releaseBody = await releaseRes.json();
    if (!releaseRes.ok) {
      console.error('Failed updating release:', releaseRes.status, JSON.stringify(releaseBody, null, 2));
      process.exit(1);
    }
    console.log('Updated release:', releaseBody.name || 'ok');
  }

  console.log('✅ Firestore rules deployed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
