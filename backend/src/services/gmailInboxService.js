import { google } from 'googleapis';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Read-only Gmail access for payment email sync (Grow).
 * Requires a refresh token / DWD subject with gmail.readonly (or gmail.modify).
 * Outbound password-reset email can keep using gmail.send separately.
 */
class GmailInboxService {
  constructor() {
    this.client = null;
    this.authReady = null;
  }

  getReadScopes() {
    const raw = (process.env.GMAIL_READ_SCOPES || '').trim();
    if (raw) {
      return raw.split(/[,\s]+/).filter(Boolean);
    }
    return ['https://www.googleapis.com/auth/gmail.readonly'];
  }

  async getClient() {
    const {
      clientId,
      clientSecret,
      refreshToken,
      serviceAccountJson,
      delegatedUser,
      senderEmail,
    } = config.email.gmail || {};

    if (this.client && this.authReady) {
      await this.authReady;
      return this.client;
    }

    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        const privateKey = parsed.private_key?.replace(/\\n/g, '\n');
        const subject = delegatedUser || senderEmail;
        const jwtClient = new google.auth.JWT(
          parsed.client_email,
          null,
          privateKey,
          this.getReadScopes(),
          subject
        );
        this.authReady = jwtClient.authorize().then(() => undefined);
        await this.authReady;
        this.client = google.gmail({ version: 'v1', auth: jwtClient });
        return this.client;
      } catch (error) {
        logger.error('Gmail inbox JWT auth failed', { message: error?.message });
      }
    }

    if (clientId && clientSecret && refreshToken) {
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      this.authReady = oauth2.getAccessToken().then(() => undefined);
      await this.authReady;
      this.client = google.gmail({ version: 'v1', auth: oauth2 });
      return this.client;
    }

    return null;
  }

  isReady() {
    return Boolean(config.email?.gmail?.isReady);
  }

  decodeBodyData(data) {
    if (!data) return '';
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf8');
  }

  collectBodies(payload, acc = { text: '', html: '' }) {
    if (!payload) return acc;
    const mime = payload.mimeType || '';
    const data = payload.body?.data;
    if (data) {
      const decoded = this.decodeBodyData(data);
      if (mime === 'text/plain') acc.text += decoded;
      else if (mime === 'text/html') acc.html += decoded;
      else if (!acc.text) acc.text += decoded;
    }
    (payload.parts || []).forEach((part) => this.collectBodies(part, acc));
    return acc;
  }

  headerValue(headers, name) {
    const found = (headers || []).find(
      (h) => String(h.name || '').toLowerCase() === name.toLowerCase()
    );
    return found?.value || '';
  }

  stripHtml(html) {
    return String(html || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async searchMessages({ query, maxResults = 40 } = {}) {
    const gmail = await this.getClient();
    if (!gmail) {
      throw new Error('Gmail inbox is not configured (need OAuth/DWD with gmail.readonly)');
    }

    const list = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const ids = (list.data.messages || []).map((m) => m.id).filter(Boolean);
    const messages = [];

    for (const id of ids) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      });
      const payload = full.data.payload || {};
      const headers = payload.headers || [];
      const bodies = this.collectBodies(payload);
      const text = bodies.text || this.stripHtml(bodies.html);
      messages.push({
        id,
        threadId: full.data.threadId || null,
        snippet: full.data.snippet || '',
        internalDate: full.data.internalDate
          ? new Date(Number(full.data.internalDate))
          : null,
        subject: this.headerValue(headers, 'Subject'),
        from: this.headerValue(headers, 'From'),
        to: this.headerValue(headers, 'To'),
        text,
      });
    }

    return messages;
  }
}

export default new GmailInboxService();
