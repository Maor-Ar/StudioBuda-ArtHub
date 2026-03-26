import { gql } from 'graphql-tag';

export const registrationTypeDefs = gql`
  type EventRegistration {
    id: ID!
    userId: String!
    transactionId: String!
    eventId: String!
    occurrenceDate: String!
    date: String!
    registrationDate: String!
    status: String!
    createdAt: String!
    user: User
    event: Event
  }

  type EventCancellation {
    id: ID!
    eventId: String!
    dateKey: String!
    reason: String!
    cancelledBy: String!
    cancelledAt: String!
  }

  input RegisterForEventInput {
    eventId: String!
    transactionData: CreateTransactionInput
  }

  input AdminReserveSpotInput {
    eventId: String!
  }

  input AdminCancelEventOccurrenceInput {
    eventId: String!
    reason: String!
  }

  input AdminReenableEventOccurrenceInput {
    eventId: String!
  }
`;

