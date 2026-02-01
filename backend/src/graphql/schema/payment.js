import { gql } from 'graphql-tag';

export const paymentTypeDefs = gql`
  """
  Payment session for iframe checkout
  """
  type PaymentSession {
    sessionId: String!
    sessionUrl: String!
    uniqueId: String!
    isRecurring: Boolean!
  }

  """
  Response when canceling a subscription
  """
  type CancelSubscriptionResponse {
    id: ID!
    isActive: Boolean!
    lastPaymentDate: String!
    accessEndsDate: String!
    message: String!
  }

  """
  Product information for payment
  """
  input ProductInput {
    id: String!
    name: String!
    type: String!
    price: Float!
    monthlyEntries: Int
    totalEntries: Int
  }

  extend type Query {
    """
    Check payment session status
    """
    paymentStatus(uniqueId: String!): PaymentStatus!
  }

  type PaymentStatus {
    status: String!
    transactionId: String
    message: String!
  }

  extend type Mutation {
    """
    Create a payment session for iframe checkout.
    Returns session URL to load in iframe.
    """
    createPaymentSession(productId: String!, product: ProductInput!): PaymentSession!
  }
`;
