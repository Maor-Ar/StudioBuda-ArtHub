import eventService from '../../services/eventService.js';
import registrationService from '../../services/registrationService.js';
import { requireManager, requireAuthenticated } from '../middleware/permissions.js';

export const eventResolvers = {
  Query: {
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
        
        return {
          ...event,
          registeredCount: perDateCount,
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

