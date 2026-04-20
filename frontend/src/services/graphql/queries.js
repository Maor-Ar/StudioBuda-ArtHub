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
      isCancelled
      cancellationReason
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
      isCancelled
      cancellationReason
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
        isCancelled
        cancellationReason
      }
    }
  }
`;

export const GET_EVENT_REGISTRATIONS = gql`
  query GetEventRegistrations($eventId: String!) {
    eventRegistrations(eventId: $eventId) {
      id
      userId
      eventId
      occurrenceDate
      date
      registrationDate
      status
      isManual
      displayName
      manualRegistrationId
      user {
        id
        firstName
        lastName
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
export const GET_ALL_EVENTS = gql`
  query GetAllEvents {
    allEvents {
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
      createdAt
      updatedAt
    }
  }
`;

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
      lastPaymentDate
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
      updatedAt
      isActive
    }
  }
`;

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      title
      subtitle
      type
      price
      monthlyEntries
      totalEntries
      validityMonths
      termsHtml
      sortOrder
    }
  }
`;

export const GET_ALL_PRODUCTS = gql`
  query GetAllProducts {
    allProducts {
      id
      title
      subtitle
      type
      price
      monthlyEntries
      totalEntries
      validityMonths
      termsHtml
      sortOrder
      isActive
      isPurchasable
      createdAt
      updatedAt
    }
  }
`;

export const GET_ADMIN_DASHBOARD_METRICS = gql`
  query GetAdminDashboardMetrics {
    adminDashboardMetrics {
      activeSubscriptions
      activePunchCards
      subscriptionJoinLeaveByMonth {
        monthKey
        monthLabel
        joined
        left
      }
      punchCardPurchasesByMonth {
        monthKey
        monthLabel
        count
      }
      registrationDistributionLastMonth {
        subscription
        punchCard
        trialLesson
        singleLesson
        total
      }
      averageStudentsLastMonth {
        overall
        drawing
        color
        challenges
      }
      classTypeDistributionLastMonth {
        drawing
        color
        challenges
        unclassified
        total
      }
      classDistributionByClassLastMonth {
        key
        fullLabel
        shortLabel
        registrationsCount
        occurrencesCount
        avgStudents
      }
      averageStudentsByClassLastMonth {
        key
        fullLabel
        shortLabel
        registrationsCount
        occurrencesCount
        avgStudents
      }
      averageTenure {
        subscriptionsMonths
        punchCardsPurchasesPerUser
      }
      subscriptionRetention {
        x
        label
        percentage
        usersCount
        baseUsers
      }
      punchCardReturnRate {
        x
        label
        percentage
        usersCount
        baseUsers
      }
      avgDaysBetweenPunchCardPurchases
    }
  }
`;

