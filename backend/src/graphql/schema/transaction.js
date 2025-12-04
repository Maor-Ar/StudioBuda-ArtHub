import { gql } from 'graphql-tag';

export const transactionTypeDefs = gql`
  type Transaction {
    id: ID!
    userId: String!
    transactionType: String!
    monthlyEntries: Int
    isActive: Boolean!
    purchaseDate: String!
    lastRenewalDate: String
    entriesUsedThisMonth: Int
    totalEntries: Int
    entriesRemaining: Int
    invoiceId: String!
    amount: Float!
    createdAt: String!
    updatedAt: String!
  }

  input CreateTransactionInput {
    transactionType: String!
    amount: Float!
    monthlyEntries: Int
    totalEntries: Int
    invoiceId: String!
  }

  input UpdateTransactionInput {
    isActive: Boolean
    monthlyEntries: Int
    lastRenewalDate: String
    entriesUsedThisMonth: Int
    entriesRemaining: Int
  }
`;

