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
    isManual: Boolean!
    displayName: String
    manualRegistrationId: String
    user: User
    event: Event
  }

  type EventOccurrenceOverride {
    id: ID!
    eventId: String!
    dateKey: String!
    isCancelled: Boolean!
    cancellationReason: String
    cancelledBy: String
    cancelledAt: String
    overrides: EventOccurrenceOverrideFields
    updatedAt: String
  }

  input RegisterForEventInput {
    eventId: String!
    transactionData: CreateTransactionInput
  }

  input AdminReserveSpotInput {
    eventId: String!
    customerName: String!
  }

  input AdminRemoveReservedSpotInput {
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

