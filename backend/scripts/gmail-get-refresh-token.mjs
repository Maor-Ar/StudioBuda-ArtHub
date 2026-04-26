/**
 * One-time helper: the JSON Google gives you for an OAuth *client* does not include
 * a refresh token. You must sign in once to obtain it, then set GMAIL_REFRESH_TOKEN
 * or add "refresh_token" to the same JSON (see GMAIL_OAUTH_CLIENT_FILE).
 *
 * Prerequisite in Google Cloud Console (same project as client_id):
 * - OAuth consent screen (External or Internal) with test users if in Testing
 * - Gmail API enabled
 * - OAuth client: add a redirect URI that matches this script (default below)
 *
 * Run from backend folder:  npm run gmail:refresh-token
 * Or:  node scripts/gmail-get-refresh-token.mjs path/to/client_secret.json
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { createServer } from 'http';
import { resolve as resolvePath, isAbsolute } from 'path';
import { google } from 'googleapis';
import { loadGmailOAuthClientJson } from '../src/config/gmailFromEnv.js';

const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

function loadClientJson() {
  const fromEnv = loadGmailOAuthClientJson();
  if (fromEnv) return fromEnv;
  const arg = process.argv[2];
  if (arg) {
    const p = isAbsolute(arg) ? arg : resolvePath(process.cwd(), arg);
    if (!existsSync(p)) {
      throw new Error(`File not found: ${p}`);
    }
    return JSON.parse(readFileSync(p, 'utf8'));
  }
  throw new Error(
    'No credentials: set GMAIL_OAUTH_CLIENT_JSON or GMAIL_OAUTH_CLIENT_FILE in .env, or pass a path to the Google client JSON file.'
  );
}

function getRedirectAndBlock(clientJson) {
  const custom = process.env.GMAIL_OAUTH_REDIRECT_URI;
  if (custom?.trim()) {
    return { redirectUri: custom.trim(), block: clientJson?.installed || clientJson?.web || clientJson };
  }
  const block = clientJson?.installed || clientJson?.web || clientJson;
  const fromJson = block?.redirect_uris?.[0];
  const redirectUri = fromJson || 'http://127.0.0.1:3000/oauth2callback';
  return { redirectUri, block: block || {} };
}

async function main() {
  const clientJson = loadClientJson();
  const { redirectUri, block } = getRedirectAndBlock(clientJson);
  const clientId = block.client_id;
  const clientSecret = block.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error('client_id and client_secret are missing in the Google client JSON (installed or web).');
  }

  const u = new URL(redirectUri);
  let port;
  if (u.port) {
    port = parseInt(u.port, 10);
  } else if (u.protocol === 'https:') {
    port = 443;
  } else if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
    port = 3000;
  } else {
    port = 80;
  }
  if (!process.env.GMAIL_OAUTH_REDIRECT_URI) {
    console.warn(
      'Add this exact Redirect URI in Google Cloud Console → APIs & Services → Credentials → your OAuth client:\n  ',
      redirectUri,
      '\n'
    );
  }
  const host = u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? u.hostname : '127.0.0.1';

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: [SCOPE],
    prompt: 'consent',
  });

  return new Promise((done, fail) => {
    const server = createServer(async (req, res) => {
      try {
        if (!req.url) return;
        if (req.url.startsWith('/favicon')) {
          res.writeHead(404);
          res.end();
          return;
        }
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        if (url.searchParams.get('error')) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(
            `<p>Authorization error: ${url.searchParams.get('error_description') || url.searchParams.get('error')}</p>`
          );
          server.close();
          return fail(new Error(url.searchParams.get('error')));
        }
        const code = url.searchParams.get('code');
        if (!code) {
          res.writeHead(400);
          res.end('No ?code= in callback. Use the full redirect URL from Google after signing in.');
          return;
        }
        const { tokens } = await oauth2.getToken(code);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<p style="font-family:sans-serif">הצלחה. אפשר לסגור את הדפדפן ולחזור לטרמינל.</p>');

        server.close(() => {
          if (!tokens.refresh_token) {
            console.error(
              'No refresh_token in response. Revoke app access in https://myaccount.google.com/permissions and run this script again (prompt=consent is set).'
            );
            return fail(new Error('No refresh_token'));
          }
          console.log('\nAdd one of the following to your .env and restart the backend:\n');
          console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
          console.log('Or merge into your GMAIL_OAUTH client JSON (same file) as a top-level key:');
          console.log(`  "refresh_token": "${tokens.refresh_token}"\n`);
          if (process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_SENDER_EMAIL) {
            // ok
          } else {
            console.log('Also set the mailbox you authorized (From address):');
            console.log('  GMAIL_SENDER_EMAIL=you@gmail.com\n');
            console.log('(or EMAIL_FROM_ADDRESS=...)\n');
          }
          done();
        });
      } catch (e) {
        try {
          res.writeHead(500);
          res.end(String(e?.message));
        } catch {
          /* response may be sent */
        }
        server.close();
        fail(e);
      }
    });

    server.listen(port, host, () => {
      console.log('Open this URL in a browser, sign in with the Gmail account that will *send* mail, and allow access:\n');
      console.log(authUrl, '\n');
      console.log(`Listening on http://${host}:${port} for the OAuth redirect.\n`);
    });

    server.on('error', fail);
  });
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
