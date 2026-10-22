import { gql } from 'graphql-tag';

export const eventTypeDefs = gql`
  enum EventEditScope {
    THIS_OCCURRENCE
    THIS_AND_FUTURE
    ALL
  }

  type EventOccurrenceOverrideFields {
    title: String
    description: String
    startTime: String
    duration: Int
    instructorName: String
    maxRegistrations: Int
  }

  input EventOccurrenceOverrideInput {
    title: String
    description: String
    startTime: String
    duration: Int
    instructorName: String
    maxRegistrations: Int
  }

  input AdminEditEventInput {
    eventId: String!
    scope: EventEditScope!
    changes: EventOccurrenceOverrideInput!
  }

  type Event {
    id: ID!
    date: String!
    startTime: String!
    duration: Int!
    title: String!
    description: String!
    isRecurring: Boolean!
    recurringIntervalDays: Int
    recurrenceEndDate: String
    instructorName: String!
    maxRegistrations: Int!
    eventType: String!
    price: Float
    isActive: Boolean!
    isCancelled: Boolean!
    cancellationReason: String
    hasOccurrenceOverride: Boolean!
    overriddenFields: [String!]!
    registeredCount: Int!
    registeredUsers: [String!]!
    createdAt: String!
    updatedAt: String!
    createdBy: String!
    availableSpots: Int!
    occurrenceDate: String
    isInstance: Boolean
    baseEventId: ID
  }

  input DateRangeInput {
    startDate: String!
    endDate: String!
  }

  input EventFilters {
    eventType: String
  }

  input CreateEventInput {
    date: String!
    startTime: String!
    duration: Int!
    title: String!
    description: String!
    isRecurring: Boolean
    recurringIntervalDays: Int
    recurrenceEndDate: String
    instructorName: String!
    maxRegistrations: Int!
    eventType: String!
    price: Float
  }

  input UpdateEventInput {
    date: String
    startTime: String
    duration: Int
    title: String
    description: String
    isRecurring: Boolean
    recurringIntervalDays: Int
    recurrenceEndDate: String
    instructorName: String
    maxRegistrations: Int
    eventType: String
    price: Float
    isActive: Boolean
  }
`;

