import { gql } from 'graphql-tag';

export const registrationTypeDefs = gql`
  type EventRegistration {
    id: ID!
    userId: String!
    transactionId: String!
    eventId: String!
    occurrenceDate: String!
    registrationDate: String!
    status: String!
    createdAt: String!
    user: User
    event: Event
  }

  input RegisterForEventInput {
    eventId: String!
    transactionData: CreateTransactionInput
  }
`;

