import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    phone: String!
    email: String!
    userType: String!
    role: String!
    hasPurchasedTrial: Boolean!
    createdAt: String!
    updatedAt: String!
    isActive: Boolean!
  }

  input RegisterInput {
    firstName: String!
    lastName: String!
    phone: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ResetPasswordInput {
    token: String!
    newPassword: String!
  }

  input AdminUpdateUserInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    userType: String
    role: String
    hasPurchasedTrial: Boolean
    isActive: Boolean
  }
`;

