import { db } from '../config/firebase.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import {
  isPreviousMonth,
  updateToCurrentMonth,
} from '../utils/helpers.js';
import logger from '../utils/logger.js';
import gmailInboxService from './gmailInboxService.js';
import transactionService from './transactionService.js';

const SYNC_LOG_COLLECTION = 'grow_email_sync_log';
const RECEIPTS_COLLECTION = 'grow_payment_receipts';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+972|0)[\s-]?(?:5\d)[\s-]?\d{3}[\s-]?\d{4}/g;
const AMOUNT_RE = /(?:₪|ש"ח|ש״ח|NIS|ILS)?\s*(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:₪|ש"ח|ש״ח|NIS|ILS)?/gi;

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972') && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Sync Grow / Meshulam payment receipts from Gmail (no public Grow API).
 * Matches active non-Hyp subscriptions by customer email/phone found in the mail.
 */
class GrowEmailSyncService {
  getSearchQuery() {
    return (
      process.env.GROW_GMAIL_QUERY ||
      'newer_than:3d (from:grow OR from:meshulam OR subject:גרואו OR subject:Grow OR subject:תשלום OR subject:חיוב)'
    );
  }

  getGraceDays() {
    const n = parseInt(process.env.GROW_PAYMENT_GRACE_DAYS || '5', 10);
    return Number.isFinite(n) && n >= 0 ? n : 5;
  }

  looksLikePaymentEmail(message) {
    const hay = `${message.subject || ''} ${message.snippet || ''} ${message.text || ''}`.toLowerCase();
    const positive = [
      'תשלום',
      'שולם',
      'התקבל',
      'חיוב',
      'קבלה',
      'invoice',
      'payment',
      'paid',
      'receipt',
      'grow',
      'meshulam',
      'גרואו',
    ];
    const negative = ['נכשל', 'failed', 'הוחזר', 'refund', 'בוטל', 'cancel'];
    if (negative.some((w) => hay.includes(w))) return false;
    return positive.some((w) => hay.includes(w));
  }

  parseMessage(message) {
    const text = `${message.subject || ''}\n${message.text || ''}\n${message.snippet || ''}`;
    const emails = [...new Set((text.match(EMAIL_RE) || []).map(normalizeEmail))];
    const phones = [...new Set((text.match(PHONE_RE) || []).map(normalizePhone).filter(Boolean))];
    const amounts = [];
    for (const match of text.matchAll(AMOUNT_RE)) {
      const raw = match[1]?.replace(',', '.');
      const num = Number(raw);
      if (Number.isFinite(num) && num >= 20 && num <= 5000) {
        amounts.push(num);
      }
    }

    return {
      messageId: message.id,
      receivedAt: message.internalDate || new Date(),
      subject: message.subject || '',
      from: message.from || '',
      emails,
      phones,
      amounts: [...new Set(amounts)],
      monthKey: monthKey(message.internalDate || new Date()),
    };
  }

  async wasProcessed(messageId) {
    const doc = await db.collection(SYNC_LOG_COLLECTION).doc(messageId).get();
    return doc.exists;
  }

  async markProcessed(messageId, payload) {
    await db.collection(SYNC_LOG_COLLECTION).doc(messageId).set(
      {
        ...payload,
        processedAt: new Date(),
      },
      { merge: true }
    );
  }

  async findUsersByContacts({ emails, phones }) {
    const users = new Map();

    for (const email of emails) {
      const snap = await db.collection('users').where('email', '==', email).limit(5).get();
      snap.docs.forEach((doc) => {
        users.set(doc.id, { id: doc.id, ...doc.data() });
      });
    }

    // Phone matching is best-effort (formats vary); only if email didn't match.
    if (users.size === 0 && phones.length > 0) {
      const phoneSnap = await db.collection('users').limit(500).get();
      phoneSnap.docs.forEach((doc) => {
        const data = doc.data() || {};
        const userPhone = normalizePhone(data.phone);
        if (userPhone && phones.includes(userPhone)) {
          users.set(doc.id, { id: doc.id, ...data });
        }
      });
    }

    return [...users.values()];
  }

  async findGrowSubscriptionForUser(userId) {
    const snap = await db
      .collection('transactions')
      .where('userId', '==', userId)
      .where('transactionType', '==', TRANSACTION_TYPES.SUBSCRIPTION)
      .where('isActive', '==', true)
      .get();

    const candidates = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      // Hyp is handled by Hyp webhooks — never renew Hyp agreements from Grow mail.
      .filter((tx) => !tx.hypHkId);

    return candidates[0] || null;
  }

  async recordReceipt(parsed, userId, transactionId) {
    const id = `${parsed.messageId}_${transactionId || 'unmatched'}`;
    await db.collection(RECEIPTS_COLLECTION).doc(id).set(
      {
        messageId: parsed.messageId,
        userId: userId || null,
        transactionId: transactionId || null,
        subject: parsed.subject,
        from: parsed.from,
        emails: parsed.emails,
        phones: parsed.phones,
        amounts: parsed.amounts,
        monthKey: parsed.monthKey,
        receivedAt: parsed.receivedAt,
        createdAt: new Date(),
      },
      { merge: true }
    );
  }

  async hasReceiptForTransactionMonth(transactionId, key = monthKey()) {
    const snap = await db
      .collection(RECEIPTS_COLLECTION)
      .where('transactionId', '==', transactionId)
      .where('monthKey', '==', key)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async renewSubscription(transaction) {
    const purchaseDate = toDate(transaction.purchaseDate) || new Date();
    await transactionService.updateTransaction(transaction.id, {
      lastRenewalDate: updateToCurrentMonth(purchaseDate),
      lastPaymentDate: new Date(),
      entriesUsedThisMonth: 0,
      paymentSource: transaction.paymentSource || 'grow',
    });
  }

  async syncFromInbox({ dryRun = false } = {}) {
    const results = {
      scanned: 0,
      paymentsFound: 0,
      renewed: 0,
      unmatched: 0,
      skipped: 0,
      deactivated: 0,
      errors: [],
    };

    if (!gmailInboxService.isReady()) {
      results.errors.push('Gmail is not configured — skip Grow email sync');
      return results;
    }

    let messages = [];
    try {
      messages = await gmailInboxService.searchMessages({
        query: this.getSearchQuery(),
        maxResults: 50,
      });
    } catch (error) {
      logger.error('Grow Gmail search failed', { message: error.message });
      results.errors.push(error.message);
      return results;
    }

    results.scanned = messages.length;

    for (const message of messages) {
      try {
        if (await this.wasProcessed(message.id)) {
          results.skipped++;
          continue;
        }
        if (!this.looksLikePaymentEmail(message)) {
          if (!dryRun) {
            await this.markProcessed(message.id, { status: 'ignored_not_payment' });
          }
          results.skipped++;
          continue;
        }

        results.paymentsFound++;
        const parsed = this.parseMessage(message);
        const users = await this.findUsersByContacts(parsed);

        if (users.length === 0) {
          results.unmatched++;
          if (!dryRun) {
            await this.recordReceipt(parsed, null, null);
            await this.markProcessed(message.id, { status: 'unmatched', parsed });
          }
          continue;
        }

        let renewedAny = false;
        for (const user of users) {
          const subscription = await this.findGrowSubscriptionForUser(user.id);
          if (!subscription) continue;

          if (!dryRun) {
            await this.recordReceipt(parsed, user.id, subscription.id);
            await this.renewSubscription(subscription);
          }
          renewedAny = true;
          results.renewed++;
        }

        if (!renewedAny) {
          results.unmatched++;
          if (!dryRun) {
            await this.recordReceipt(parsed, users[0]?.id || null, null);
            await this.markProcessed(message.id, {
              status: 'matched_user_no_grow_subscription',
              userIds: users.map((u) => u.id),
            });
          }
          continue;
        }

        if (!dryRun) {
          await this.markProcessed(message.id, {
            status: 'renewed',
            userIds: users.map((u) => u.id),
          });
        }
      } catch (error) {
        logger.error('Grow email message sync failed', {
          messageId: message.id,
          error: error.message,
        });
        results.errors.push({ messageId: message.id, error: error.message });
      }
    }

    // Deactivate overdue Grow subscriptions with no receipt this billing cycle.
    const graceMs = this.getGraceDays() * 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const transactionType of [
      TRANSACTION_TYPES.SUBSCRIPTION,
      TRANSACTION_TYPES.RESERVED_SUBSCRIPTION,
    ]) {
    const activeSnap = await db
      .collection('transactions')
      .where('transactionType', '==', transactionType)
      .where('isActive', '==', true)
      .get();

    for (const doc of activeSnap.docs) {
      const tx = { id: doc.id, ...doc.data() };
      if (tx.hypHkId) continue; // Hyp path
      if (tx.paymentSource === 'manual_cash') continue;

      const lastRenewal = toDate(tx.lastRenewalDate) || toDate(tx.lastPaymentDate) || toDate(tx.purchaseDate);
      if (!lastRenewal || !isPreviousMonth(lastRenewal)) continue;

      const overdueAt = lastRenewal.getTime() + 30 * 24 * 60 * 60 * 1000 + graceMs;
      if (now < overdueAt) continue;

      const hasReceipt = await this.hasReceiptForTransactionMonth(tx.id, monthKey());
      if (hasReceipt) {
        if (!dryRun) {
          await this.renewSubscription(tx);
        }
        results.renewed++;
        continue;
      }

      if (!dryRun) {
        await transactionService.updateTransaction(tx.id, { isActive: false });
      }
      results.deactivated++;
    }
    }

    return results;
  }

  /**
   * Used by login renewal: only Grow/non-Hyp subs, and only if we already stored
   * a receipt for the current calendar month.
   */
  async verifyPayment(invoiceId, userId) {
    if (!userId) return { verified: false, paymentDate: null };

    const snap = await db
      .collection('transactions')
      .where('userId', '==', userId)
      .where('transactionType', '==', TRANSACTION_TYPES.SUBSCRIPTION)
      .where('isActive', '==', true)
      .get();

    const growTx = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .find((tx) => !tx.hypHkId && (tx.invoiceId === invoiceId || !invoiceId));

    if (!growTx) {
      return { verified: false, paymentDate: null };
    }

    const key = monthKey();
    const hasReceipt = await this.hasReceiptForTransactionMonth(growTx.id, key);
    if (hasReceipt) {
      return { verified: true, paymentDate: new Date() };
    }

    return { verified: false, paymentDate: null };
  }
}

export default new GrowEmailSyncService();
