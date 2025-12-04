import { gql } from 'graphql-tag';

export const eventTypeDefs = gql`
  type Event {
    id: ID!
    date: String!
    startTime: String!
    duration: Int!
    title: String!
    description: String!
    isRecurring: Boolean!
    recurringIntervalDays: Int
    instructorName: String!
    maxRegistrations: Int!
    eventType: String!
    price: Float
    isActive: Boolean!
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
    instructorName: String
    maxRegistrations: Int
    eventType: String
    price: Float
    isActive: Boolean
  }
`;

