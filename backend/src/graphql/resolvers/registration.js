import registrationService from '../../services/registrationService.js';
import eventService from '../../services/eventService.js';
import userService from '../../services/userService.js';
import { requireAuthenticated } from '../middleware/permissions.js';

export const registrationResolvers = {
  Query: {
    myRegistrations: async (_, __, context) => {
      const user = await requireAuthenticated(context);
      return await registrationService.getUserRegistrations(user.id, true);
    },
  },

  Mutation: {
    registerForEvent: async (_, { input }, context) => {
      const user = await requireAuthenticated(context);
      return await registrationService.registerForEvent(
        user.id,
        input.eventId,
        input.transactionData
      );
    },

    cancelRegistration: async (_, { id }, context) => {
      const user = await requireAuthenticated(context);
      return await registrationService.cancelRegistration(id, user.id);
    },
  },

  EventRegistration: {
    user: async (registration) => {
      return await userService.getUserById(registration.userId);
    },
    event: async (registration) => {
      return await eventService.getEvent(registration.eventId);
    },
    occurrenceDate: (registration) => {
      if (registration.occurrenceDate?.toDate) {
        return registration.occurrenceDate.toDate().toISOString();
      }
      return new Date(registration.occurrenceDate || registration.registrationDate).toISOString();
    },
    registrationDate: (registration) => {
      if (registration.registrationDate?.toDate) {
        return registration.registrationDate.toDate().toISOString();
      }
      return new Date(registration.registrationDate).toISOString();
    },
    createdAt: (registration) => {
      if (registration.createdAt?.toDate) {
        return registration.createdAt.toDate().toISOString();
      }
      return new Date(registration.createdAt).toISOString();
    },
  },
};

