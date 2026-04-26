import { readFileSync, existsSync } from 'fs';
import { resolve, isAbsolute } from 'path';

/**
 * Load OAuth "client" JSON from Google (Desktop / Web client download).
 * Supports GMAIL_OAUTH_CLIENT_JSON (single-line) or GMAIL_OAUTH_CLIENT_FILE.
 */
export function loadGmailOAuthClientJson() {
  const inline = process.env.GMAIL_OAUTH_CLIENT_JSON;
  if (inline && String(inline).trim()) {
    try {
      return JSON.parse(String(inline).trim());
    } catch (e) {
      console.warn('GMAIL_OAUTH_CLIENT_JSON: invalid JSON —', e.message);
      return null;
    }
  }

  const file = process.env.GMAIL_OAUTH_CLIENT_FILE;
  if (file) {
    const p = isAbsolute(file) ? file : resolve(process.cwd(), file);
    if (!existsSync(p)) {
      console.warn(`GMAIL_OAUTH_CLIENT_FILE not found: ${p}`);
      return null;
    }
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch (e) {
      console.warn('GMAIL_OAUTH_CLIENT_FILE: invalid JSON —', e.message);
      return null;
    }
  }

  return null;
}

/**
 * Extracts client_id, client_secret, and optional refresh_token from Google’s JSON
 * (or from an extended file where you paste refresh_token at the top level after running
 * the one-time `npm run gmail:refresh-token` helper).
 */
export function extractGmailFieldsFromClientJson(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
    };
  }

  const block = parsed.installed || parsed.web || parsed;

  return {
    clientId: (block.client_id || parsed.client_id || '').trim(),
    clientSecret: (block.client_secret || parsed.client_secret || '').trim(),
    refreshToken: (parsed.refresh_token || block.refresh_token || '').trim(),
  };
}

export function buildGmailConfig(optionalJson) {
  const parsed = optionalJson !== undefined ? optionalJson : loadGmailOAuthClientJson();
  const fromFile = extractGmailFieldsFromClientJson(parsed);

  const clientId = (process.env.GMAIL_CLIENT_ID || fromFile.clientId).trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || fromFile.clientSecret).trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || fromFile.refreshToken).trim();
  const senderEmail = (
    process.env.GMAIL_SENDER_EMAIL ||
    process.env.EMAIL_FROM_ADDRESS ||
    ''
  ).trim();
  const serviceAccountJson = process.env.GMAIL_SERVICE_ACCOUNT_JSON || '';
  const delegatedUser = process.env.GMAIL_DELEGATED_USER || '';

  const saReady = Boolean(
    serviceAccountJson && (delegatedUser || senderEmail)
  );
  const oauthUserReady = Boolean(
    clientId && clientSecret && refreshToken && senderEmail
  );
  const isReady = saReady || oauthUserReady;

  return {
    clientId,
    clientSecret,
    refreshToken,
    senderEmail,
    serviceAccountJson,
    delegatedUser,
    isReady,
  };
}
