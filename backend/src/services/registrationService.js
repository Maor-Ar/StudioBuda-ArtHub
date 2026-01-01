import { db } from '../config/firebase.js';
import { EVENT_TYPES, TRANSACTION_TYPES, REGISTRATION_STATUS } from '../config/constants.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import eventService from './eventService.js';
import transactionService from './transactionService.js';
import cacheService from './cacheService.js';

class RegistrationService {
  async registerForEvent(userId, eventId, transactionData = null) {
    // Check if eventId is a virtual instance ID (format: baseEventId_YYYY-MM-DD)
    // Virtual instances are generated on-the-fly for recurring events
    let actualEventId = eventId;
    let occurrenceDate = null;
    
    if (eventId.includes('_')) {
      // This is a virtual instance ID - extract baseEventId and date
      const parts = eventId.split('_');
      if (parts.length >= 2) {
        // Last part should be the date (YYYY-MM-DD)
        const datePart = parts[parts.length - 1];
        // Everything before the last underscore is the baseEventId
        actualEventId = parts.slice(0, -1).join('_');
        
        // Parse the date
        try {
          occurrenceDate = new Date(datePart + 'T00:00:00');
          if (isNaN(occurrenceDate.getTime())) {
            // If date parsing fails, treat as regular eventId
            actualEventId = eventId;
            occurrenceDate = null;
          }
        } catch (error) {
          // If date parsing fails, treat as regular eventId
          actualEventId = eventId;
          occurrenceDate = null;
        }
      }
    }
    
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
      // Subscription only: try subscription first, then punch card
      const transactions = await transactionService.getUserActiveTransactions(userId);
      
      // Try subscription first
      const subscription = transactions.find(
        t => t.transactionType === TRANSACTION_TYPES.SUBSCRIPTION && t.isActive
      );

      if (subscription) {
        const hasCapacity = await transactionService.checkSubscriptionLimit(subscription.id);
        if (hasCapacity) {
          transactionId = subscription.id;
        }
      }

      // If no subscription or subscription is at limit, try punch card
      if (!transactionId) {
        const punchCard = transactions.find(
          t => t.transactionType === TRANSACTION_TYPES.PUNCH_CARD && 
               t.isActive && 
               t.entriesRemaining > 0
        );

        if (punchCard) {
          transactionId = punchCard.id;
        } else {
          // Neither subscription nor punch card available
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
    let query = db.collection('event_registrations')
      .where('userId', '==', userId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED);

    const snapshot = await query.get();
    let registrations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (futureOnly) {
      const now = new Date();
      registrations = registrations.filter(reg => {
        const regDate = reg.occurrenceDate?.toDate 
          ? reg.occurrenceDate.toDate() 
          : new Date(reg.occurrenceDate || reg.registrationDate);
        return regDate >= now;
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

    // Get all registrations for these events
    const snapshot = await db.collection('event_registrations')
      .where('eventId', 'in', eventIds)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();

    const counts = {};
    
    snapshot.docs.forEach(doc => {
      const reg = doc.data();
      const regDate = reg.date?.toDate ? reg.date.toDate() : new Date(reg.date || reg.occurrenceDate);
      
      // Format date as YYYY-MM-DD for consistent grouping
      const dateKey = regDate.toISOString().split('T')[0];
      const key = `${reg.eventId}:${dateKey}`;
      
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }
}

export default new RegistrationService();

