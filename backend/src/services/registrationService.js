import { db } from '../config/firebase.js';
import { EVENT_TYPES, TRANSACTION_TYPES, REGISTRATION_STATUS } from '../config/constants.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import eventService from './eventService.js';
import transactionService from './transactionService.js';
import cacheService from './cacheService.js';

const DUMMY_USER_ID = 'DummyUser';
const DUMMY_TRANSACTION_ID = 'DUMMY_RESERVATION';

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
    const dateObj = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    return dateObj.toISOString().split('T')[0];
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

    // Check capacity for this specific date (use actualEventId - the base event ID)
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
      registrationDate: now,
      status: REGISTRATION_STATUS.CONFIRMED,
      createdAt: now,
    };

    const docRef = await db.collection('event_registrations').add(registrationDoc);

    // Note: registeredCount is now calculated on-the-fly from registrations
    // No need to update the base event's registeredCount field

    // Update transaction - use subscription entry or punch card entry
    if (transactionId) {
      const transaction = await transactionService.getTransactionById(transactionId);
      if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
        await transactionService.useSubscriptionEntry(transactionId);
      } else if (transaction.transactionType === TRANSACTION_TYPES.PUNCH_CARD) {
        await transactionService.usePunchCardEntry(transactionId);
      }
    }

    // Invalidate cache
    await cacheService.invalidateUserCache(userId);
    await cacheService.delPattern('events:*');

    return { id: docRef.id, ...registrationDoc };
  }

  async reserveSpotForDummyUser(eventId) {
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

    if (!(await eventService.checkEventCapacity(actualEventId, eventDate))) {
      throw new ConflictError('Event is at full capacity', 'eventId');
    }

    const now = new Date();
    const eventDateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);

    const registrationDoc = {
      userId: DUMMY_USER_ID,
      transactionId: DUMMY_TRANSACTION_ID,
      eventId: actualEventId,
      occurrenceDate: eventDateObj,
      date: eventDateObj,
      registrationDate: now,
      status: REGISTRATION_STATUS.CONFIRMED,
      createdAt: now,
    };

    const docRef = await db.collection('event_registrations').add(registrationDoc);

    await cacheService.delPattern('events:*');

    return { id: docRef.id, ...registrationDoc };
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

    const snapshot = await db.collection('event_registrations')
      .where('eventId', '==', actualEventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(registration => {
        const regDateValue = registration.date || registration.occurrenceDate;
        if (!regDateValue) {
          return false;
        }
        return this.getDateKey(regDateValue) === targetDateKey;
      })
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
    const registration = await this.getRegistrationById(registrationId);

    if (registration.status === REGISTRATION_STATUS.CANCELLED) {
      throw new ConflictError('Registration is already cancelled', 'registrationId');
    }

    await db.collection('event_registrations').doc(registrationId).update({
      status: REGISTRATION_STATUS.CANCELLED,
      updatedAt: new Date(),
    });

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

    const matchingRegistrations = snapshot.docs
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

    const matchingRegistrations = snapshot.docs
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
    // Avoid Firestore `in` queries (they can require composite indexes).
    // We merge two equality queries instead.
    const [confirmedSnapshot, cancelledSnapshot] = await Promise.all([
      db.collection('event_registrations')
        .where('userId', '==', userId)
        .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
        .get(),
      db.collection('event_registrations')
        .where('userId', '==', userId)
        .where('status', '==', REGISTRATION_STATUS.CANCELLED)
        .get(),
    ]);

    let registrations = [...confirmedSnapshot.docs, ...cancelledSnapshot.docs].map((doc) => ({
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
   * Count registrations for events by eventId and date
   * Returns a map: { "eventId:date": count }
   */
  async countRegistrationsByEventAndDate(eventIds, dates) {
    if (!eventIds || eventIds.length === 0) {
      return {};
    }

    console.log('[COUNT REGISTRATIONS] 📊 Counting registrations for eventIds:', eventIds);

    // Get all registrations for these events
    const snapshot = await db.collection('event_registrations')
      .where('eventId', 'in', eventIds)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    console.log('[COUNT REGISTRATIONS] 📊 Found registrations:', snapshot.size);

    const counts = {};

    snapshot.docs.forEach(doc => {
      const reg = doc.data();
      // Use occurrenceDate as primary field (it identifies the specific event occurrence)
      const dateField = reg.occurrenceDate || reg.date;
      const regDate = dateField?.toDate ? dateField.toDate() : new Date(dateField);

      // Format date as YYYY-MM-DD for consistent grouping
      const dateKey = regDate.toISOString().split('T')[0];
      const key = `${reg.eventId}:${dateKey}`;

      console.log('[COUNT REGISTRATIONS] ✅ Registration found:', {
        eventId: reg.eventId,
        userId: reg.userId,
        dateKey,
        key,
        rawDate: reg.date,
        occurrenceDate: reg.occurrenceDate,
        usedField: reg.occurrenceDate ? 'occurrenceDate' : 'date'
      });

      counts[key] = (counts[key] || 0) + 1;
    });

    console.log('[COUNT REGISTRATIONS] 📊 Final counts:', counts);
    return counts;
  }
}

export default new RegistrationService();

