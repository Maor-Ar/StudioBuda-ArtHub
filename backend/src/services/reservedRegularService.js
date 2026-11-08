import { db } from '../config/firebase.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { STUDIO_OVERBOOK_EMAIL } from '../config/reservedSubscriptionCopy.js';
import { ConflictError, ValidationError } from '../utils/errors.js';
import { generateRecurringInstances, parseEventOccurrenceId, toUtcDateKey } from '../utils/helpers.js';
import {
  endOfNextCalendarMonth,
  holdsReservedSeat,
  isEligibleWeeklyClass,
  isRegularsListFull,
  lockStillHeld,
  reservedRegularIds,
  startOfNextUtcDay,
  toDateValue,
  utcWeekday,
} from '../utils/reservedRegulars.js';
import cacheService from './cacheService.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';
import occurrenceOverrideService from './occurrenceOverrideService.js';
import registrationService from './registrationService.js';
import userService from './userService.js';

const LOCKS_COLLECTION = 'reserved_regular_locks';

const NO_SEAT_MESSAGE = 'אין מקום פנוי לקבועים בשיעור זה';
const INELIGIBLE_MESSAGE = 'השיעור לא זמין למנוי קבוע';
const ALREADY_HOLDING_MESSAGE = 'כבר יש לך מקום שמור בשיעור קבוע. אפשר לרכוש שוב רק אחרי שהמקום משתחרר';

class ReservedRegularService {
  seriesId(eventId) {
    return parseEventOccurrenceId(eventId).actualEventId;
  }

  async invalidateEvent(eventId) {
    if (!eventId) return;
    await cacheService.delPattern('events:*');
    await cacheService.del(cacheService.getEventKey(eventId));
  }

  async getSeries(eventId) {
    const eventService = (await import('./eventService.js')).default;
    return eventService.getEvent(this.seriesId(eventId));
  }

  async findHoldingTransaction(userId, now = new Date()) {
    if (!userId) return null;
    const snap = await db.collection('transactions').where('userId', '==', userId).get();
    return (
      snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .find((tx) => holdsReservedSeat(tx, now)) || null
    );
  }

  async findHoldingLock(userId, now = new Date()) {
    if (!userId) return null;
    const snap = await db.collection(LOCKS_COLLECTION).doc(userId).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (!lockStillHeld(data, now)) return null;
    return { reservedEventId: data.eventId, source: 'lock' };
  }

  async findHolding(userId, now = new Date()) {
    const tx = await this.findHoldingTransaction(userId, now);
    if (tx) return { reservedEventId: tx.reservedEventId, source: 'transaction', transactionId: tx.id };
    return this.findHoldingLock(userId, now);
  }

  async assertNoHoldingReservation(userId) {
    const holding = await this.findHolding(userId);
    if (holding) {
      throw new ConflictError(ALREADY_HOLDING_MESSAGE, 'reservedEventId');
    }
  }

  async assertClassAvailable(eventId) {
    const event = await this.getSeries(eventId);
    if (!isEligibleWeeklyClass(event)) {
      throw new ValidationError(INELIGIBLE_MESSAGE, 'reservedEventId');
    }
    if (isRegularsListFull(event, event.maxRegistrations)) {
      throw new ConflictError(NO_SEAT_MESSAGE, 'reservedEventId');
    }
    return event;
  }

  async releaseExpiredSeatsForUser(userId, now = new Date()) {
    if (!userId) return;
    const snap = await db.collection('transactions').where('userId', '==', userId).get();
    for (const doc of snap.docs) {
      const tx = doc.data() || {};
      if (tx.transactionType !== TRANSACTION_TYPES.RESERVED_SUBSCRIPTION) continue;
      if (tx.isActive) continue;
      const releaseAt = toDateValue(tx.reservationReleaseAt);
      if (!releaseAt || releaseAt.getTime() > now.getTime()) continue;
      if (!tx.reservedEventId) continue;
      await this.removeUser(tx.reservedEventId, userId);
    }
  }

  async tryClaimSeat(eventId, userId) {
    const actualEventId = this.seriesId(eventId);
    const eventRef = db.collection('events').doc(actualEventId);
    const lockRef = db.collection(LOCKS_COLLECTION).doc(userId);
    let result = { claimed: false, reason: 'missing', eventId: actualEventId, event: null };

    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      const lockSnap = await tx.get(lockRef);
      if (!eventSnap.exists) {
        result = { claimed: false, reason: 'missing', eventId: actualEventId, event: null };
        return;
      }

      const event = { id: eventSnap.id, ...eventSnap.data() };
      if (!isEligibleWeeklyClass(event)) {
        result = { claimed: false, reason: 'ineligible', eventId: actualEventId, event };
        return;
      }

      const lock = lockSnap.exists ? lockSnap.data() : null;
      if (lock && lockStillHeld(lock) && lock.eventId && lock.eventId !== actualEventId) {
        result = { claimed: false, reason: 'other_seat', eventId: actualEventId, event };
        return;
      }

      const ids = reservedRegularIds(event);
      if (ids.includes(userId)) {
        result = { claimed: false, reason: 'already_member', eventId: actualEventId, event };
        return;
      }
      if (ids.length >= Number(event.maxRegistrations || 0)) {
        result = { claimed: false, reason: 'full', eventId: actualEventId, event };
        return;
      }

      const nextIds = [...ids, userId];
      const now = new Date();
      tx.update(eventRef, { reservedRegularUserIds: nextIds, updatedAt: now });
      tx.set(lockRef, {
        eventId: actualEventId,
        userId,
        reservationReleaseAt: null,
        updatedAt: now,
      });
      result = {
        claimed: true,
        reason: 'added',
        eventId: actualEventId,
        event: { ...event, reservedRegularUserIds: nextIds },
      };
    });

    if (result.claimed) {
      await this.invalidateEvent(actualEventId);
    }
    return result;
  }

  claimFailureMessage(reason) {
    if (reason === 'full' || reason === 'already_member') return NO_SEAT_MESSAGE;
    if (reason === 'other_seat') return ALREADY_HOLDING_MESSAGE;
    return INELIGIBLE_MESSAGE;
  }

  async removeUser(eventId, userId) {
    if (!eventId || !userId) return;
    const actualEventId = this.seriesId(eventId);
    const eventRef = db.collection('events').doc(actualEventId);
    const lockRef = db.collection(LOCKS_COLLECTION).doc(userId);

    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      const lockSnap = await tx.get(lockRef);
      if (eventSnap.exists) {
        const ids = reservedRegularIds(eventSnap.data()).filter((id) => id !== userId);
        tx.update(eventRef, { reservedRegularUserIds: ids, updatedAt: new Date() });
      }
      if (lockSnap.exists && lockSnap.data()?.eventId === actualEventId) {
        tx.delete(lockRef);
      }
    });

    await this.invalidateEvent(actualEventId);
  }

  async markRelease(userId, eventId, releaseAt) {
    if (!userId || !eventId || !releaseAt) return;
    const actualEventId = this.seriesId(eventId);
    await db.collection(LOCKS_COLLECTION).doc(userId).set(
      {
        eventId: actualEventId,
        userId,
        reservationReleaseAt: releaseAt,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  async moveHoldersToSeries(oldEventId, newEventId, userIds) {
    const ids = reservedRegularIds(userIds);
    if (!oldEventId || !newEventId || ids.length === 0) return;

    const now = new Date();
    for (const userId of ids) {
      const lockRef = db.collection(LOCKS_COLLECTION).doc(userId);
      const lock = await lockRef.get();
      if (lock.exists && lock.data()?.eventId === oldEventId) {
        await lockRef.set({ eventId: newEventId, updatedAt: now }, { merge: true });
      }
    }

    const snap = await db.collection('transactions').where('reservedEventId', '==', oldEventId).get();
    let batch = db.batch();
    let writes = 0;
    const commitIfNeeded = async (force = false) => {
      if (writes === 0) return;
      if (!force && writes < 400) return;
      await batch.commit();
      batch = db.batch();
      writes = 0;
    };

    for (const doc of snap.docs) {
      const tx = { id: doc.id, ...doc.data() };
      if (!holdsReservedSeat(tx)) continue;
      if (!ids.includes(tx.userId)) continue;
      batch.update(doc.ref, { reservedEventId: newEventId, updatedAt: now });
      writes += 1;
      await commitIfNeeded(false);
    }
    await commitIfNeeded(true);
    await this.invalidateEvent(oldEventId);
    await this.invalidateEvent(newEventId);
  }

  async listWeeklySubscriptionClasses() {
    const snap = await db.collection('events').where('isActive', '==', true).get();

    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((event) => event.eventType === 'subscription_only' && isEligibleWeeklyClass(event))
      .map((event) => ({
        id: event.id,
        title: event.title || '',
        startTime: event.startTime || '',
        instructorName: event.instructorName || '',
        maxRegistrations: event.maxRegistrations || 0,
        reservedRegularCount: reservedRegularIds(event).length,
        weekday: utcWeekday(event.date),
      }));
  }

  async listMembers(eventId) {
    const event = await this.getSeries(eventId);
    const ids = reservedRegularIds(event);
    const users = await userService.getUsersByIds(ids);
    return ids.map((userId) => {
      const user = users.get(userId);
      const displayName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'משתמש לא ידוע'
        : 'משתמש לא ידוע';
      return { userId, displayName };
    });
  }

  async addRegular(eventId, userId) {
    await userService.getUserById(userId);
    await this.releaseExpiredSeatsForUser(userId);
    await this.assertNoHoldingReservation(userId);
    const claim = await this.tryClaimSeat(eventId, userId);
    if (!claim.claimed) {
      const isConflict = claim.reason === 'full' || claim.reason === 'already_member' || claim.reason === 'other_seat';
      if (isConflict) {
        throw new ConflictError(this.claimFailureMessage(claim.reason), 'userId');
      }
      throw new ValidationError(this.claimFailureMessage(claim.reason), 'eventId');
    }
    await this.notifyIfOverbooked(claim.event, userId);
    return true;
  }

  async removeRegular(eventId, userId) {
    await this.removeUser(eventId, userId);
    return true;
  }

  async findOverbookedDates(event, now = new Date()) {
    if (!event?.id || !event.isRecurring) return [];
    const start = startOfNextUtcDay(now);
    const end = endOfNextCalendarMonth(now);
    const instances = generateRecurringInstances(event, start, end);
    if (instances.length === 0) return [];

    const keys = instances.map((instance) => ({
      eventId: event.id,
      dateKey: toUtcDateKey(instance.date),
    }));
    const [counts, overrides] = await Promise.all([
      registrationService.countRegistrationsByEventAndDate(keys),
      occurrenceOverrideService.getForOccurrences(keys),
    ]);
    const regulars = reservedRegularIds(event).length;
    const overbooked = [];

    for (const instance of instances) {
      const dateKey = toUtcDateKey(instance.date);
      const overrideDoc = overrides.get(`${event.id}_${dateKey}`);
      if (occurrenceOverrideService.isCancelled(overrideDoc)) continue;
      const resolved = occurrenceOverrideService.applyToEvent(event, overrideDoc);
      const dropIns = counts[`${event.id}:${dateKey}`] || 0;
      const max = Number(resolved.maxRegistrations || 0);
      if (dropIns + regulars > max) {
        overbooked.push({ dateKey, dropIns, regulars, max });
      }
    }
    return overbooked;
  }

  formatOverbookDate(dateKey) {
    const [year, month, day] = String(dateKey).split('-').map((part) => Number(part));
    if (!year || !month || !day) return dateKey;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  async notifyIfOverbooked(event, userId) {
    try {
      const dates = await this.findOverbookedDates(event);
      if (dates.length === 0) return;

      let regularName = userId;
      try {
        const user = await userService.getUserById(userId);
        regularName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userId;
      } catch (error) {
        logger.warn('Could not load new regular for overbook email', { userId, error: error.message });
      }

      const escapeHtml = (value) =>
        String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      const safeName = escapeHtml(regularName);
      const safeClass = escapeHtml(event.title || 'שיעור');

      const rows = dates
        .map(
          (item) =>
            `<li>${this.formatOverbookDate(item.dateKey)}: נרשמים מזדמנים ${item.dropIns}, קבועים ${item.regulars}, מקסימום ${item.max}</li>`
        )
        .join('');
      const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #2d1b45;">
          <h2 style="margin-bottom: 8px;">חריגה ממכסת שיעור אחרי הוספת קבוע</h2>
          <p>נוסף קבוע לשיעור, ויש מפגשים עד סוף החודש הבא שבהם הנרשמים המזדמנים יחד עם הקבועים עוברים את המקסימום.</p>
          <p><strong>שיעור:</strong> ${safeClass}</p>
          <p><strong>קבוע חדש:</strong> ${safeName}</p>
          <ul>${rows}</ul>
          <p>הרכישה נשמרה. צריך לטפל בתאריכים האלה ידנית.</p>
        </div>
      `;
      await emailService.sendHtmlEmail({
        to: STUDIO_OVERBOOK_EMAIL,
        subject: `חריגה בשיעור ${event.title || ''}`.trim(),
        html,
      });
    } catch (error) {
      logger.error('Reserved regular overbook email failed', {
        eventId: event?.id,
        userId,
        error: error.message,
      });
    }
  }

  async releaseDueReservations({ dryRun = false, now = new Date() } = {}) {
    const results = { checked: 0, released: 0, skipped: 0, errors: [] };
    const snap = await db
      .collection('transactions')
      .where('transactionType', '==', TRANSACTION_TYPES.RESERVED_SUBSCRIPTION)
      .get();

    for (const doc of snap.docs) {
      results.checked += 1;
      const tx = { id: doc.id, ...doc.data() };
      const releaseAt = toDateValue(tx.reservationReleaseAt);
      if (!releaseAt || releaseAt.getTime() > now.getTime() || !tx.reservedEventId || !tx.userId) {
        results.skipped += 1;
        continue;
      }
      if (dryRun) {
        results.released += 1;
        continue;
      }
      try {
        await this.removeUser(tx.reservedEventId, tx.userId);
        results.released += 1;
      } catch (error) {
        results.errors.push({ transactionId: tx.id, error: error.message });
      }
    }
    return results;
  }
}

export default new ReservedRegularService();
