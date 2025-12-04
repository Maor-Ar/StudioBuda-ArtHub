import { gql } from 'graphql-tag';
import { userTypeDefs } from './user.js';
import { eventTypeDefs } from './event.js';
import { transactionTypeDefs } from './transaction.js';
import { registrationTypeDefs } from './registration.js';

export const typeDefs = gql`
  ${userTypeDefs}
  ${eventTypeDefs}
  ${transactionTypeDefs}
  ${registrationTypeDefs}

  type AuthPayload {
    token: String!
    user: User!
    activeTransactions: [Transaction!]!
    hasPurchasedTrial: Boolean!
  }

  type Query {
    me: User
    events(dateRange: DateRangeInput, filters: EventFilters): [Event!]!
    event(id: ID!): Event
    myRegistrations: [EventRegistration!]!
    myTransactions: [Transaction!]!
    transactions: [Transaction!]!
    users: [User!]!
  }

  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    loginWithOAuth(provider: String!, token: String!): AuthPayload!
    forgotPassword(email: String!): Boolean!
    resetPassword(input: ResetPasswordInput!): Boolean!

    # Events (Manager/Admin only)
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    deleteEvent(id: ID!): Event!

    # Registrations (Authenticated users)
    registerForEvent(input: RegisterForEventInput!): EventRegistration!
    cancelRegistration(id: ID!): EventRegistration!

    # Transactions
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    renewSubscription(id: ID!): Transaction!
    cancelSubscription(id: ID!): Transaction!
  }
`;

