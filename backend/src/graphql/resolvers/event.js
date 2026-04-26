import { db } from '../../config/firebase.js';
import eventService from '../../services/eventService.js';
import registrationService from '../../services/registrationService.js';
import { requireManager, requireAuthenticated } from '../middleware/permissions.js';

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

      // Get unique event IDs (use baseEventId for recurring instances, otherwise event id)
      const eventIds = [...new Set(events.map(e => e.baseEventId || e.id))];

      // Count registrations by eventId and date
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate(
        eventIds,
        []
      );

      // Fetch cancellation overrides for the occurrences returned in this range.
      // Docs are keyed by: `${eventId}_${dateKey}` where eventId is baseEventId.
      const cancellationDocIds = [...new Set(events.map((event) => {
        const eventId = event.baseEventId || event.id;
        const eventDate = event.occurrenceDate || event.date;
        const dateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
        const dateKey = dateObj.toISOString().split('T')[0];
        return `${eventId}_${dateKey}`;
      }))];

      const cancellationDocs = await Promise.all(
        cancellationDocIds.map((docId) => db.collection('event_cancellations').doc(docId).get())
      );

      const cancellationByDocId = new Map();
      cancellationDocs.forEach((doc, idx) => {
        const docId = cancellationDocIds[idx];
        cancellationByDocId.set(docId, doc.exists ? doc.data() : null);
      });

      // Attach registration counts to events
      return events.map(event => {
        // For recurring instances, use baseEventId; for one-time events, use id
        const eventId = event.baseEventId || event.id;
        // Get the occurrence date (for recurring) or regular date
        const eventDate = event.occurrenceDate || event.date;
        const dateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
        const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
        const countKey = `${eventId}:${dateKey}`;

        // Use the per-date count, or fallback to the event's registeredCount
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
      
      // Calculate registeredCount on-the-fly for this event
      // For recurring events, we need the occurrenceDate to count correctly
      // For now, if it's recurring, we'll count all registrations (or could return 0 if no date provided)
      const eventDate = event.occurrenceDate || event.date;
      const dateObj = eventDate?.toDate ? eventDate.toDate() : new Date(eventDate);
      const dateKey = dateObj.toISOString().split('T')[0];
      
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate(
        [event.id],
        []
      );
      
      const countKey = `${event.id}:${dateKey}`;
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
      // registeredCount is always calculated on-the-fly now
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

