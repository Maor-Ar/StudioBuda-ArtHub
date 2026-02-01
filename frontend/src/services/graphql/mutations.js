import { gql } from '@apollo/client';

// Authentication Mutations
export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        firstName
        lastName
        email
        phone
        role
        userType
        hasPurchasedTrial
      }
      activeTransactions {
        id
        transactionType
        monthlyEntries
        entriesUsedThisMonth
        entriesRemaining
        totalEntries
        isActive
      }
      hasPurchasedTrial
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        firstName
        lastName
        email
        phone
        role
        userType
        hasPurchasedTrial
      }
      activeTransactions {
        id
        transactionType
        monthlyEntries
        entriesUsedThisMonth
        entriesRemaining
        totalEntries
        isActive
      }
      hasPurchasedTrial
    }
  }
`;

export const LOGIN_WITH_OAUTH = gql`
  mutation LoginWithOAuth($provider: String!, $token: String!) {
    loginWithOAuth(provider: $provider, token: $token) {
      token
      user {
        id
        firstName
        lastName
        email
        phone
        role
        userType
        hasPurchasedTrial
      }
      activeTransactions {
        id
        transactionType
        monthlyEntries
        entriesUsedThisMonth
        entriesRemaining
        totalEntries
        isActive
      }
      hasPurchasedTrial
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

// Event Mutations (Admin/Manager only)
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      date
      startTime
      duration
      title
      description
      isRecurring
      recurringIntervalDays
      instructorName
      maxRegistrations
      eventType
      price
      isActive
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      date
      startTime
      duration
      title
      description
      isRecurring
      recurringIntervalDays
      instructorName
      maxRegistrations
      eventType
      price
      isActive
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      id
      title
    }
  }
`;

// Registration Mutations
export const REGISTER_FOR_EVENT = gql`
  mutation RegisterForEvent($input: RegisterForEventInput!) {
    registerForEvent(input: $input) {
      id
      userId
      eventId
      occurrenceDate
      registrationDate
      status
      event {
        id
        title
        date
        startTime
      }
    }
  }
`;

export const CANCEL_REGISTRATION = gql`
  mutation CancelRegistration($id: ID!) {
    cancelRegistration(id: $id) {
      id
      status
    }
  }
`;

// Transaction Mutations
export const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
      userId
      transactionType
      monthlyEntries
      isActive
      purchaseDate
      entriesUsedThisMonth
      totalEntries
      entriesRemaining
      invoiceId
      amount
    }
  }
`;

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($id: ID!, $input: UpdateTransactionInput!) {
    updateTransaction(id: $id, input: $input) {
      id
      isActive
      monthlyEntries
      entriesUsedThisMonth
      entriesRemaining
    }
  }
`;

export const RENEW_SUBSCRIPTION = gql`
  mutation RenewSubscription($id: ID!) {
    renewSubscription(id: $id) {
      id
      lastRenewalDate
      entriesUsedThisMonth
      isActive
    }
  }
`;

export const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription($id: ID!) {
    cancelSubscription(id: $id) {
      id
      isActive
      lastPaymentDate
      accessEndsDate
    }
  }
`;

// Payment Mutations
export const CREATE_PAYMENT_SESSION = gql`
  mutation CreatePaymentSession($productId: String!, $product: ProductInput!) {
    createPaymentSession(productId: $productId, product: $product) {
      sessionId
      sessionUrl
      uniqueId
      isRecurring
    }
  }
`;





