import registrationService from '../../services/registrationService.js';
import eventService from '../../services/eventService.js';
import userService from '../../services/userService.js';
import { requireAuthenticated } from '../middleware/permissions.js';
import logger from '../../utils/logger.js';

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
      const event = await eventService.getEvent(registration.eventId);
      
      // Calculate registeredCount for the specific occurrence date
      // Get the registration's occurrence date
      const regDate = registration.date || registration.occurrenceDate;
      if (!regDate) {
        // If no date, return event without count (shouldn't happen for recurring events)
        return event;
      }
      
      // Convert to Date object if needed
      const dateObj = regDate?.toDate ? regDate.toDate() : new Date(regDate);
      const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Count registrations for this event on this specific date
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate(
        [registration.eventId],
        []
      );
      
      const countKey = `${registration.eventId}:${dateKey}`;
      const perDateCount = registrationCounts[countKey] || 0;
      
      // Attach the calculated registeredCount to the event
      return {
        ...event,
        registeredCount: perDateCount,
      };
    },
    occurrenceDate: (registration) => {
      if (registration.occurrenceDate?.toDate) {
        return registration.occurrenceDate.toDate().toISOString();
      }
      return new Date(registration.occurrenceDate || registration.registrationDate).toISOString();
    },
    date: (registration) => {
      // Use date field if available, otherwise fallback to occurrenceDate
      if (registration.date?.toDate) {
        return registration.date.toDate().toISOString();
      }
      if (registration.date) {
        return new Date(registration.date).toISOString();
      }
      // Fallback to occurrenceDate
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

