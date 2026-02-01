# StudioBuda ArtHub - Requirements Document

## Overview

StudioBuda ArtHub is a user-friendly web platform backend for seamless registration to StudioBuda art studio classes. The backend provides a GraphQL API for customers to browse available sessions, sign up securely, manage bookings, and receive updates.

## Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server)
- **Database**: Firebase Firestore
- **Cache**: Redis
- **Authentication**: Firebase Auth
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Deployment**: Google Cloud Run

## Database Schema

### Users Collection

```javascript
{
  id: string (auto-generated),
  firstName: string,
  lastName: string,
  phone: string,
  email: string (unique),
  passwordHash: string | null (null for OAuth users),
  userType: 'regular' | 'facebook' | 'google' | 'apple',
  role: 'user' | 'manager' | 'admin',
  hasPurchasedTrial: boolean (default: false),
  createdAt: timestamp,
  updatedAt: timestamp,
  isActive: boolean
}
```

### Events Collection

```javascript
{
  id: string (auto-generated),
  date: timestamp (base date for recurring events),
  startTime: string (HH:mm format),
  duration: number (minutes),
  title: string,
  description: string,
  isRecurring: boolean,
  recurringIntervalDays: number | null,
  instructorName: string,
  maxRegistrations: number,
  eventType: 'trial' | 'subscription_only' | 'paid_workshop',
  price: number | null (required for paid_workshop),
  isActive: boolean,
  registeredCount: number,
  registeredUsers: array of user IDs,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string (manager user ID)
}
```

**Note**: Only ONE document per recurring event. Instances are generated on-the-fly for frontend display.

### Transactions Collection

```javascript
{
  id: string (auto-generated),
  userId: string,
  transactionType: 'subscription' | 'punch_card' | 'trial_lesson',
  // Subscription fields
  monthlyEntries: number | null,
  isActive: boolean,                    // Also controls recurring payments: false = stop payments
  purchaseDate: timestamp,
  lastRenewalDate: timestamp | null,
  entriesUsedThisMonth: number,
  // Punch card fields
  totalEntries: number | null,
  entriesRemaining: number | null,
  // ZCredit Payment fields (NEW)
  paymentToken: string | null,          // ZCredit token for recurring charges (subscriptions only)
  zcreditReferenceNumber: string | null, // ZCredit transaction reference
  cardLast4: string | null,             // "9001" for display
  cardBrand: string | null,             // "ויזה רגיל"
  lastPaymentDate: timestamp,           // When last successful charge occurred
  // Common fields
  invoiceId: string,                    // Reference ID (zcreditReferenceNumber for ZCredit)
  amount: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Note:** `paymentMethod` field is NOT needed - payment type (one-time vs recurring) is determined by `transactionType`:
- `transactionType === 'subscription'` → Recurring (first payment + monthly via cron)
- `transactionType === 'punch_card' || 'trial_lesson'` → One-time payment

### EventRegistrations Collection

```javascript
{
  id: string (auto-generated),
  userId: string,
  transactionId: string (always present),
  eventId: string,
  occurrenceDate: timestamp (for recurring events, the specific occurrence date),
  registrationDate: timestamp,
  status: 'confirmed' | 'cancelled',
  createdAt: timestamp
}
```

## Authentication & Authorization

### Authentication Methods

1. **Email/Password**: Traditional registration and login
2. **OAuth**: Facebook, Google, Apple authentication via Firebase Auth

### Password Management

- Passwords are hashed using bcrypt (10 rounds)
- Password reset flow:
  - User requests password reset via `forgotPassword` mutation
  - System generates reset token and stores in `password_reset_tokens` collection
  - Email sent with reset link (placeholder implementation)
  - User resets password via `resetPassword` mutation with token
  - Token is single-use and expires after configured time (default: 1 hour)
  - **No password expiration**: Once set, password is indefinite unless user resets it

### Authorization Roles

- **Unauthenticated**: Can register, login, view active events, request password reset
- **Authenticated User**: Can view events, register for events (if eligible), view own data and transactions, cancel own registrations
- **Manager**: All user permissions + CRUD events, view all transactions and users, renew/cancel subscriptions
- **Admin**: Full access including all manager permissions

## Business Logic

### Event Registration

1. Validate event exists and is active
2. Check event capacity (registeredCount < maxRegistrations)
3. Check user eligibility based on eventType:
   - **trial**: Requires active transaction of type 'trial_lesson'. User must have purchased trial lesson first (cannot create during registration). If user doesn't have one, registration fails with error.
   - **subscription_only**: Requires active subscription transaction with available monthly entries (entriesUsedThisMonth < monthlyEntries)
   - **paid_workshop**: Can create transaction during registration if transactionData provided
4. Create EventRegistration record with transactionId (always present)
5. For recurring events: Store occurrenceDate in registration
6. Increment event registeredCount
7. Update transaction entriesUsedThisMonth if applicable (for subscriptions)
8. Invalidate relevant cache entries

### Subscription Renewal Logic (on Login)

1. On user login, fetch all active subscription transactions
2. For each subscription:
   - Check if lastRenewalDate is from previous month
   - If yes, call Grow service to verify monthly payment
   - If payment verified:
     - Update lastRenewalDate to current month (same day/time as purchaseDate)
     - Reset entriesUsedThisMonth to 0
   - If payment not verified:
     - Set isActive to false
     - Remove from active transactions list
3. Return all active transactions (subscriptions, punch cards, trial lessons) to frontend
4. Frontend uses this data to filter available events and prevent unnecessary registration requests

### Recurring Events

- Store only ONE base event document in Firestore with isRecurring=true and recurringIntervalDays
- When frontend requests events for a date range, generate event instances on-the-fly in the response
- Each generated instance has a computed ID (baseEventId + occurrenceDate) for frontend use
- Registrations reference the base eventId and include occurrenceDate
- This approach keeps Firestore lean (no duplicate event documents) while providing full event details to frontend
- Date range queries are limited to max 1 month (31 days)

### Trial Lesson Logic

- Trial lessons can only be purchased once per user
- User model has `hasPurchasedTrial` field to track this
- When user purchases trial_lesson transaction, `hasPurchasedTrial` is set to true
- Login returns `hasPurchasedTrial` flag so frontend can hide trial purchase option if already purchased
- Trial events require existing active trial_lesson transaction (cannot create during registration)

### Transaction Creation

- `createTransaction` mutation accepts full transaction data:
  - transactionType (required)
  - amount (required)
  - monthlyEntries (required for subscription)
  - totalEntries (required for punch_card)
  - invoiceId (required, from Grow)
- For trial_lesson: Validates user hasn't purchased before, sets hasPurchasedTrial to true
- Transaction is always created with full data, not just date

## API Endpoints

### GraphQL Queries

- `me`: Get current authenticated user
- `events(dateRange, filters)`: List events for date range (max 1 month), returns all at once, no pagination. Generates recurring instances on-the-fly.
- `event(id)`: Get single event details
- `myRegistrations`: Get user's future registrations
- `myTransactions`: Get user's active transactions (also returned on login)
- `transactions`: Manager/Admin query for all transactions
- `users`: Manager/Admin query for all users

### GraphQL Mutations

**Authentication:**
- `register(input)`: Create new user account (returns AuthPayload with token, user, activeTransactions, hasPurchasedTrial)
- `login(input)`: Authenticate with email/password (returns AuthPayload with token, user, activeTransactions with renewal check, hasPurchasedTrial)
- `loginWithOAuth(provider, token)`: OAuth authentication (returns AuthPayload with token, user, activeTransactions with renewal check, hasPurchasedTrial)
- `forgotPassword(email)`: Initiate password reset flow (sends reset email)
- `resetPassword(input)`: Reset password with token from email

**Events (Manager/Admin only):**
- `createEvent(input)`: Create new event (recurring or one-time) with validation
- `updateEvent(id, input)`: Update existing event with validation
- `deleteEvent(id)`: Soft delete event (set isActive=false)

**Registrations (Authenticated users only):**
- `registerForEvent(input)`: Register authenticated user for an event (creates transaction if needed for paid_workshop)
- `cancelRegistration(id)`: Cancel event registration

**Transactions:**
- `createTransaction(input)`: Create transaction record with full data (type, amount, monthlyEntries, totalEntries, invoiceId, etc.)
- `updateTransaction(id, input)`: Update transaction (Manager/Admin can renew/cancel subscriptions)
- `renewSubscription(id)`: Manager/Admin endpoint to manually renew a subscription
- `cancelSubscription(id)`: Cancel a subscription (user can cancel own, manager/admin can cancel any)

**Payments:**
- `createPaymentSession(productId, product)`: Create ZCredit checkout session, returns iframe URL
- `paymentStatus(uniqueId)`: Check status of a payment session (pending/completed/unknown)

## Cache Strategy

**Redis Keys:**
- `user:{userId}`: User data (TTL: 1 hour)
- `event:{eventId}`: Event data (TTL: 30 minutes)
- `events:active:{dateRange}`: Active events for date range (TTL: 15 minutes)
- `user:{userId}:transactions:active`: Active transactions (TTL: 5 minutes)
- `user:{userId}:registrations:future`: Future registrations (TTL: 10 minutes)

**Cache Invalidation:**
- On event create/update/delete
- On registration create/cancel
- On transaction create/update
- On user update

## Error Handling

### Error Codes

- `AUTHENTICATION_ERROR`: Authentication failed (401)
- `AUTHORIZATION_ERROR`: Permission denied (403)
- `VALIDATION_ERROR`: Input validation failures (400)
- `NOT_FOUND_ERROR`: Resource not found (404)
- `CONFLICT_ERROR`: Business logic conflicts (e.g., already registered) (409)
- `EXTERNAL_SERVICE_ERROR`: Grow API errors, Email service errors (502)

### Error Response Format

```json
{
  "errors": [{
    "message": "Error message",
    "code": "ERROR_CODE",
    "field": "fieldName" // if validation error
  }]
}
```

## External Integrations

### ZCredit (SmartBee) Payment Integration

ZCredit is used for all payment processing. The integration uses two APIs:
- **WebCheckout API**: For creating iframe checkout sessions
- **WebService API**: For charging tokens (recurring payments)

#### Payment Flow

1. **Initial Payment (All Products)**:
   - Frontend calls `createPaymentSession` mutation with product details
   - Backend creates ZCredit WebCheckout session with callback URL
   - Frontend displays ZCredit checkout page in iframe/WebView
   - User enters card details in ZCredit's secure page
   - ZCredit calls our callback endpoint with payment result and token
   - Backend creates transaction record with token (for subscriptions)
   - Frontend notified of success via postMessage/URL redirect

2. **Recurring Payments (Subscriptions Only)**:
   - Daily cron script (`scripts/processRecurringPayments.js`) runs
   - Finds active subscriptions where lastPaymentDate > 30 days ago
   - Charges stored token via ZCredit WebService API
   - Updates lastPaymentDate on success, deactivates on failure

3. **Cancel Subscription**:
   - User clicks "ביטול מנוי" button in profile
   - Warning popup shows access end date (lastPaymentDate + 30 days)
   - On confirmation, transaction.isActive set to false
   - Cron script skips inactive subscriptions

#### Security
- Card details never touch our servers (PCI DSS compliance via ZCredit)
- Tokens stored only for recurring payments (subscriptions)
- One-time payments (punch cards, trial lessons) don't store tokens

#### Test Credentials
- Terminal Number: 0882016016
- Password: Z0882016016
- Key: c0863aa14e77ec032effda671797c295d8a2ab154e49242871a197d158fa3f30
- Test Panel: https://pci.zcredit.co.il/webcontrol/login.aspx

### Email Service

- Placeholder implementation for email sending
- `sendPasswordResetEmail(email, resetToken, resetUrl)`: Sends password reset email
- `sendWelcomeEmail(email, name)`: Sends welcome email on registration
- Supports multiple providers (SendGrid, Mailgun, SMTP) via configuration
- Actual integration will be implemented when email provider is selected

## Security Considerations

1. **Authentication**: JWT token verification on every request
2. **Authorization**: Role-based access control
3. **Password Security**: bcrypt hashing, no password expiration (indefinite until reset)
4. **Input Validation**: Comprehensive validation for all inputs
5. **Rate Limiting**: Applied to authentication endpoints
6. **CORS**: Configurable allowed origins
7. **Error Messages**: Don't reveal sensitive information in errors

## Logging & Monitoring

- Structured logging (JSON format) using Winston
- Request/response logging
- Error logging with stack traces
- Business event logging (registrations, payments)
- Health check endpoint at `/health`
- Integration with Google Cloud Monitoring

## Testing

- Unit tests for services and utilities
- Integration tests for GraphQL resolvers
- E2E tests for complete user flows
- Test coverage reporting

## Deployment

- Docker containerization
- Google Cloud Run deployment
- Environment variable configuration
- Health check endpoint
- Graceful shutdown handling

## Documentation Maintenance

**Rule**: After every code change during implementation, `docs/requirements.md` MUST be updated to reflect actual implementation.

This document serves as the single source of truth for what the system actually does.

