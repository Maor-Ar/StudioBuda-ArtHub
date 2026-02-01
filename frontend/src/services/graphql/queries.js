import { gql } from '@apollo/client';

// User Queries
export const GET_ME = gql`
  query Me {
    me {
      id
      firstName
      lastName
      email
      phone
      role
      userType
      hasPurchasedTrial
      createdAt
      isActive
    }
  }
`;

// Event Queries
export const GET_EVENTS = gql`
  query GetEvents($dateRange: DateRangeInput, $filters: EventFilters) {
    events(dateRange: $dateRange, filters: $filters) {
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
      registeredCount
      availableSpots
      occurrenceDate
      isInstance
      baseEventId
    }
  }
`;

export const GET_EVENT = gql`
  query GetEvent($id: ID!) {
    event(id: $id) {
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
      registeredCount
      availableSpots
      occurrenceDate
      isInstance
      baseEventId
    }
  }
`;

// Registration Queries
export const GET_MY_REGISTRATIONS = gql`
  query GetMyRegistrations {
    myRegistrations {
      id
      userId
      transactionId
      eventId
      occurrenceDate
      date
      registrationDate
      status
      createdAt
      event {
        id
        title
        date
        startTime
        duration
        eventType
        instructorName
        maxRegistrations
        registeredCount
        availableSpots
      }
    }
  }
`;

// Transaction Queries
export const GET_MY_TRANSACTIONS = gql`
  query GetMyTransactions {
    myTransactions {
      id
      userId
      transactionType
      monthlyEntries
      isActive
      purchaseDate
      lastRenewalDate
      entriesUsedThisMonth
      totalEntries
      entriesRemaining
      invoiceId
      amount
      createdAt
      updatedAt
      # Payment fields
      lastPaymentDate
      accessEndsDate
      cardLast4
      cardBrand
    }
  }
`;

// Admin Queries
export const GET_ALL_TRANSACTIONS = gql`
  query GetAllTransactions {
    transactions {
      id
      userId
      transactionType
      monthlyEntries
      isActive
      purchaseDate
      lastRenewalDate
      entriesUsedThisMonth
      totalEntries
      entriesRemaining
      invoiceId
      amount
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      firstName
      lastName
      email
      phone
      role
      userType
      hasPurchasedTrial
      createdAt
      isActive
    }
  }
`;

