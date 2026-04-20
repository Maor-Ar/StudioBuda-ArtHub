import { gql } from 'graphql-tag';
import { userTypeDefs } from './user.js';
import { eventTypeDefs } from './event.js';
import { transactionTypeDefs } from './transaction.js';
import { registrationTypeDefs } from './registration.js';
import { paymentTypeDefs } from './payment.js';
import { productTypeDefs } from './product.js';

export const typeDefs = gql`
  ${userTypeDefs}
  ${eventTypeDefs}
  ${transactionTypeDefs}
  ${registrationTypeDefs}
  ${paymentTypeDefs}
  ${productTypeDefs}

  type AuthPayload {
    token: String!
    user: User!
    activeTransactions: [Transaction!]!
    hasPurchasedTrial: Boolean!
  }

  type DashboardMonthlyJoinLeave {
    monthKey: String!
    monthLabel: String!
    joined: Int!
    left: Int!
  }

  type DashboardMonthlyCount {
    monthKey: String!
    monthLabel: String!
    count: Int!
  }

  type DashboardRegistrationDistribution {
    subscription: Int!
    punchCard: Int!
    trialLesson: Int!
    singleLesson: Int!
    total: Int!
  }

  type DashboardAverageStudents {
    overall: Float!
    drawing: Float!
    color: Float!
    challenges: Float!
  }

  type DashboardClassTypeDistribution {
    drawing: Int!
    color: Int!
    challenges: Int!
    unclassified: Int!
    total: Int!
  }

  type DashboardClassMetric {
    key: String!
    fullLabel: String!
    shortLabel: String!
    registrationsCount: Int!
    occurrencesCount: Int!
    avgStudents: Float!
  }

  type DashboardAverageTenure {
    subscriptionsMonths: Float!
    punchCardsPurchasesPerUser: Float!
  }

  type DashboardRetentionPoint {
    x: Int!
    label: String!
    percentage: Float!
    usersCount: Int!
    baseUsers: Int!
  }

  type AdminDashboardMetrics {
    activeSubscriptions: Int!
    activePunchCards: Int!
    subscriptionJoinLeaveByMonth: [DashboardMonthlyJoinLeave!]!
    punchCardPurchasesByMonth: [DashboardMonthlyCount!]!
    registrationDistributionLastMonth: DashboardRegistrationDistribution!
    averageStudentsLastMonth: DashboardAverageStudents!
    classTypeDistributionLastMonth: DashboardClassTypeDistribution!
    classDistributionByClassLastMonth: [DashboardClassMetric!]!
    averageStudentsByClassLastMonth: [DashboardClassMetric!]!
    averageTenure: DashboardAverageTenure!
    subscriptionRetention: [DashboardRetentionPoint!]!
    punchCardReturnRate: [DashboardRetentionPoint!]!
    avgDaysBetweenPunchCardPurchases: Float!
  }

  type Query {
    me: User
    events(dateRange: DateRangeInput, filters: EventFilters): [Event!]!
    event(id: ID!): Event
    myRegistrations: [EventRegistration!]!
    eventRegistrations(eventId: String!): [EventRegistration!]!
    myTransactions: [Transaction!]!
    transactions: [Transaction!]!
    users: [User!]!
    allEvents: [Event!]!
    products: [Product!]!
    allProducts: [Product!]!
    adminDashboardMetrics: AdminDashboardMetrics!
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
    adminCancelRegistration(id: ID!): EventRegistration!
    adminReserveSpot(input: AdminReserveSpotInput!): EventRegistration!
    adminRemoveReservedSpot(input: AdminRemoveReservedSpotInput!): EventRegistration!
    adminCancelEventOccurrence(input: AdminCancelEventOccurrenceInput!): EventCancellation!
    adminReenableEventOccurrence(input: AdminReenableEventOccurrenceInput!): EventCancellation!

    # Transactions
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    renewSubscription(id: ID!): Transaction!
    cancelSubscription(id: ID!): Transaction!
    adminCreateTransactionForUser(userId: ID!, input: AdminCreateTransactionInput!): Transaction!

    # Users (Manager/Admin)
    adminUpdateUser(id: ID!, input: AdminUpdateUserInput!): User!

    # Products (Manager/Admin)
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Product!
  }
`;

