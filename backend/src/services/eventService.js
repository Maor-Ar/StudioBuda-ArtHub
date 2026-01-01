import { db } from '../config/firebase.js';
import { EVENT_TYPES, REGISTRATION_STATUS } from '../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  validateEventType,
  validateTime,
  validatePositiveNumber,
  validateDate,
} from '../utils/validators.js';
import { generateRecurringInstances, validateDateRange } from '../utils/helpers.js';
import cacheService from './cacheService.js';

class EventService {
  async createEvent(eventData, managerId) {
    const {
      date,
      startTime,
      duration,
      title,
      description,
      isRecurring,
      recurringIntervalDays,
      instructorName,
      maxRegistrations,
      eventType,
      price,
    } = eventData;

    // Validate inputs
    validateDate(date, 'date');
    validateTime(startTime);
    validatePositiveNumber(duration, 'duration');
    validatePositiveNumber(maxRegistrations, 'maxRegistrations');
    validateEventType(eventType);

    if (eventType === EVENT_TYPES.PAID_WORKSHOP && (!price || price <= 0)) {
      throw new ValidationError('Price is required for paid workshops', 'price');
    }

    if (isRecurring) {
      if (!recurringIntervalDays || recurringIntervalDays <= 0) {
        throw new ValidationError(
          'recurringIntervalDays is required and must be positive for recurring events',
          'recurringIntervalDays'
        );
      }
      validatePositiveNumber(recurringIntervalDays, 'recurringIntervalDays');
    }

    const eventDoc = {
      date: typeof date === 'string' ? new Date(date) : date,
      startTime,
      duration,
      title,
      description,
      isRecurring: isRecurring || false,
      recurringIntervalDays: isRecurring ? recurringIntervalDays : null,
      instructorName,
      maxRegistrations,
      eventType,
      price: eventType === EVENT_TYPES.PAID_WORKSHOP ? price : null,
      isActive: true,
      // Note: registeredCount is calculated on-the-fly from registrations
      registeredUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: managerId,
    };

    const docRef = await db.collection('events').add(eventDoc);

    // Invalidate cache
    await cacheService.delPattern('events:*');

    return { id: docRef.id, ...eventDoc };
  }

  async updateEvent(eventId, eventData, managerId) {
    const event = await this.getEvent(eventId);

    // Validate updates
    if (eventData.date) {
      validateDate(eventData.date, 'date');
    }
    if (eventData.startTime) {
      validateTime(eventData.startTime);
    }
    if (eventData.duration) {
      validatePositiveNumber(eventData.duration, 'duration');
    }
    if (eventData.maxRegistrations) {
      validatePositiveNumber(eventData.maxRegistrations, 'maxRegistrations');
    }
    if (eventData.eventType) {
      validateEventType(eventData.eventType);
    }

    const updateData = {
      ...eventData,
      updatedAt: new Date(),
    };

    if (eventData.date) {
      updateData.date = typeof eventData.date === 'string' 
        ? new Date(eventData.date) 
        : eventData.date;
    }

    await db.collection('events').doc(eventId).update(updateData);

    // Invalidate cache
    await cacheService.delPattern('events:*');
    await cacheService.del(cacheService.getEventKey(eventId));

    return this.getEvent(eventId);
  }

  async deleteEvent(eventId, managerId) {
    return await this.updateEvent(eventId, { isActive: false }, managerId);
  }

  async getEvent(eventId) {
    const cacheKey = cacheService.getEventKey(eventId);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const doc = await db.collection('events').doc(eventId).get();
    if (!doc.exists) {
      throw new NotFoundError('Event not found');
    }

    const eventData = { id: doc.id, ...doc.data() };
    await cacheService.set(cacheKey, eventData, 1800); // 30 minutes TTL

    return eventData;
  }

  async getEvents(filters = {}, dateRange = null) {
    let query = db.collection('events').where('isActive', '==', true);

    // Apply filters
    if (filters.eventType) {
      query = query.where('eventType', '==', filters.eventType);
    }

    const snapshot = await query.get();
    let events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If date range provided, filter and generate recurring instances
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      validateDateRange(
        new Date(dateRange.startDate),
        new Date(dateRange.endDate)
      );

      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      const filteredEvents = [];

      for (const event of events) {
        if (event.isRecurring) {
          // Generate recurring instances
          const instances = generateRecurringInstances(event, startDate, endDate);
          filteredEvents.push(...instances);
        } else {
          // Check if one-time event falls within range
          const eventDate = event.date.toDate();
          if (eventDate >= startDate && eventDate <= endDate) {
            filteredEvents.push(event);
          }
        }
      }

      events = filteredEvents;
    }

    // Sort by date
    events.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });

    return events;
  }

  async checkEventCapacity(eventId, occurrenceDate = null) {
    const event = await this.getEvent(eventId);
    
    // Calculate registeredCount on-the-fly for the specific date
    const eventDate = occurrenceDate || event.date;
    const dateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
    const dateKey = dateObj.toISOString().split('T')[0];
    
    // Count confirmed registrations for this event and date
    const snapshot = await db.collection('event_registrations')
      .where('eventId', '==', eventId)
      .where('status', '==', REGISTRATION_STATUS.CONFIRMED)
      .get();
    
    let count = 0;
    snapshot.docs.forEach(doc => {
      const reg = doc.data();
      const regDate = reg.date?.toDate ? reg.date.toDate() : new Date(reg.date || reg.occurrenceDate);
      const regDateKey = regDate.toISOString().split('T')[0];
      if (regDateKey === dateKey) {
        count++;
      }
    });
    
    return count < event.maxRegistrations;
  }
}

export default new EventService();

