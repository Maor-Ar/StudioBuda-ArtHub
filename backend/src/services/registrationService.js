import admin, { db } from '../config/firebase.js';
import { CACHE_TTL, EVENT_TYPES, TRANSACTION_TYPES, REGISTRATION_STATUS } from '../config/constants.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import eventService from './eventService.js';
import transactionService from './transactionService.js';
import cacheService from './cacheService.js';

const DUMMY_USER_ID = 'DummyUser';
const DUMMY_TRANSACTION_ID = 'DUMMY_RESERVATION';
const MANUAL_REGISTRATIONS_COLLECTION = 'event_manual_registrations';
const MANUAL_REGISTRATION_ID_PREFIX = 'manual:';
const OCCURRENCE_COUNTS_COLLECTION = 'occurrence_counts';
const FieldValue = admin.firestore.FieldValue;

class RegistrationService {
  resolveEventOccurrence(eventId) {
    let actualEventId = eventId;
    let occurrenceDate = null;

    if (eventId.includes('_')) {
      const parts = eventId.split('_');
      if (parts.length >= 2) {
        const datePart = parts[parts.length - 1];
        actualEventId = parts.slice(0, -1).join('_');

        try {
          occurrenceDate = new Date(`${datePart}T00:00:00.000Z`);
          if (isNaN(occurrenceDate.getTime())) {
            actualEventId = eventId;
            occurrenceDate = null;
          }
        } catch (error) {
          actualEventId = eventId;
          occurrenceDate = null;
        }
      }
    }

    return { actualEventId, occurrenceDate };
  }

  getDateKey(dateValue) {
    if (!dateValue) {
      return null;
    }
    const dateObj = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) {
      return null;
    }
    return dateObj.toISOString().split('T')[0];
  }

  getOccurrenceCountDocId(eventId, dateKey) {
    return `${eventId}_${dateKey}`;
  }

  async adjustOccurrenceCount(eventId, dateKey, delta) {
    if (!eventId || !dateKey || !delta) {
      return;
    }

    const ref = db.collection(OCCURRENCE_COUNTS_COLLECTION).doc(this.getOccurrenceCountDocId(eventId, dateKey));

    // Decrements must stay non-negative and be serialized with reserves.
    if (delta < 0) {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        const current = snap.exists ? (snap.data().count || 0) : 0;
        transaction.set(
          ref,
          {
            eventId,
            dateKey,
            count: Math.max(0, current + delta),
            updatedAt: new Date(),
          },
          { merge: true }
        );
      });
      return;
    }

    await ref.set(
      {
        eventId,
        dateKey,
        count: FieldValue.increment(delta),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  async setOccurrenceCount(eventId, dateKey, count) {
    if (!eventId || !dateKey) {
      return;
    }

    await db.collection(OCCURRENCE_COUNTS_COLLECTION).doc(this.getOccurrenceCountDocId(eventId, dateKey)).set(
      {
        eventId,
        dateKey,
        count: Math.max(0, count),
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  async getOccurrenceCount(eventId, dateKey) {
    const doc = await db
      .collection(OCCURRENCE_COUNTS_COLLECTION)
      .doc(this.getOccurrenceCountDocId(eventId, dateKey))
      .get();

    if (doc.exists) {
      return doc.data().count || 0;
    }

    const fallbackCount = await this.countRegistrationsForOccurrenceFallback(eventId, dateKey);
    await this.setOccurrenceCount(eventId, dateKey, fallbackCount);
    return fallbackCount;
  }

  /**
   * Atomically reserve a seat and create a registration document.
   * Either both succeed or neither does — no overbooking window.
   */
  async createRegistrationWithReservedSlot({
    collectionName,
    registrationDoc,
    eventId,
    dateKey,
    maxRegistrations,
  }) {
    if (!eventId || !dateKey || !Number.isFinite(Number(maxRegistrations))) {
      throw new ValidationError('Invalid capacity reservation parameters', 'eventId');
    }

    const max = Number(maxRegistrations);
    await this.getOccurrenceCount(eventId, dateKey);

    const countRef = db
      .collection(OCCURRENCE_COUNTS_COLLECTION)
      .doc(this.getOccurrenceCountDocId(eventId, dateKey));
    const registrationRef = db.collection(collectionName).doc();

    try {
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(countRef);
        const count = snap.exists ? (snap.data().count || 0) : 0;

        if (count >= max) {
          throw new ConflictError('Event is at full capacity', 'eventId');
        }

        transaction.set(
          countRef,
          {
            eventId,
            dateKey,
            count: count + 1,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        transaction.set(registrationRef, registrationDoc);
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      if (error?.message === 'Event is at full capacity') {
        throw new ConflictError('Event is at full capacity', 'eventId');
      }
      throw error;
    }

    return registrationRef;
  }

  async releaseOccurrenceSlot(eventId, dateKey) {
    await this.adjustOccurrenceCount(eventId, dateKey, -1);
  }

  async countRegistrationsForOccurrenceFallback(eventId, dateKey) {
    const [snapshot, manualSnapshot] = await Promise.all([
      db.collection('event_registrations')
        .where('eventId', '==', eventId)
        .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
        .get(),
      db.collection(MANUAL_REGISTRATIONS_COLLECTION)
        .where('eventId', '==', eventId)
        .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
        .get(),
    ]);

    const matchesDateKey = (reg) => {
      const regDateKey = reg.dateKey || this.getDateKey(reg.date || reg.occurrenceDate);
      return regDateKey === dateKey;
    };

    let count = 0;
    snapshot.docs.forEach((doc) => {
      if (matchesDateKey(doc.data())) {
        count += 1;
      }
    });
    manualSnapshot.docs.forEach((doc) => {
      if (matchesDateKey(doc.data())) {
        count += 1;
      }
    });

    return count;
  }

  async getCancellationsForOccurrences(occurrenceKeys) {
    const map = new Map();
    if (!occurrenceKeys?.length) {
      return map;
    }

    const uniqueDocIds = [
      ...new Set(occurrenceKeys.map(({ eventId, dateKey }) => `${eventId}_${dateKey}`)),
    ];

    for (let i = 0; i < uniqueDocIds.length; i += 100) {
      const chunkIds = uniqueDocIds.slice(i, i + 100);
      const chunkRefs = chunkIds.map((docId) => db.collection('event_cancellations').doc(docId));
      const snapshots = await db.getAll(...chunkRefs);
      snapshots.forEach((doc, idx) => {
        map.set(chunkIds[idx], doc.exists ? doc.data() : null);
      });
    }

    return map;
  }

  getRegistrationDateKey(registration) {
    if (registration?.dateKey) {
      return registration.dateKey;
    }
    return this.getDateKey(registration?.date || registration?.occurrenceDate);
  }

  getEventEndDateTime(dateValue, startTime, durationMinutes) {
    const eventDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    if (isNaN(eventDate.getTime())) return null;

    const [hours = 0, minutes = 0] = String(startTime || '00:00')
      .split(':')
      .map((part) => parseInt(part, 10));
    const safeDuration = Number.isFinite(Number(durationMinutes)) ? Number(durationMinutes) : 0;

    const endDateTime = new Date(eventDate);
    endDateTime.setHours(hours, minutes, 0, 0);
    endDateTime.setMinutes(endDateTime.getMinutes() + safeDuration);
    return endDateTime;
  }

  ensureEventHasNotEnded(eventDate, event) {
    const eventEndDateTime = this.getEventEndDateTime(eventDate, event?.startTime, event?.duration);
    if (!eventEndDateTime) {
      throw new ValidationError('Invalid event date or time', 'eventId');
    }

    if (eventEndDateTime.getTime() < Date.now()) {
      throw new ConflictError('Cannot register to an event that has already ended', 'eventId');
    }
  }

  async registerForEvent(userId, eventId, transactionData = null) {
    // Check if eventId is a virtual instance ID (format: baseEventId_YYYY-MM-DD)
    // Virtual instances are generated on-the-fly for recurring events
    const { actualEventId, occurrenceDate } = this.resolveEventOccurrence(eventId);
    
    // Get event (using actualEventId which is the base event ID for recurring events)
    const event = await eventService.getEvent(actualEventId);

    if (!event.isActive) {
      throw new ValidationError('Event is not active', 'eventId');
    }

    // Get the actual date for this event occurrence
    // For virtual instances, use the extracted occurrenceDate
    // For regular recurring events, use occurrenceDate from event
    // For one-time events, use the event date
    let eventDate;
    if (occurrenceDate) {
      // Virtual instance - use the extracted date
      eventDate = occurrenceDate;
    } else if (event.isRecurring) {
      // Recurring event - use occurrenceDate from event or fallback to date
      eventDate = event.occurrenceDate || event.date;
    } else {
      // One-time event - use the event date
      eventDate = event.date;
    }
    
    // Convert Firestore Timestamp to Date if needed
    if (eventDate?.toDate) {
      eventDate = eventDate.toDate();
    } else if (typeof eventDate === 'string') {
      eventDate = new Date(eventDate);
    }
    
    // Block registration if this specific occurrence was cancelled by admin.
    const dateKey = this.getDateKey(eventDate);
    const cancellationDoc = await db
      .collection('event_cancellations')
      .doc(`${actualEventId}_${dateKey}`)
      .get();
    if (cancellationDoc.exists && cancellationDoc.data()?.isActive !== false) {
      const cancellationReason = cancellationDoc.data()?.reason;
      throw new ConflictError(cancellationReason || 'Event is cancelled', 'eventId');
    }

    // Block registration after occurrence end time has passed.
    this.ensureEventHasNotEnded(eventDate, event);

    // Fast-fail capacity check (authoritative reserve happens just before write).
    if (!(await eventService.checkEventCapacity(actualEventId, eventDate))) {
      throw new ConflictError('Event is at full capacity', 'eventId');
    }
    
    // Check if already registered (for recurring events, check by date)
    // Use actualEventId (base event ID) for recurring events
    // For recurring events, ALWAYS pass the occurrenceDate to check by specific date
    // For one-time events, pass null to check by eventId only
    const dateToCheck = event.isRecurring ? eventDate : null;
    const existingRegistration = await this.getUserRegistrationForEvent(userId, actualEventId, dateToCheck);
    if (existingRegistration && existingRegistration.status === REGISTRATION_STATUS.CONFIRMED) {
      // For recurring events, provide more specific error message
      if (event.isRecurring) {
        throw new ConflictError('User is already registered for this event on this date', 'eventId');
      }
      throw new ConflictError('User is already registered for this event', 'eventId');
    }

    let transactionId = null;

    // Check eligibility based on event type
    if (event.eventType === EVENT_TYPES.TRIAL) {
      // Trial requires existing active trial_lesson transaction
      const hasTrial = await transactionService.checkTrialEligibility(userId);
      if (!hasTrial) {
        throw new ValidationError(
          'Trial lesson transaction required. Please purchase a trial lesson first.',
          'transactionId'
        );
      }

      // Get the active trial transaction
      const transactions = await transactionService.getUserActiveTransactions(userId);
      const trialTransaction = transactions.find(
        t => t.transactionType === TRANSACTION_TYPES.TRIAL_LESSON && t.isActive
      );
      if (!trialTransaction) {
        throw new ValidationError('Active trial lesson transaction not found', 'transactionId');
      }
      transactionId = trialTransaction.id;
    } else if (event.eventType === EVENT_TYPES.SUBSCRIPTION_ONLY) {
      // Subscription only: try any subscription with capacity, then punch card
      let transactions = await transactionService.getUserActiveTransactions(userId);

      if (transactions.length === 0) {
        // Cache may be stale; refetch without cache
        transactions = await transactionService.getUserActiveTransactions(userId, true);
      }

      const subscriptions = transactions.filter(
        t => t.transactionType === TRANSACTION_TYPES.SUBSCRIPTION && t.isActive
      );
      let subscriptionWithCapacity = null;
      for (const sub of subscriptions) {
        if (await transactionService.checkSubscriptionLimit(sub.id)) {
          subscriptionWithCapacity = sub;
          break;
        }
      }

      if (subscriptionWithCapacity) {
        transactionId = subscriptionWithCapacity.id;
      }

      if (!transactionId) {
        const punchCard = transactions.find(
          t => t.transactionType === TRANSACTION_TYPES.PUNCH_CARD &&
               t.isActive &&
               (t.entriesRemaining ?? 0) > 0
        );

        if (punchCard) {
          transactionId = punchCard.id;
        } else if (subscriptions.length > 0) {
          throw new ConflictError(
            'Subscription monthly entry limit reached',
            'transactionId'
          );
        } else {
          throw new ValidationError(
            'Active subscription or punch card with remaining entries required',
            'transactionId'
          );
        }
      }
    } else if (event.eventType === EVENT_TYPES.PAID_WORKSHOP) {
      // Paid workshop can create transaction if needed
      if (transactionData) {
        const transaction = await transactionService.createTransaction({
          ...transactionData,
          userId,
        });
        transactionId = transaction.id;
      } else {
        // Check if user has existing transaction that can be used
        const transactions = await transactionService.getUserActiveTransactions(userId);
        // For paid workshops, we might need to check if there's a suitable transaction
        // For now, require transactionData to be provided
        throw new ValidationError(
          'Transaction data required for paid workshop',
          'transactionData'
        );
      }
    }

    // Create registration
    const now = new Date();
    // eventDate was already calculated above
    const eventDateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
    
    const registrationDoc = {
      userId,
      transactionId,
      eventId: actualEventId, // Use base event ID (not virtual instance ID)
      occurrenceDate: eventDateObj,
      date: eventDateObj, // Add date field for easier grouping
      dateKey,
      registrationDate: now,
      status: REGISTRATION_STATUS.CONFIRMED,
      createdAt: now,
    };

    // Atomic seat reservation + registration create (no concurrent overbooking window).
    const docRef = await this.createRegistrationWithReservedSlot({
      collectionName: 'event_registrations',
      registrationDoc,
      eventId: actualEventId,
      dateKey,
      maxRegistrations: event.maxRegistrations,
    });

    // Note: registeredCount is now calculated on-the-fly from registrations
    // No need to update the base event's registeredCount field

    // Update transaction - use subscription entry or punch card entry
    if (transactionId) {
      try {
        const transaction = await transactionService.getTransactionById(transactionId);
        if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
          await transactionService.useSubscriptionEntry(transactionId);
        } else if (transaction.transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
          await transactionService.usePunchCardEntry(transactionId);
        }
      } catch (error) {
        // Roll back registration + seat if billing the entry fails after the seat was taken.
        try {
          await docRef.update({
            status: REGISTRATION_STATUS.CANCELLED,
            updatedAt: new Date(),
            cancelReason: 'transaction_entry_failed',
          });
          await this.releaseOccurrenceSlot(actualEventId, dateKey);
        } catch (rollbackError) {
          console.error('[REGISTRATION] Failed to roll back after transaction entry error:', rollbackError);
        }
        throw error;
      }
    }

    // Invalidate cache
    await cacheService.invalidateUserCache(userId);
    await cacheService.delPattern('events:*');

    return { id: docRef.id, ...registrationDoc };
  }

  async reserveSpotForDummyUser(eventId, customerName) {
    const { actualEventId, occurrenceDate } = this.resolveEventOccurrence(eventId);
    const event = await eventService.getEvent(actualEventId);

    if (!event.isActive) {
      throw new ValidationError('Event is not active', 'eventId');
    }

    let eventDate;
    if (occurrenceDate) {
      eventDate = occurrenceDate;
    } else if (event.isRecurring) {
      eventDate = event.occurrenceDate || event.date;
    } else {
      eventDate = event.date;
    }

    if (eventDate?.toDate) {
      eventDate = eventDate.toDate();
    } else if (typeof eventDate === 'string') {
      eventDate = new Date(eventDate);
    }

    // Prevent reserving a spot for a cancelled occurrence.
    const dateKey = this.getDateKey(eventDate);
    const cancellationDoc = await db
      .collection('event_cancellations')
      .doc(`${actualEventId}_${dateKey}`)
      .get();
    if (cancellationDoc.exists && cancellationDoc.data()?.isActive !== false) {
      const cancellationReason = cancellationDoc.data()?.reason;
      throw new ConflictError(cancellationReason || 'Event is cancelled', 'eventId');
    }

    // Block dummy reservations after occurrence end time has passed.
    this.ensureEventHasNotEnded(eventDate, event);

    if (!(await eventService.checkEventCapacity(actualEventId, eventDate))) {
      throw new ConflictError('Event is at full capacity', 'eventId');
    }

    const cleanCustomerName = String(customerName || '').trim();
    if (!cleanCustomerName) {
      throw new ValidationError('Customer name is required', 'customerName');
    }

    const now = new Date();
    const eventDateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);

    const manualRegistrationDoc = {
      customerName: cleanCustomerName,
      eventId: actualEventId,
      occurrenceDate: eventDateObj,
      date: eventDateObj,
      dateKey,
      status: REGISTRATION_STATUS.CONFIRMED,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.createRegistrationWithReservedSlot({
      collectionName: MANUAL_REGISTRATIONS_COLLECTION,
      registrationDoc: manualRegistrationDoc,
      eventId: actualEventId,
      dateKey,
      maxRegistrations: event.maxRegistrations,
    });

    await cacheService.delPattern('events:*');

    return {
      id: `${MANUAL_REGISTRATION_ID_PREFIX}${docRef.id}`,
      manualRegistrationId: docRef.id,
      userId: DUMMY_USER_ID,
      transactionId: DUMMY_TRANSACTION_ID,
      registrationDate: now,
      isManual: true,
      displayName: cleanCustomerName,
      ...manualRegistrationDoc,
    };
  }

  async cancelManualRegistrationAsAdmin(manualRegistrationId) {
    const manualDocRef = db.collection(MANUAL_REGISTRATIONS_COLLECTION).doc(manualRegistrationId);
    const manualDoc = await manualDocRef.get();
    if (!manualDoc.exists) {
      throw new NotFoundError('Manual registration not found');
    }

    const manualRegistration = { id: manualDoc.id, ...manualDoc.data() };
    if (manualRegistration.status === REGISTRATION_STATUS.CANCELLED) {
      throw new ConflictError('Registration is already cancelled', 'registrationId');
    }

    await manualDocRef.update({
      status: REGISTRATION_STATUS.CANCELLED,
      updatedAt: new Date(),
    });

    const dateKey = this.getRegistrationDateKey(manualRegistration);
    await this.adjustOccurrenceCount(manualRegistration.eventId, dateKey, -1);

    await cacheService.delPattern('events:*');

    return {
      id: `${MANUAL_REGISTRATION_ID_PREFIX}${manualDoc.id}`,
      manualRegistrationId: manualDoc.id,
      userId: DUMMY_USER_ID,
      transactionId: DUMMY_TRANSACTION_ID,
      registrationDate: manualRegistration.createdAt || new Date(),
      isManual: true,
      displayName: manualRegistration.customerName,
      ...manualRegistration,
      status: REGISTRATION_STATUS.CANCELLED,
    };
  }

  async removeReservedSpotForDummyUser(eventId) {
    const { actualEventId, occurrenceDate } = this.resolveEventOccurrence(eventId);
    const event = await eventService.getEvent(actualEventId);

    let eventDate;
    if (occurrenceDate) {
      eventDate = occurrenceDate;
    } else if (event.isRecurring) {
      eventDate = event.occurrenceDate || event.date;
    } else {
      eventDate = event.date;
    }

    if (eventDate?.toDate) {
      eventDate = eventDate.toDate();
    } else if (typeof eventDate === 'string') {
      eventDate = new Date(eventDate);
    }

    const targetDateKey = this.getDateKey(eventDate);

    const snapshot = await db.collection('event_registrations')
      .where('eventId', '==', actualEventId)
      .where('userId', '==', DUMMY_USER_ID)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    if (snapshot.empty) {
      throw new NotFoundError('No dummy reservation found for this event occurrence');
    }

    const matchingRegistrations = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(registration => {
        const regDateValue = registration.date || registration.occurrenceDate;
        if (!regDateValue) {
          return false;
        }
        return this.getDateKey(regDateValue) === targetDateKey;
      })
      .sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return bDate - aDate;
      });

    if (matchingRegistrations.length === 0) {
      throw new NotFoundError('No dummy reservation found for this event occurrence');
    }

    const registrationToCancel = matchingRegistrations[0];

    await db.collection('event_registrations').doc(registrationToCancel.id).update({
      status: REGISTRATION_STATUS.CANCELLED,
      updatedAt: new Date(),
    });

    const dateKey = this.getRegistrationDateKey(registrationToCancel);
    await this.adjustOccurrenceCount(actualEventId, dateKey, -1);

    await cacheService.delPattern('events:*');

    return {
      ...registrationToCancel,
      status: REGISTRATION_STATUS.CANCELLED,
    };
  }

  async getRegistrationsForEventOccurrence(eventId) {
    const { actualEventId, occurrenceDate } = this.resolveEventOccurrence(eventId);
    const event = await eventService.getEvent(actualEventId);

    let eventDate;
    if (occurrenceDate) {
      eventDate = occurrenceDate;
    } else if (event.isRecurring) {
      eventDate = event.occurrenceDate || event.date;
    } else {
      eventDate = event.date;
    }

    const targetDateKey = this.getDateKey(eventDate);

    const matchesTargetDate = (registration) => {
      const regDateKey = registration.dateKey || this.getDateKey(registration.date || registration.occurrenceDate);
      return regDateKey === targetDateKey;
    };

    const [snapshot, manualSnapshot] = await Promise.all([
      db.collection('event_registrations')
        .where('eventId', '==', actualEventId)
        .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
        .get(),
      db.collection(MANUAL_REGISTRATIONS_COLLECTION)
        .where('eventId', '==', actualEventId)
        .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
        .get(),
    ]);

    const standardRegistrations = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(matchesTargetDate)
      .map((registration) => ({
        ...registration,
        isManual: false,
        displayName: null,
        manualRegistrationId: null,
      }));

    const manualRegistrations = manualSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(matchesTargetDate)
      .map((registration) => ({
        id: `${MANUAL_REGISTRATION_ID_PREFIX}${registration.id}`,
        manualRegistrationId: registration.id,
        userId: DUMMY_USER_ID,
        transactionId: DUMMY_TRANSACTION_ID,
        eventId: registration.eventId,
        occurrenceDate: registration.occurrenceDate || registration.date,
        date: registration.date || registration.occurrenceDate,
        registrationDate: registration.createdAt || registration.updatedAt || new Date(),
        status: registration.status,
        createdAt: registration.createdAt || registration.updatedAt || new Date(),
        isManual: true,
        displayName: registration.customerName || null,
      }));

    return [...standardRegistrations, ...manualRegistrations]
      .sort((a, b) => {
        const aDate = a.registrationDate?.toDate
          ? a.registrationDate.toDate()
          : new Date(a.registrationDate || a.createdAt);
        const bDate = b.registrationDate?.toDate
          ? b.registrationDate.toDate()
          : new Date(b.registrationDate || b.createdAt);
        return aDate - bDate;
      });
  }

  async cancelRegistrationAsAdmin(registrationId) {
    if (String(registrationId).startsWith(MANUAL_REGISTRATION_ID_PREFIX)) {
      const manualRegistrationId = String(registrationId).replace(MANUAL_REGISTRATION_ID_PREFIX, '');
      return this.cancelManualRegistrationAsAdmin(manualRegistrationId);
    }

    const registration = await this.getRegistrationById(registrationId);

    if (registration.status === REGISTRATION_STATUS.CANCELLED) {
      throw new ConflictError('Registration is already cancelled', 'registrationId');
    }

    await db.collection('event_registrations').doc(registrationId).update({
      status: REGISTRATION_STATUS.CANCELLED,
      updatedAt: new Date(),
    });

    const dateKey = this.getRegistrationDateKey(registration);
    await this.adjustOccurrenceCount(registration.eventId, dateKey, -1);

    // Refund only real transactions (dummy reservations have no real transaction to refund)
    if (
      registration.transactionId &&
      registration.transactionId !== DUMMY_TRANSACTION_ID
    ) {
      const transaction = await transactionService.getTransactionById(registration.transactionId);
      if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
        const newCount = Math.max(0, (transaction.entriesUsedThisMonth || 0) - 1);
        await transactionService.updateTransaction(registration.transactionId, {
          entriesUsedThisMonth: newCount,
        });
      } else if (transaction.transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
        const newRemaining = (transaction.entriesRemaining || 0) + 1;
        await transactionService.updateTransaction(registration.transactionId, {
          entriesRemaining: newRemaining,
          isActive: true,
        });
      }
    }

    if (registration.userId && registration.userId !== DUMMY_USER_ID) {
      await cacheService.invalidateUserCache(registration.userId);
    }
    await cacheService.delPattern('events:*');

    return {
      id: registrationId,
      ...registration,
      status: REGISTRATION_STATUS.CANCELLED,
    };
  }

  async cancelEventOccurrenceAsAdmin(eventId, reason, cancelledBy) {
    if (!reason || !String(reason).trim()) {
      throw new ValidationError('Cancellation reason is required', 'reason');
    }

    const { actualEventId, occurrenceDate } = this.resolveEventOccurrence(eventId);
    const event = await eventService.getEvent(actualEventId);

    if (!event.isActive) {
      throw new ValidationError('Event is not active', 'eventId');
    }

    // Determine the concrete date of this occurrence (recurring or one-time).
    let eventDate;
    if (occurrenceDate) {
      eventDate = occurrenceDate;
    } else if (event.isRecurring) {
      eventDate = event.occurrenceDate || event.date;
    } else {
      eventDate = event.date;
    }

    if (eventDate?.toDate) {
      eventDate = eventDate.toDate();
    } else if (typeof eventDate === 'string') {
      eventDate = new Date(eventDate);
    }

    const dateKey = this.getDateKey(eventDate);
    const now = new Date();
    const cancellationDocId = `${actualEventId}_${dateKey}`;

    // Upsert the cancellation override record.
    await db.collection('event_cancellations').doc(cancellationDocId).set(
      {
        eventId: actualEventId,
        dateKey,
        reason: String(reason).trim(),
        cancelledBy,
        cancelledAt: now,
        isActive: true,
      },
      { merge: true }
    );

    // Cancel all existing confirmed registrations for this occurrence and refund entries.
    const snapshot = await db
      .collection('event_registrations')
      .where('eventId', '==', actualEventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();
    const manualSnapshot = await db
      .collection(MANUAL_REGISTRATIONS_COLLECTION)
      .where('eventId', '==', actualEventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    const matchingRegistrations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((registration) => {
        const regDateValue = registration.occurrenceDate || registration.date;
        if (!regDateValue) return false;
        const regDate = regDateValue?.toDate ? regDateValue.toDate() : new Date(regDateValue);
        return this.getDateKey(regDate) === dateKey;
      });

    const matchingManualRegistrations = manualSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((registration) => {
        const regDateValue = registration.occurrenceDate || registration.date;
        if (!regDateValue) return false;
        const regDate = regDateValue?.toDate ? regDateValue.toDate() : new Date(regDateValue);
        return this.getDateKey(regDate) === dateKey;
      });

    const affectedUserIds = new Set();

    for (const registration of matchingRegistrations) {
      await db.collection('event_registrations').doc(registration.id).update({
        status: REGISTRATION_STATUS.CANCELLED,
        updatedAt: now,
      });

      if (registration.userId && registration.userId !== DUMMY_USER_ID) {
        affectedUserIds.add(registration.userId);
      }

      // Refund only real transactions (dummy reservations have no real transaction to refund)
      if (
        registration.transactionId &&
        registration.transactionId !== DUMMY_TRANSACTION_ID
      ) {
        const transaction = await transactionService.getTransactionById(registration.transactionId);
        if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
          const newCount = Math.max(0, (transaction.entriesUsedThisMonth || 0) - 1);
          await transactionService.updateTransaction(registration.transactionId, {
            entriesUsedThisMonth: newCount,
          });
        } else if (transaction.transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
          const newRemaining = (transaction.entriesRemaining || 0) + 1;
          await transactionService.updateTransaction(registration.transactionId, {
            entriesRemaining: newRemaining,
            isActive: true,
          });
        }
      }
    }

    for (const registration of matchingManualRegistrations) {
      await db.collection(MANUAL_REGISTRATIONS_COLLECTION).doc(registration.id).update({
        status: REGISTRATION_STATUS.CANCELLED,
        updatedAt: now,
      });
    }

    await this.setOccurrenceCount(actualEventId, dateKey, 0);

    // Invalidate caches so the UI reflects cancellation.
    for (const userId of affectedUserIds) {
      await cacheService.invalidateUserCache(userId);
    }
    await cacheService.delPattern('events:*');

    return {
      id: cancellationDocId,
      eventId: actualEventId,
      dateKey,
      reason: String(reason).trim(),
      cancelledBy,
      cancelledAt: now.toISOString(),
    };
  }

  async reenableEventOccurrenceAsAdmin(eventId, cancelledBy) {
    const { actualEventId, occurrenceDate } = this.resolveEventOccurrence(eventId);
    const event = await eventService.getEvent(actualEventId);

    if (!event.isActive) {
      throw new ValidationError('Event is not active', 'eventId');
    }

    // Determine the concrete date of this occurrence (recurring or one-time).
    let eventDate;
    if (occurrenceDate) {
      eventDate = occurrenceDate;
    } else if (event.isRecurring) {
      eventDate = event.occurrenceDate || event.date;
    } else {
      eventDate = event.date;
    }

    if (eventDate?.toDate) {
      eventDate = eventDate.toDate();
    } else if (typeof eventDate === 'string') {
      eventDate = new Date(eventDate);
    }

    const dateKey = this.getDateKey(eventDate);
    const now = new Date();
    const cancellationDocId = `${actualEventId}_${dateKey}`;
    const cancellationRef = db.collection('event_cancellations').doc(cancellationDocId);
    const cancellationDoc = await cancellationRef.get();

    if (!cancellationDoc.exists) {
      throw new NotFoundError('This event occurrence is not cancelled', 'eventId');
    }

    // Disable cancellation override, which re-enables the occurrence.
    await cancellationRef.set(
      {
        isActive: false,
        cancelledBy: cancellationDoc.data()?.cancelledBy || cancelledBy,
        updatedAt: now,
      },
      { merge: true }
    );

    // Clear list of registered users for this occurrence:
    // cancel confirmed registrations without refund (refund already happened on cancel).
    const snapshot = await db
      .collection('event_registrations')
      .where('eventId', '==', actualEventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();
    const manualSnapshot = await db
      .collection(MANUAL_REGISTRATIONS_COLLECTION)
      .where('eventId', '==', actualEventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    const matchingRegistrations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((registration) => {
        const regDateValue = registration.occurrenceDate || registration.date;
        if (!regDateValue) return false;
        const regDate = regDateValue?.toDate ? regDateValue.toDate() : new Date(regDateValue);
        return this.getDateKey(regDate) === dateKey;
      });

    const matchingManualRegistrations = manualSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((registration) => {
        const regDateValue = registration.occurrenceDate || registration.date;
        if (!regDateValue) return false;
        const regDate = regDateValue?.toDate ? regDateValue.toDate() : new Date(regDateValue);
        return this.getDateKey(regDate) === dateKey;
      });

    const affectedUserIds = new Set();

    for (const registration of matchingRegistrations) {
      await db.collection('event_registrations').doc(registration.id).update({
        status: REGISTRATION_STATUS.CANCELLED,
        updatedAt: now,
      });
      if (registration.userId && registration.userId !== DUMMY_USER_ID) {
        affectedUserIds.add(registration.userId);
      }
    }

    for (const registration of matchingManualRegistrations) {
      await db.collection(MANUAL_REGISTRATIONS_COLLECTION).doc(registration.id).update({
        status: REGISTRATION_STATUS.CANCELLED,
        updatedAt: now,
      });
    }

    await this.setOccurrenceCount(actualEventId, dateKey, 0);

    for (const userId of affectedUserIds) {
      await cacheService.invalidateUserCache(userId);
    }
    await cacheService.delPattern('events:*');

    return {
      id: cancellationDocId,
      ...(cancellationDoc.data() || {}),
      isActive: false,
      cancelledBy: cancelledBy,
      updatedAt: now.toISOString(),
    };
  }

  async cancelRegistration(registrationId, userId) {
    const registration = await this.getRegistrationById(registrationId);

    if (registration.userId !== userId) {
      throw new ValidationError('Cannot cancel another user\'s registration', 'registrationId');
    }

    if (registration.status === REGISTRATION_STATUS.CANCELLED) {
      throw new ConflictError('Registration is already cancelled', 'registrationId');
    }

    // Check 5-hour cancellation restriction
    // Get event to calculate start time
    const event = await eventService.getEvent(registration.eventId);
    const occurrenceDate = registration.occurrenceDate || registration.date;
    const eventDate = occurrenceDate?.toDate ? occurrenceDate.toDate() : new Date(occurrenceDate);
    
    // Parse start time (HH:mm format)
    const [hours, minutes] = event.startTime.split(':').map(Number);
    const eventStartTime = new Date(eventDate);
    eventStartTime.setHours(hours, minutes, 0, 0);
    
    // Calculate time difference in milliseconds
    const now = new Date();
    const timeDifference = eventStartTime.getTime() - now.getTime();
    const hoursUntilEvent = timeDifference / (1000 * 60 * 60);
    
    // Check if less than 5 hours before event
    if (hoursUntilEvent < 5) {
      throw new ValidationError(
        'לא ניתן לבטל רישום פחות מ-5 שעות לפני תחילת השיעור',
        'registrationId'
      );
    }

    // Update registration status
    await db.collection('event_registrations').doc(registrationId).update({
      status: REGISTRATION_STATUS.CANCELLED,
      updatedAt: new Date(),
    });

    const dateKey = this.getRegistrationDateKey(registration);
    await this.adjustOccurrenceCount(registration.eventId, dateKey, -1);

    // Note: registeredCount is now calculated on-the-fly from registrations
    // No need to update the base event's registeredCount field

    // Refund entry if applicable (subscription or punch card)
    if (registration.transactionId) {
      const transaction = await transactionService.getTransactionById(registration.transactionId);
      if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
        const newCount = Math.max(0, (transaction.entriesUsedThisMonth || 0) - 1);
        await transactionService.updateTransaction(registration.transactionId, {
          entriesUsedThisMonth: newCount,
        });
      } else if (transaction.transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
        // Reactivate punch card if it was deactivated and add back the entry
        const newRemaining = (transaction.entriesRemaining || 0) + 1;
        await transactionService.updateTransaction(registration.transactionId, {
          entriesRemaining: newRemaining,
          isActive: true, // Reactivate if it was deactivated
        });
      }
    }

    // Invalidate cache
    await cacheService.invalidateUserCache(userId);
    await cacheService.delPattern('events:*');

    return { id: registrationId, ...registration, status: REGISTRATION_STATUS.CANCELLED };
  }

  async getUserRegistrations(userId, futureOnly = true) {
    const cacheKey = cacheService.getUserRegistrationsKey(userId);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // "myRegistrations" should return active registrations only.
    const snapshot = await db.collection('event_registrations')
      .where('userId', '==', userId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    let registrations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (futureOnly) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      registrations = registrations.filter(reg => {
        const regDate = reg.occurrenceDate?.toDate
          ? reg.occurrenceDate.toDate()
          : new Date(reg.occurrenceDate || reg.registrationDate);
        const regDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
        return regDay >= todayStart;
      });
    }

    await cacheService.set(cacheKey, registrations, CACHE_TTL.REGISTRATIONS_FUTURE);
    return registrations;
  }

  async getRegistrationById(registrationId) {
    const doc = await db.collection('event_registrations').doc(registrationId).get();
    if (!doc.exists) {
      throw new NotFoundError('Registration not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  async getUserRegistrationForEvent(userId, eventId, occurrenceDate = null) {
    let query = db.collection('event_registrations')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return null;
    }

    // If occurrenceDate is provided (for recurring events), filter by date
    if (occurrenceDate) {
      // Normalize target date to YYYY-MM-DD format (UTC, no time component)
      const targetDate = occurrenceDate?.toDate ? occurrenceDate.toDate() : new Date(occurrenceDate);
      // Set to UTC midnight to avoid timezone issues
      const targetDateUTC = new Date(Date.UTC(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      ));
      const targetDateKey = targetDateUTC.toISOString().split('T')[0];
      
      const matchingReg = snapshot.docs.find(doc => {
        const reg = doc.data();
        // Try date field first, then occurrenceDate
        const regDateValue = reg.date || reg.occurrenceDate;
        if (!regDateValue) return false;
        
        const regDate = regDateValue?.toDate ? regDateValue.toDate() : new Date(regDateValue);
        // Set to UTC midnight to avoid timezone issues
        const regDateUTC = new Date(Date.UTC(
          regDate.getFullYear(),
          regDate.getMonth(),
          regDate.getDate()
        ));
        const regDateKey = regDateUTC.toISOString().split('T')[0];
        return regDateKey === targetDateKey;
      });

      if (matchingReg) {
        return { id: matchingReg.id, ...matchingReg.data() };
      }
      return null;
    }

    // For non-recurring events, return the first match
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  async validateRegistrationEligibility(userId, eventId, activeTransactions = null) {
    const event = await eventService.getEvent(eventId);

    if (!event.isActive) {
      throw new ValidationError('Event is not active', 'eventId');
    }

    if (!(await eventService.checkEventCapacity(eventId))) {
      throw new ConflictError('Event is at full capacity', 'eventId');
    }

    // Use provided transactions or fetch them
    const transactions = activeTransactions || 
      await transactionService.getUserActiveTransactions(userId);

    if (event.eventType === EVENT_TYPES.TRIAL) {
      const hasTrial = transactions.some(
        t => t.transactionType === TRANSACTION_TYPES.TRIAL_LESSON && t.isActive
      );
      if (!hasTrial) {
        throw new ValidationError('Trial lesson transaction required', 'transactionId');
      }
    } else if (event.eventType === EVENT_TYPES.SUBSCRIPTION_ONLY) {
      const subscription = transactions.find(
        t => t.transactionType === TRANSACTION_TYPES.SUBSCRIPTION && t.isActive
      );
      if (!subscription) {
        throw new ValidationError('Active subscription required', 'transactionId');
      }
      const hasCapacity = subscription.entriesUsedThisMonth < subscription.monthlyEntries;
      if (!hasCapacity) {
        throw new ConflictError('Subscription monthly entry limit reached', 'transactionId');
      }
    }

    return true;
  }

  /**
   * Read occurrence registration counts from counter docs.
   * occurrenceKeys: [{ eventId, dateKey }]
   * Returns map: { "eventId:dateKey": count }
   */
  async countRegistrationsByEventAndDate(occurrenceKeys) {
    if (!occurrenceKeys || occurrenceKeys.length === 0) {
      return {};
    }

    const uniqueKeys = [];
    const seen = new Set();
    for (const key of occurrenceKeys) {
      if (!key?.eventId || !key?.dateKey) {
        continue;
      }
      const mapKey = `${key.eventId}:${key.dateKey}`;
      if (!seen.has(mapKey)) {
        seen.add(mapKey);
        uniqueKeys.push({ eventId: key.eventId, dateKey: key.dateKey });
      }
    }

    if (uniqueKeys.length === 0) {
      return {};
    }

    const counts = {};
    const missingKeys = [];

    for (let i = 0; i < uniqueKeys.length; i += 100) {
      const chunkKeys = uniqueKeys.slice(i, i + 100);
      const chunkRefs = chunkKeys.map(({ eventId, dateKey }) =>
        db.collection(OCCURRENCE_COUNTS_COLLECTION).doc(this.getOccurrenceCountDocId(eventId, dateKey))
      );
      const snapshots = await db.getAll(...chunkRefs);

      snapshots.forEach((doc, idx) => {
        const { eventId, dateKey } = chunkKeys[idx];
        const mapKey = `${eventId}:${dateKey}`;
        if (doc.exists) {
          counts[mapKey] = doc.data().count || 0;
        } else {
          counts[mapKey] = null;
          missingKeys.push({ eventId, dateKey });
        }
      });
    }

    if (missingKeys.length > 0) {
      await Promise.all(
        missingKeys.map(async ({ eventId, dateKey }) => {
          const fallbackCount = await this.countRegistrationsForOccurrenceFallback(eventId, dateKey);
          const mapKey = `${eventId}:${dateKey}`;
          counts[mapKey] = fallbackCount;
          await this.setOccurrenceCount(eventId, dateKey, fallbackCount);
        })
      );
    }

    return counts;
  }
}

export default new RegistrationService();

