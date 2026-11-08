import eventService from '../../services/eventService.js';
import registrationService from '../../services/registrationService.js';
import occurrenceOverrideService from '../../services/occurrenceOverrideService.js';
import { requireAdmin, requireManager } from '../middleware/permissions.js';
import { db } from '../../config/firebase.js';
import { isRegistrationClosedForNoSignups, toUtcDateKey } from '../../utils/helpers.js';
import { occupiedSeatCount, reservedRegularIds } from '../../utils/reservedRegulars.js';

const withOccupiedCount = (event, dropInCount) => ({
  ...event,
  registeredCount: occupiedSeatCount(dropInCount, event),
  reservedRegularCount: reservedRegularIds(event).length,
});

const getOccurrenceKeyFromEvent = (event) => {
  const eventId = event.baseEventId || event.id;
  const eventDate = event.occurrenceDate || event.date;
  return { eventId, dateKey: toUtcDateKey(eventDate) };
};

const toIsoDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const eventResolvers = {
  Query: {
    allEvents: async (_, __, context) => {
      await requireManager(context);
      const snapshot = await db.collection('events').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    events: async (_, { dateRange, filters }, context) => {
      const events = await eventService.getEvents(filters || {}, dateRange);

      if (events.length === 0) {
        return events;
      }

      const occurrenceKeys = events.map(getOccurrenceKeyFromEvent);
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate(occurrenceKeys);
      const overridesByDocId = await occurrenceOverrideService.getForOccurrences(occurrenceKeys);

      return events.map((event) => {
        const { eventId, dateKey } = getOccurrenceKeyFromEvent(event);
        const countKey = `${eventId}:${dateKey}`;
        const perDateCount = registrationCounts[countKey] || 0;
        const overrideDoc = overridesByDocId.get(`${eventId}_${dateKey}`);
        const resolved = occurrenceOverrideService.applyToEvent(event, overrideDoc);

        return withOccupiedCount(resolved, perDateCount);
      });
    },

    event: async (_, { id }, context) => {
      const resolved = await eventService.resolveOccurrence(id);
      const eventId = resolved.baseEventId || resolved.id;
      const dateKey = toUtcDateKey(resolved.occurrenceDate || resolved.date);
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate([
        { eventId, dateKey },
      ]);

      return withOccupiedCount(resolved, registrationCounts[`${eventId}:${dateKey}`] || 0);
    },

    weeklySubscriptionClasses: async () => {
      const reservedRegularService = (await import('../../services/reservedRegularService.js')).default;
      return reservedRegularService.listWeeklySubscriptionClasses();
    },

    eventReservedRegulars: async (_, { eventId }, context) => {
      await requireManager(context);
      const reservedRegularService = (await import('../../services/reservedRegularService.js')).default;
      return reservedRegularService.listMembers(eventId);
    },
  },

  Mutation: {
    createEvent: async (_, { input }, context) => {
      const manager = await requireManager(context);
      return await eventService.createEvent(input, manager.id);
    },

    updateEvent: async (_, { id, input }, context) => {
      const manager = await requireManager(context);
      return await eventService.updateEvent(id, input, manager.id);
    },

    deleteEvent: async (_, { id }, context) => {
      const manager = await requireManager(context);
      return await eventService.deleteEvent(id, manager.id);
    },

    adminEditEvent: async (_, { input }, context) => {
      const admin = await requireAdmin(context);
      const resolved = await eventService.editEventWithScope(
        input.eventId,
        input.scope,
        input.changes,
        admin.id
      );
      const eventId = resolved.baseEventId || resolved.id;
      const dateKey = toUtcDateKey(resolved.occurrenceDate || resolved.date);
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate([
        { eventId, dateKey },
      ]);
      return withOccupiedCount(resolved, registrationCounts[`${eventId}:${dateKey}`] || 0);
    },

    adminAddReservedRegular: async (_, { eventId, userId }, context) => {
      await requireManager(context);
      const reservedRegularService = (await import('../../services/reservedRegularService.js')).default;
      return reservedRegularService.addRegular(eventId, userId);
    },

    adminRemoveReservedRegular: async (_, { eventId, userId }, context) => {
      await requireManager(context);
      const reservedRegularService = (await import('../../services/reservedRegularService.js')).default;
      return reservedRegularService.removeRegular(eventId, userId);
    },
  },

  Event: {
    availableSpots: (event) => {
      if (event.isCancelled) return 0;
      if (
        isRegistrationClosedForNoSignups({
          dateValue: event.occurrenceDate || event.date,
          startTime: event.startTime,
          registeredCount: event.registeredCount || 0,
          isCancelled: event.isCancelled === true,
        })
      ) {
        return 0;
      }
      const count = event.registeredCount || 0;
      return Math.max(0, (event.maxRegistrations || 0) - count);
    },
    registeredCount: (event) => event.registeredCount || 0,
    reservedRegularCount: (event) =>
      event.reservedRegularCount != null
        ? event.reservedRegularCount
        : reservedRegularIds(event).length,
    viewerIsReservedRegular: (event, _args, context) => {
      const ids = reservedRegularIds(event);
      if (Array.isArray(event.reservedRegularUserIds)) {
        return !!(context?.user?.id && ids.includes(context.user.id));
      }
      return event.viewerIsReservedRegular === true;
    },
    registeredUsers: (event) => event.registeredUsers || [],
    description: (event) => event.description || '',
    isCancelled: (event) => event.isCancelled === true,
    cancellationReason: (event) => event.cancellationReason || null,
    isRegistrationClosed: (event) =>
      isRegistrationClosedForNoSignups({
        dateValue: event.occurrenceDate || event.date,
        startTime: event.startTime,
        registeredCount: event.registeredCount || 0,
        isCancelled: event.isCancelled === true,
      }),
    hasOccurrenceOverride: (event) => event.hasOccurrenceOverride === true,
    overriddenFields: (event) => event.overriddenFields || [],
    date: (event) => toIsoDate(event.date),
    occurrenceDate: (event) => toIsoDate(event.occurrenceDate),
    recurrenceEndDate: (event) => toIsoDate(event.recurrenceEndDate),
    createdAt: (event) => toIsoDate(event.createdAt),
    updatedAt: (event) => toIsoDate(event.updatedAt),
  },

  EventOccurrenceOverride: {
    cancellationReason: (override) => override.cancellationReason || null,
    cancelledBy: (override) => override.cancelledBy || null,
    cancelledAt: (override) => override.cancelledAt || null,
    updatedAt: (override) => override.updatedAt || null,
    overrides: (override) => override.overrides || {},
  },
};
