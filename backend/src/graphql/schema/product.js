import { gql } from 'graphql-tag';

export const productTypeDefs = gql`
  type Product {
    id: ID!
    title: String!
    subtitle: String!
    type: String!
    price: Float!
    monthlyEntries: Int
    totalEntries: Int
    validityMonths: Int
    termsHtml: String!
    sortOrder: Int!
    isActive: Boolean!
    isPurchasable: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input CreateProductInput {
    id: ID!
    title: String!
    subtitle: String
    type: String!
    price: Float!
    monthlyEntries: Int
    totalEntries: Int
    validityMonths: Int
    termsHtml: String
    sortOrder: Int
    isActive: Boolean
    isPurchasable: Boolean
  }

  input UpdateProductInput {
    title: String
    subtitle: String
    type: String
    price: Float
    monthlyEntries: Int
    totalEntries: Int
    validityMonths: Int
    termsHtml: String
    sortOrder: Int
    isActive: Boolean
    isPurchasable: Boolean
  }
`;
