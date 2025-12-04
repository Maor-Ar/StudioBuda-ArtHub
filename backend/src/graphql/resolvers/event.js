import eventService from '../../services/eventService.js';
import { requireManager, requireAuthenticated } from '../middleware/permissions.js';

export const eventResolvers = {
  Query: {
    events: async (_, { dateRange, filters }, context) => {
      return await eventService.getEvents(filters || {}, dateRange);
    },

    event: async (_, { id }, context) => {
      return await eventService.getEvent(id);
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
      return event.maxRegistrations - (event.registeredCount || 0);
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

