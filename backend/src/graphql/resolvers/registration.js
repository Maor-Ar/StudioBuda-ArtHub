import registrationService from '../../services/registrationService.js';
import eventService from '../../services/eventService.js';
import userService from '../../services/userService.js';
import { requireAdmin, requireAuthenticated } from '../middleware/permissions.js';

const enrichRegistrationsWithEvents = async (registrations) => {
  if (!registrations.length) {
    return registrations;
  }

  const registrationsWithDateKeys = registrations.map((reg) => ({
    reg,
    dateKey: registrationService.getRegistrationDateKey(reg),
  }));

  const occurrenceKeys = registrationsWithDateKeys
    .filter(({ dateKey }) => dateKey)
    .map(({ reg, dateKey }) => ({
      eventId: reg.eventId,
      dateKey,
    }));

  const uniqueEventIds = [...new Set(registrations.map((reg) => reg.eventId))];
  const [eventsMap, registrationCounts, cancellations] = await Promise.all([
    eventService.getEventsByIds(uniqueEventIds),
    registrationService.countRegistrationsByEventAndDate(occurrenceKeys),
    registrationService.getCancellationsForOccurrences(occurrenceKeys),
  ]);

  return registrationsWithDateKeys.map(({ reg, dateKey }) => {
    if (!dateKey) {
      return { ...reg, _enrichedEvent: null };
    }

    const event = eventsMap.get(reg.eventId);
    const countKey = `${reg.eventId}:${dateKey}`;
    const cancellation = cancellations.get(`${reg.eventId}_${dateKey}`);

    return {
      ...reg,
      _enrichedEvent: event
        ? {
            ...event,
            registeredCount: registrationCounts[countKey] || 0,
            isCancelled: cancellation != null && cancellation.isActive !== false,
            cancellationReason: cancellation?.reason || null,
          }
        : null,
    };
  });
};

export const registrationResolvers = {
  Query: {
    myRegistrations: async (_, __, context) => {
      const user = await requireAuthenticated(context);
      const registrations = await registrationService.getUserRegistrations(user.id, true);
      return enrichRegistrationsWithEvents(registrations);
    },
    eventRegistrations: async (_, { eventId }, context) => {
      await requireAdmin(context);
      const registrations = await registrationService.getRegistrationsForEventOccurrence(eventId);
      const userIds = [
        ...new Set(
          registrations
            .filter((reg) => !reg.isManual && reg.userId && reg.userId !== 'DummyUser')
            .map((reg) => reg.userId)
        ),
      ];
      const usersMap = await userService.getUsersByIds(userIds);

      return registrations.map((reg) => ({
        ...reg,
        _user: reg.isManual ? null : usersMap.get(reg.userId) || null,
      }));
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

    adminCancelRegistration: async (_, { id }, context) => {
      await requireAdmin(context);
      return await registrationService.cancelRegistrationAsAdmin(id);
    },

    adminReserveSpot: async (_, { input }, context) => {
      await requireAdmin(context);
      return await registrationService.reserveSpotForDummyUser(input.eventId, input.customerName);
    },

    adminRemoveReservedSpot: async (_, { input }, context) => {
      await requireAdmin(context);
      return await registrationService.removeReservedSpotForDummyUser(input.eventId);
    },

    adminCancelEventOccurrence: async (_, { input }, context) => {
      const admin = await requireAdmin(context);
      return await registrationService.cancelEventOccurrenceAsAdmin(input.eventId, input.reason, admin.id);
    },

    adminReenableEventOccurrence: async (_, { input }, context) => {
      const admin = await requireAdmin(context);
      return await registrationService.reenableEventOccurrenceAsAdmin(input.eventId, admin.id);
    },
  },

  EventRegistration: {
    user: async (registration) => {
      if (registration._user !== undefined) {
        return registration._user;
      }
      if (registration.isManual || registration.userId === 'DummyUser') {
        return null;
      }
      return await userService.getUserById(registration.userId);
    },
    event: async (registration) => {
      if (registration._enrichedEvent) {
        return registration._enrichedEvent;
      }

      const event = await eventService.getEvent(registration.eventId);
      const dateKey = registrationService.getRegistrationDateKey(registration);
      if (!dateKey) {
        return {
          ...event,
          registeredCount: 0,
          isCancelled: false,
          cancellationReason: null,
        };
      }
      const registrationCounts = await registrationService.countRegistrationsByEventAndDate([
        { eventId: registration.eventId, dateKey },
      ]);
      const cancellations = await registrationService.getCancellationsForOccurrences([
        { eventId: registration.eventId, dateKey },
      ]);
      const cancellation = cancellations.get(`${registration.eventId}_${dateKey}`);

      return {
        ...event,
        registeredCount: registrationCounts[`${registration.eventId}:${dateKey}`] || 0,
        isCancelled: cancellation != null && cancellation.isActive !== false,
        cancellationReason: cancellation?.reason || null,
      };
    },
    occurrenceDate: (registration) => {
      if (registration.occurrenceDate?.toDate) {
        return registration.occurrenceDate.toDate().toISOString();
      }
      return new Date(registration.occurrenceDate || registration.registrationDate).toISOString();
    },
    date: (registration) => {
      if (registration.date?.toDate) {
        return registration.date.toDate().toISOString();
      }
      if (registration.date) {
        return new Date(registration.date).toISOString();
      }
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
    isManual: (registration) => {
      return registration.isManual === true;
    },
    displayName: (registration) => {
      return registration.displayName || null;
    },
    manualRegistrationId: (registration) => {
      return registration.manualRegistrationId || null;
    },
  },
};
