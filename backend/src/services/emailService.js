import config from '../config/environment.js';
import logger from '../utils/logger.js';
import { google } from 'googleapis';

/** Non-ASCII or long values in MIME headers must use RFC 2047 (Gmail raw API is strict). */
function encodeRfc2047Subject(text) {
  if (typeof text !== 'string' || !text) {
    return text;
  }
  if (!/[^\u0000-\u007f]/.test(text)) {
    return text;
  }
  const base64 = Buffer.from(text, 'utf8').toString('base64');
  return `=?UTF-8?B?${base64}?=`;
}

class EmailService {
  constructor() {
    this.gmailClient = null;
    this.gmailAuthReady = null;
  }

  /**
   * Returns Gmail client; ensures OAuth/JWT have a valid access token before API calls
   * (avoids "Request is missing required authentication credential" from Google).
   */
  async getGmailClient() {
    const {
      clientId,
      clientSecret,
      refreshToken,
      serviceAccountJson,
      delegatedUser,
      senderEmail,
    } = config.email.gmail || {};

    if (this.gmailClient && this.gmailAuthReady) {
      await this.gmailAuthReady;
      return this.gmailClient;
    }

    // Optional path: service account with domain-wide delegation.
    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        const privateKey = parsed.private_key?.replace(/\\n/g, '\n');
        const subject = delegatedUser || senderEmail;
        const jwtClient = new google.auth.JWT(
          parsed.client_email,
          null,
          privateKey,
          ['https://www.googleapis.com/auth/gmail.send'],
          subject
        );
        this.gmailAuthReady = jwtClient.authorize().then(() => undefined);
        await this.gmailAuthReady;
        this.gmailClient = google.gmail({ version: 'v1', auth: jwtClient });
        return this.gmailClient;
      } catch (error) {
        logger.error('Invalid GMAIL_SERVICE_ACCOUNT_JSON or JWT authorize failed', { message: error?.message });
      }
    }

    if (clientId && clientSecret && refreshToken) {
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      this.gmailAuthReady = oauth2.getAccessToken().then(() => undefined);
      await this.gmailAuthReady;
      this.gmailClient = google.gmail({ version: 'v1', auth: oauth2 });
      return this.gmailClient;
    }

    return null;
  }

  buildPasswordResetEmailHtml(resetUrl, resetToken) {
    return `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #2d1b45;">
        <h2 style="margin-bottom: 8px;">איפוס סיסמה - StudioBuda</h2>
        <p style="margin: 0 0 16px;">קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
        <p style="margin: 0 0 20px;">
          לחצו על הכפתור הבא כדי להגדיר סיסמה חדשה:
        </p>
        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            background: #ab5fbd;
            color: #ffffff;
            text-decoration: none;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: bold;
          "
        >
          איפוס סיסמה
        </a>
        <p style="margin: 20px 0 0; font-size: 13px; color: #6a4a7a;">
          אם לא ביקשתם איפוס - אפשר להתעלם מההודעה.
        </p>
        <p style="margin: 12px 0 0; font-size: 12px; color: #6a4a7a;">
          קוד איפוס ידני: <strong dir="ltr">${resetToken}</strong>
        </p>
      </div>
    `;
  }

  async sendWithSendGrid({ to, subject, html }) {
    const apiKey = config.email.apiKey;
    const from = config.email.fromAddress;
    if (!apiKey || !from) {
      throw new Error('SendGrid is not configured. Set EMAIL_API_KEY and EMAIL_FROM_ADDRESS.');
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: config.email.fromName || 'StudioBuda' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SendGrid error ${res.status}: ${text.substring(0, 500)}`);
    }
  }

  async sendWithGmailApi({ to, subject, html }) {
    const gmail = await this.getGmailClient();
    const fromEmail = config.email.gmail?.senderEmail || config.email.fromAddress;

    if (!gmail || !fromEmail) {
      throw new Error('Gmail API is not configured. Missing credentials or sender email.');
    }

    const subjectHeader = encodeRfc2047Subject(subject);
    const mimeMessage = [
      `From: ${config.email.fromName} <${fromEmail}>`,
      `To: ${to}`,
      'Content-Type: text/html; charset="UTF-8"',
      'MIME-Version: 1.0',
      `Subject: ${subjectHeader}`,
      '',
      html,
    ].join('\r\n');

    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    const html = this.buildPasswordResetEmailHtml(resetUrl, resetToken);
    const subject = 'StudioBuda - איפוס סיסמה';
    const payload = { to: email, subject, html };
    const canSendGrid = !!config.email.apiKey && !!config.email.fromAddress;
    const provider = (config.email.provider || 'sendgrid').toLowerCase();

    // If EMAIL_SERVICE_PROVIDER=gmail (or only Gmail is configured), never use SendGrid.
    if (canSendGrid && provider !== 'gmail') {
      try {
        await this.sendWithSendGrid(payload);
        logger.info('Password reset email sent via SendGrid', { email });
        return true;
      } catch (error) {
        logger.error('SendGrid send failed', { email, message: error?.message });
        throw error;
      }
    }

    const useGmail =
      provider === 'gmail' || (provider !== 'sendgrid' && config.email.gmail?.isReady);

    if (useGmail) {
      try {
        await this.sendWithGmailApi(payload);
        logger.info('Password reset email sent via Gmail API', { email });
        return true;
      } catch (error) {
        logger.error('Failed to send reset email via Gmail API', { email, message: error?.message });
        throw error;
      }
    }

    // Development: do not block forgot-password if email is not wired up
    const isDev = config.server.nodeEnv === 'development' || !config.server.nodeEnv;
    if (isDev) {
      logger.warn('Password reset: email not configured; logging reset URL for local dev', {
        email,
        resetUrl: resetUrl?.substring(0, 200),
      });
      return true;
    }

    throw new Error(
      'Password reset email is not configured. Use SendGrid: EMAIL_API_KEY and EMAIL_FROM_ADDRESS, or Gmail: GMAIL_OAUTH_CLIENT_JSON (or GMAIL_OAUTH_CLIENT_FILE) plus GMAIL_REFRESH_TOKEN and GMAIL_SENDER_EMAIL / EMAIL_FROM_ADDRESS, or run: npm run gmail:refresh-token'
    );
  }

  async sendWelcomeEmail(email, name) {
    // Placeholder implementation
    logger.info('Welcome email would be sent', {
      email,
      name,
      provider: config.email.provider,
    });

    return true;
  }
}

export default new EmailService();

