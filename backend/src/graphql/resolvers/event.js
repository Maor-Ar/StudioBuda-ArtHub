import { db } from '../../config/firebase.js';
import eventService from '../../services/eventService.js';
import registrationService from '../../services/registrationService.js';
import { requireManager } from '../middleware/permissions.js';

const getOccurrenceKeyFromEvent = (event) => {
  const eventId = event.baseEventId || event.id;
  const eventDate = event.occurrenceDate || event.date;
  const dateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
  const dateKey = dateObj.toISOString().split('T')[0];
  return { eventId, dateKey };
};

const loadCancellationsByDocId = async (cancellationDocIds) => {
  const cancellationByDocId = new Map();
  if (!cancellationDocIds.length) {
    return cancellationByDocId;
  }

  for (let i = 0; i < cancellationDocIds.length; i += 100) {
    const chunkIds = cancellationDocIds.slice(i, i + 100);
    const chunkRefs = chunkIds.map((docId) => db.collection('event_cancellations').doc(docId));
    const snapshots = await db.getAll(...chunkRefs);
    snapshots.forEach((doc, idx) => {
      cancellationByDocId.set(chunkIds[idx], doc.exists ? doc.data() : null);
    });
  }

  return cancellationByDocId;
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

      const cancellationDocIds = [
        ...new Set(occurrenceKeys.map(({ eventId, dateKey }) => `${eventId}_${dateKey}`)),
      ];
      const cancellationByDocId = await loadCancellationsByDocId(cancellationDocIds);

      return events.map((event) => {
        const { eventId, dateKey } = getOccurrenceKeyFromEvent(event);
        const countKey = `${eventId}:${dateKey}`;
        const perDateCount = registrationCounts[countKey] || 0;
        const cancellationDocId = `${eventId}_${dateKey}`;
        const cancellation = cancellationByDocId.get(cancellationDocId);
        const isCancelled = cancellation != null && cancellation.isActive !== false;
        const cancellationReason = cancellation?.reason || null;

        return {
          ...event,
          registeredCount: perDateCount,
          isCancelled,
          cancellationReason,
        };
      });
    },

    event: async (_, { id }, context) => {
      const event = await eventService.getEvent(id);

      const { eventId, dateKey } = getOccurrenceKeyFromEvent(event);
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate([
        { eventId, dateKey },
      ]);

      const countKey = `${eventId}:${dateKey}`;
      const perDateCount = registrationCounts[countKey] || 0;

      return {
        ...event,
        registeredCount: perDateCount,
        isCancelled: false,
        cancellationReason: null,
      };
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
  },

  Event: {
    availableSpots: (event) => {
      if (event.isCancelled) return 0;
      const count = event.registeredCount || 0;
      return event.maxRegistrations - count;
    },
    date: (event) => {
      if (event.date?.toDate) {
        return event.date.toDate().toISOString();
      }
      return new Date(event.date).toISOString();
    },
    occurrenceDate: (event) => {
      if (event.occurrenceDate?.toDate) {
        return event.occurrenceDate.toDate().toISOString();
      }
      if (event.occurrenceDate) {
        return new Date(event.occurrenceDate).toISOString();
      }
      return null;
    },
    createdAt: (event) => {
      if (event.createdAt?.toDate) {
        return event.createdAt.toDate().toISOString();
      }
      return new Date(event.createdAt).toISOString();
    },
    updatedAt: (event) => {
      if (event.updatedAt?.toDate) {
        return event.updatedAt.toDate().toISOString();
      }
      return new Date(event.updatedAt).toISOString();
    },
  },
};
