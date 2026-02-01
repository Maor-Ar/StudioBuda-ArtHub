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
    # New payment-related fields
    zcreditReferenceNumber: String
    paymentToken: String
    cardLast4: String
    cardBrand: String
    lastPaymentDate: String
    # Computed field for subscription access end date
    accessEndsDate: String
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

