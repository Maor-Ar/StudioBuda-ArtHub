import { db } from '../config/firebase.js';
import { EVENT_TYPES, CACHE_TTL } from '../config/constants.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  validateEventType,
  validateTime,
  validatePositiveNumber,
  validateDate,
} from '../utils/validators.js';
import {
  generateRecurringInstances,
  parseEventOccurrenceId,
  shouldSplitRecurringSeries,
  subtractOneUtcDayKey,
  toUtcDateKey,
  validateDateRange,
} from '../utils/helpers.js';
import { sanitizeOverridePatch, validateOverridePatch } from '../utils/occurrenceOverrides.js';
import cacheService from './cacheService.js';
import occurrenceOverrideService from './occurrenceOverrideService.js';

const toTimestampDate = (value) => (typeof value === 'string' ? new Date(value) : value);

const EDIT_SCOPES = {
  THIS_OCCURRENCE: 'THIS_OCCURRENCE',
  THIS_AND_FUTURE: 'THIS_AND_FUTURE',
  ALL: 'ALL',
};

class EventService {
  parseRecurrenceEndDate(value) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    validateDate(value, 'recurrenceEndDate');
    const date = toTimestampDate(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  assertRecurrenceEndDate(startDate, recurrenceEndDate) {
    if (!recurrenceEndDate) return;
    const startKey = toUtcDateKey(startDate);
    const endKey = toUtcDateKey(recurrenceEndDate);
    if (startKey && endKey && endKey < startKey) {
      throw new ValidationError('recurrenceEndDate must be on or after the event date', 'recurrenceEndDate');
    }
  }

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
      recurrenceEndDate,
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

    const parsedEndDate = this.parseRecurrenceEndDate(recurrenceEndDate);
    const eventDate = toTimestampDate(date);
    this.assertRecurrenceEndDate(eventDate, parsedEndDate);

    const eventDoc = {
      date: eventDate,
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
      recurrenceEndDate: isRecurring ? (parsedEndDate ?? null) : null,
    };

    const docRef = await db.collection('events').add(eventDoc);

    // Invalidate cache
    await cacheService.delPattern('events:*');

    return { id: docRef.id, ...eventDoc };
  }

  async updateEvent(eventId, eventData, managerId) {
    const { actualEventId } = parseEventOccurrenceId(eventId);
    const event = await this.getEvent(actualEventId);

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
      updateData.date = toTimestampDate(eventData.date);
    }

    if (Object.prototype.hasOwnProperty.call(eventData, 'recurrenceEndDate')) {
      updateData.recurrenceEndDate = this.parseRecurrenceEndDate(eventData.recurrenceEndDate);
    }

    const nextDate = updateData.date || event.date;
    const nextEndDate = Object.prototype.hasOwnProperty.call(updateData, 'recurrenceEndDate')
      ? updateData.recurrenceEndDate
      : event.recurrenceEndDate;
    this.assertRecurrenceEndDate(nextDate, nextEndDate);

    await db.collection('events').doc(actualEventId).update(updateData);

    // Invalidate cache
    await cacheService.delPattern('events:*');
    await cacheService.del(cacheService.getEventKey(actualEventId));

    return this.getEvent(actualEventId);
  }

  async deleteEvent(eventId, managerId) {
    return await this.updateEvent(eventId, { isActive: false }, managerId);
  }

  async getEvent(eventId) {
    const { actualEventId } = parseEventOccurrenceId(eventId);
    const cacheKey = cacheService.getEventKey(actualEventId);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const doc = await db.collection('events').doc(actualEventId).get();
    if (!doc.exists) {
      throw new NotFoundError('Event not found');
    }

    const eventData = { id: doc.id, ...doc.data() };
    await cacheService.set(cacheKey, eventData, 1800); // 30 minutes TTL

    return eventData;
  }

  async getEvents(filters = {}, dateRange = null) {
    const filtersKey = filters?.eventType ? `:type:${filters.eventType}` : '';
    const rangeKey = dateRange?.startDate && dateRange?.endDate
      ? `${dateRange.startDate}_${dateRange.endDate}`
      : 'all';
    const cacheKey = cacheService.getEventsKey(`${rangeKey}${filtersKey}`);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

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
          const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
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

    await cacheService.set(cacheKey, events, CACHE_TTL.EVENTS_ACTIVE);
    return events;
  }

  async getEventsByIds(eventIds) {
    const map = new Map();
    if (!eventIds?.length) {
      return map;
    }

    const uniqueIds = [...new Set(eventIds)];
    await Promise.all(
      uniqueIds.map(async (eventId) => {
        try {
          const event = await this.getEvent(eventId);
          map.set(eventId, event);
        } catch {
          // Skip missing events
        }
      })
    );

    return map;
  }

  async checkEventCapacity(eventId, occurrenceDate = null) {
    const { actualEventId } = parseEventOccurrenceId(eventId);
    const event = await this.getEvent(actualEventId);

    const eventDate = occurrenceDate || event.date;
    const dateKey = toUtcDateKey(eventDate);
    const overrideDoc = await occurrenceOverrideService.getForOccurrence(actualEventId, dateKey);
    const resolvedEvent = occurrenceOverrideService.applyToEvent(event, overrideDoc);

    const registrationService = (await import('./registrationService.js')).default;
    const count = await registrationService.getOccurrenceCount(actualEventId, dateKey);

    return count < resolvedEvent.maxRegistrations;
  }

  async resolveOccurrence(eventId) {
    const { actualEventId, occurrenceDate, dateKey } = parseEventOccurrenceId(eventId);
    const event = await this.getEvent(actualEventId);
    const fallbackDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    const instanceDate = occurrenceDate || fallbackDate;
    const resolvedDateKey = dateKey || toUtcDateKey(instanceDate);
    const overrideDoc = await occurrenceOverrideService.getForOccurrence(actualEventId, resolvedDateKey);
    const resolved = occurrenceOverrideService.applyToEvent(event, overrideDoc);

    if (event.isRecurring || occurrenceDate) {
      return {
        ...resolved,
        id: `${actualEventId}_${resolvedDateKey}`,
        date: instanceDate,
        occurrenceDate: instanceDate,
        isInstance: true,
        baseEventId: actualEventId,
      };
    }

    return {
      ...resolved,
      id: actualEventId,
      isInstance: false,
      baseEventId: null,
    };
  }

  async commitInChunks(operations, chunkSize = 450) {
    for (let i = 0; i < operations.length; i += chunkSize) {
      const batch = db.batch();
      operations.slice(i, i + chunkSize).forEach((apply) => apply(batch));
      await batch.commit();
    }
  }

  async splitRecurringEventFrom(baseEventId, splitDateKey, changes, adminId) {
    const event = await this.getEvent(baseEventId);
    const patch = sanitizeOverridePatch(changes);
    validateOverridePatch(patch);

    if (!event.isRecurring || !shouldSplitRecurringSeries(event, splitDateKey)) {
      return this.updateEvent(baseEventId, patch, adminId);
    }

    const existingEndKey = toUtcDateKey(event.recurrenceEndDate);
    if (existingEndKey && splitDateKey > existingEndKey) {
      throw new ValidationError('Cannot split after the recurrence end date', 'eventId');
    }

    const splitDate = new Date(`${splitDateKey}T00:00:00.000Z`);
    const previousDateKey = subtractOneUtcDayKey(splitDateKey);
    const previousDate = new Date(`${previousDateKey}T00:00:00.000Z`);

    const newEventDoc = {
      date: splitDate,
      startTime: patch.startTime ?? event.startTime,
      duration: patch.duration ?? event.duration,
      title: patch.title ?? event.title,
      description: patch.description ?? event.description,
      isRecurring: true,
      recurringIntervalDays: event.recurringIntervalDays,
      instructorName: patch.instructorName ?? event.instructorName,
      maxRegistrations: patch.maxRegistrations ?? event.maxRegistrations,
      eventType: event.eventType,
      price: event.price ?? null,
      isActive: true,
      registeredUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
      recurrenceEndDate: event.recurrenceEndDate ?? null,
      splitFromEventId: event.id,
    };

    const newRef = await db.collection('events').add(newEventDoc);

    await db.collection('events').doc(event.id).update({
      recurrenceEndDate: previousDate,
      updatedAt: new Date(),
    });

    const registrationService = (await import('./registrationService.js')).default;
    const [overrideOps, registrationMigration] = await Promise.all([
      occurrenceOverrideService.rekeyFromEvent(event.id, newRef.id, splitDateKey),
      registrationService.collectSplitMigrationOperations(event.id, newRef.id, splitDateKey),
    ]);

    await this.commitInChunks([
      ...overrideOps,
      ...registrationMigration.operations,
    ]);

    await cacheService.delPattern('events:*');
    await cacheService.del(cacheService.getEventKey(event.id));
    await cacheService.del(cacheService.getEventKey(newRef.id));
    for (const userId of registrationMigration.affectedUserIds) {
      await cacheService.invalidateUserCache(userId);
    }

    return { id: newRef.id, ...newEventDoc };
  }

  async editEventWithScope(eventId, scope, changes, adminId) {
    const { actualEventId, dateKey } = parseEventOccurrenceId(eventId);
    const event = await this.getEvent(actualEventId);
    const occurrence = await this.resolveOccurrence(eventId);
    const resolvedDateKey = dateKey || toUtcDateKey(occurrence.occurrenceDate || occurrence.date);
    const patch = sanitizeOverridePatch(changes);
    validateOverridePatch(patch);

    if (Object.keys(patch).length === 0) {
      throw new ValidationError('No event fields to update', 'changes');
    }

    let effectiveScope = scope;
    if (!event.isRecurring) {
      effectiveScope = EDIT_SCOPES.ALL;
    }

    if (effectiveScope === EDIT_SCOPES.THIS_OCCURRENCE) {
      await occurrenceOverrideService.setOverrides(actualEventId, resolvedDateKey, patch, adminId);
      await cacheService.delPattern('events:*');
      return this.resolveOccurrence(eventId);
    }

    if (effectiveScope === EDIT_SCOPES.THIS_AND_FUTURE) {
      const newEvent = await this.splitRecurringEventFrom(actualEventId, resolvedDateKey, patch, adminId);
      return this.resolveOccurrence(`${newEvent.id}_${resolvedDateKey}`);
    }

    if (effectiveScope !== EDIT_SCOPES.ALL) {
      throw new ValidationError('Invalid edit scope', 'scope');
    }

    await this.updateEvent(actualEventId, patch, adminId);
    return this.resolveOccurrence(eventId);
  }
}

export default new EventService();
