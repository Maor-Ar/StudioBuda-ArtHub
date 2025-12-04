import { db } from '../config/firebase.js';
import { EVENT_TYPES, TRANSACTION_TYPES, REGISTRATION_STATUS } from '../config/constants.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import eventService from './eventService.js';
import transactionService from './transactionService.js';
import cacheService from './cacheService.js';

class RegistrationService {
  async registerForEvent(userId, eventId, transactionData = null) {
    // Get event
    const event = await eventService.getEvent(eventId);

    if (!event.isActive) {
      throw new ValidationError('Event is not active', 'eventId');
    }

    // Check capacity
    if (!(await eventService.checkEventCapacity(eventId))) {
      throw new ConflictError('Event is at full capacity', 'eventId');
    }

    // Check if already registered
    const existingRegistration = await this.getUserRegistrationForEvent(userId, eventId);
    if (existingRegistration && existingRegistration.status === REGISTRATION_STATUS.CONFIRMED) {
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
      // Subscription only requires active subscription with available entries
      const transactions = await transactionService.getUserActiveTransactions(userId);
      const subscription = transactions.find(
        t => t.transactionType === TRANSACTION_TYPES.SUBSCRIPTION && t.isActive
      );

      if (!subscription) {
        throw new ValidationError(
          'Active subscription transaction required',
          'transactionId'
        );
      }

      const hasCapacity = await transactionService.checkSubscriptionLimit(subscription.id);
      if (!hasCapacity) {
        throw new ConflictError('Subscription monthly entry limit reached', 'transactionId');
      }

      transactionId = subscription.id;
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
    const registrationDoc = {
      userId,
      transactionId,
      eventId,
      occurrenceDate: event.isRecurring ? (event.occurrenceDate || event.date) : event.date,
      registrationDate: now,
      status: REGISTRATION_STATUS.CONFIRMED,
      createdAt: now,
    };

    const docRef = await db.collection('event_registrations').add(registrationDoc);

    // Update event registeredCount
    await db.collection('events').doc(eventId).update({
      registeredCount: event.registeredCount + 1,
      registeredUsers: [...(event.registeredUsers || []), userId],
    });

    // Update transaction if subscription
    if (transactionId) {
      const transaction = await transactionService.getTransactionById(transactionId);
      if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
        await transactionService.useSubscriptionEntry(transactionId);
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

    // Update registration status
    await db.collection('event_registrations').doc(registrationId).update({
      status: REGISTRATION_STATUS.CANCELLED,
      updatedAt: new Date(),
    });

    // Update event registeredCount
    const event = await eventService.getEvent(registration.eventId);
    await db.collection('events').doc(registration.eventId).update({
      registeredCount: Math.max(0, event.registeredCount - 1),
      registeredUsers: (event.registeredUsers || []).filter(id => id !== userId),
    });

    // Refund subscription entry if applicable
    if (registration.transactionId) {
      const transaction = await transactionService.getTransactionById(registration.transactionId);
      if (transaction.transactionType === TRANSACTION_TYPES.SUBSCRIPTION) {
        const newCount = Math.max(0, (transaction.entriesUsedThisMonth || 0) - 1);
        await transactionService.updateTransaction(registration.transactionId, {
          entriesUsedThisMonth: newCount,
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

  async getUserRegistrationForEvent(userId, eventId) {
    const snapshot = await db.collection('event_registrations')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

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
}

export default new RegistrationService();

