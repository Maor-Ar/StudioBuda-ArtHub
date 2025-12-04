# StudioBuda ArtHub - API Documentation

## GraphQL API

### Base URL
```
http://localhost:4000/graphql
```

### Authentication
All authenticated requests require a Bearer token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

## Queries

### me
Get current authenticated user.

**Authentication**: Required

**Response**:
```graphql
{
  me {
    id
    firstName
    lastName
    email
    phone
    role
    hasPurchasedTrial
  }
}
```

### events
List events for a date range.

**Authentication**: Optional (public events visible to all)

**Arguments**:
- `dateRange`: DateRangeInput (required)
  - `startDate`: String (ISO date)
  - `endDate`: String (ISO date, max 31 days from startDate)
- `filters`: EventFilters (optional)
  - `eventType`: String (optional)

**Response**:
```graphql
{
  events(dateRange: { startDate: "2024-01-01", endDate: "2024-01-31" }) {
    id
    title
    date
    startTime
    duration
    eventType
    availableSpots
    isRecurring
  }
}
```

### event
Get single event details.

**Authentication**: Optional

**Arguments**:
- `id`: ID! (required)

### myRegistrations
Get user's future registrations.

**Authentication**: Required

### myTransactions
Get user's active transactions.

**Authentication**: Required

### transactions
Get all transactions (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

### users
Get all users (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

## Mutations

### register
Create new user account.

**Authentication**: Not required

**Arguments**:
```graphql
register(input: {
  firstName: "John"
  lastName: "Doe"
  phone: "0501234567"
  email: "john@example.com"
  password: "SecurePass123"
})
```

**Response**: AuthPayload with token, user, activeTransactions, and hasPurchasedTrial

### login
Authenticate with email/password.

**Authentication**: Not required

**Arguments**:
```graphql
login(input: {
  email: "john@example.com"
  password: "SecurePass123"
})
```

**Response**: AuthPayload with token, user, activeTransactions (with renewal check), and hasPurchasedTrial

### loginWithOAuth
OAuth authentication (Facebook/Google/Apple).

**Authentication**: Not required

**Arguments**:
- `provider`: String! (facebook, google, or apple)
- `token`: String! (Firebase ID token)

**Response**: AuthPayload with token, user, activeTransactions (with renewal check), and hasPurchasedTrial

### forgotPassword
Initiate password reset flow.

**Authentication**: Not required

**Arguments**:
- `email`: String!

### resetPassword
Reset password with token.

**Authentication**: Not required

**Arguments**:
```graphql
resetPassword(input: {
  token: "reset_token_from_email"
  newPassword: "NewSecurePass123"
})
```

### createEvent
Create new event (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

**Arguments**: CreateEventInput

### updateEvent
Update existing event (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

### deleteEvent
Soft delete event (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

### registerForEvent
Register for an event.

**Authentication**: Required

**Arguments**:
```graphql
registerForEvent(input: {
  eventId: "event_id"
  transactionData: { # Optional, required for paid_workshop
    transactionType: "paid_workshop"
    amount: 100
    invoiceId: "INV_123"
  }
})
```

**Note**: 
- Trial events require existing active trial_lesson transaction
- Subscription_only events require active subscription with available entries
- Paid_workshop can create transaction during registration

### cancelRegistration
Cancel event registration.

**Authentication**: Required

### createTransaction
Create transaction record.

**Authentication**: Required

**Arguments**: CreateTransactionInput

**Note**: For trial_lesson, validates user hasn't purchased before and sets hasPurchasedTrial to true

### updateTransaction
Update transaction (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

### renewSubscription
Manually renew subscription (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

### cancelSubscription
Cancel subscription (Manager/Admin only).

**Authentication**: Required (Manager/Admin)

## Error Codes

- `AUTHENTICATION_ERROR`: Authentication failed
- `AUTHORIZATION_ERROR`: Permission denied
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND_ERROR`: Resource not found
- `CONFLICT_ERROR`: Business logic conflict (e.g., already registered)
- `EXTERNAL_SERVICE_ERROR`: External service error (Grow, Email)

