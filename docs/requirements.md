# StudioBuda ArtHub - Backend Requirements Document

## Overview
A user-friendly web platform for seamless registration to StudioBuda art studio classes. Customers can browse available sessions, sign up securely, manage bookings, and receive updates—all in one place.

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
  email: string,
  passwordHash: string (for regular users, null for OAuth),
  userType: 'regular' | 'facebook' | 'google' | 'apple',
  role: 'user' | 'manager' | 'admin',
  hasPurchasedTrial: boolean (default: false, true if user has ever purchased a trial_lesson),
  createdAt: timestamp,
  updatedAt: timestamp,
  isActive: boolean
}
```

**Password Policy**: Passwords for email users are indefinite (no expiration). Only reset via forgot password flow with email verification.

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
  recurringIntervalDays: number (null if not recurring),
  instructorName: string,
  maxRegistrations: number,
  eventType: 'trial' | 'subscription_only' | 'paid_workshop',
  price: number (null if not paid_workshop),
  isActive: boolean,
  registeredCount: number,
  registeredUsers: array of user IDs,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string (manager user ID)
}
```

**Note**: Only ONE document per recurring event. Instances generated on-the-fly for frontend based on date range queries.

### Transactions Collection
```javascript
{
  id: string (auto-generated),
  userId: string,
  transactionType: 'subscription' | 'punch_card' | 'trial_lesson',
  // Subscription fields
  monthlyEntries: number (null if not subscription),
  isActive: boolean,
  purchaseDate: timestamp,
  lastRenewalDate: timestamp,
  entriesUsedThisMonth: number,
  // Punch card fields
  totalEntries: number (null if not punch_card),
  entriesRemaining: number (null if not punch_card),
  // Common fields
  invoiceId: string (from Grow),
  amount: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### EventRegistrations Collection
```javascript
{
  id: string (auto-generated),
  userId: string,
  transactionId: string (always present, never null),
  eventId: string,
  occurrenceDate: timestamp (for recurring events, the specific occurrence date),
  registrationDate: timestamp,
  status: 'confirmed' | 'cancelled',
  createdAt: timestamp
}
```

## GraphQL API

### Queries
- `me`: Get current authenticated user
- `events(dateRange, filters)`: List events for date range (max 1 month), returns all at once, no pagination. Generates recurring instances on-the-fly.
- `event(id)`: Get single event details
- `myRegistrations`: Get user's future registrations
- `myTransactions`: Get user's active transactions (also returned on login)
- `transactions`: Manager/Admin query for all transactions
- `users`: Manager/Admin query for all users

### Mutations

#### Authentication
- `register`: Create new user account
- `login`: Authenticate with email/password (returns user + activeTransactions + hasPurchasedTrial)
- `loginWithOAuth`: OAuth authentication (returns user + activeTransactions + hasPurchasedTrial)
- `forgotPassword`: Initiate password reset flow (sends reset email)
- `resetPassword`: Reset password with token from email

#### Events (Manager/Admin only)
- `createEvent`: Create new event (recurring or one-time) with validation
- `updateEvent`: Update existing event with validation
- `deleteEvent`: Soft delete event (set isActive=false)

#### Registrations (Authenticated users only)
- `registerForEvent`: Register authenticated user for an event
  - For trial events: Requires existing active trial_lesson transaction (cannot create during registration)
  - For paid_workshop: Can create transaction during registration if needed
- `cancelRegistration`: Cancel event registration

#### Transactions
- `createTransaction`: Create transaction record with full data
  - For trial_lesson: Validates user.hasPurchasedTrial === false, sets it to true after creation
  - Full data includes: transactionType, amount, monthlyEntries, totalEntries, invoiceId, etc.
- `updateTransaction`: Update transaction (Manager/Admin can renew/cancel subscriptions)
- `renewSubscription`: Manager/Admin endpoint to manually renew a subscription
- `cancelSubscription`: Manager/Admin endpoint to cancel a subscription

## Business Logic

### Event Registration Logic
1. Validate event exists and is active
2. Check event capacity (registeredCount < maxRegistrations)
3. Check user eligibility based on eventType:
   - `trial`: Require active transaction of type 'trial_lesson'. User must have purchased trial from purchase page first. Cannot register for trial event without having trial transaction.
   - `subscription_only`: Require active subscription transaction with available monthly entries (entriesUsedThisMonth < monthlyEntries)
   - `paid_workshop`: Require transaction with sufficient balance or create new transaction during registration
4. For subscriptions: Check monthlyEntries limit (entriesUsedThisMonth < monthlyEntries)
5. For trial: Verify trial_lesson transaction exists and is active (user must have purchased it from purchase page)
6. If transaction doesn't exist for paid_workshop, create transaction record (via registerForEvent mutation)
7. Create EventRegistration record with transactionId (always present)
8. For recurring events: Store occurrenceDate in registration
9. Increment event registeredCount
10. Update transaction entriesUsedThisMonth if applicable (for subscriptions)
11. Invalidate relevant cache entries

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
3. Check if user has ever purchased a trial_lesson transaction (check user.hasPurchasedTrial)
4. Return all active transactions (subscriptions, punch cards, trial lessons) to frontend
5. Return hasPurchasedTrial flag to frontend
6. Frontend will use this data to filter available events, prevent unnecessary registration requests, and hide trial purchase option if already purchased

### Trial Purchase Logic
- Trial lessons can only be purchased from the purchase page
- User can only purchase trial if `hasPurchasedTrial === false`
- When `createTransaction` is called with `transactionType: 'trial_lesson'`:
  1. Validate `user.hasPurchasedTrial === false`
  2. Create transaction record
  3. Update `user.hasPurchasedTrial = true`
  4. Return transaction
- Login returns `hasPurchasedTrial` flag so frontend can hide trial option if already purchased
- Trial events require existing active `trial_lesson` transaction (cannot create during registration)

### Recurring Events
- Store only ONE base event document in Firestore with isRecurring=true and recurringIntervalDays
- When frontend requests events for a date range, generate event instances on-the-fly in the response
- Each generated instance will have a computed ID (baseEventId + occurrenceDate) for frontend use
- Registrations will reference the base eventId and include occurrenceDate
- This approach keeps Firestore lean (no duplicate event documents) while providing full event details to frontend
- Since there won't be many events, retrieval logic can efficiently handle this pattern

## Authentication & Authorization

### Permission Matrix
- **Unauthenticated**: Register, Login, Forgot Password, View active events
- **Authenticated User**: View events, register for events (if eligible), view own data and transactions, cancel own registrations
- **Manager**: All authenticated user permissions + CRUD events, view all transactions and users, renew/cancel subscriptions
- **Admin**: Full access including all manager permissions

### Password Management
- Passwords for email users are indefinite (no expiration)
- Only reset via forgot password flow with email verification
- Password reset token has expiration and single-use validation

## Services

### AuthService
- `verifyToken(token)`: Verify Firebase ID token
- `createUser(userData)`: Create user in Firestore (hasPurchasedTrial defaults to false)
- `getUserByEmail(email)`: Fetch user by email
- `updateUser(userId, data)`: Update user data
- `forgotPassword(email)`: Initiate password reset (generate token, send email via email service)
- `resetPassword(token, newPassword)`: Reset password with token validation (passwords are indefinite, no expiration)
- `validatePasswordResetToken(token)`: Validate reset token before allowing password change
- `checkTrialPurchaseStatus(userId)`: Check if user has ever purchased a trial_lesson (returns boolean)

### TransactionService
- `createTransaction(transactionData)`: Create transaction record with full data
  - If transactionType is 'trial_lesson': Validate user.hasPurchasedTrial === false, update to true after creation
- `getUserActiveTransactions(userId, checkRenewal)`: Get active transactions, optionally run renewal check (used on login)
- `updateTransaction(transactionId, data)`: Update transaction (used by managers/admins)
- `renewSubscription(transactionId, managerId)`: Manually renew subscription (Manager/Admin only)
- `cancelSubscription(transactionId, managerId)`: Cancel subscription (Manager/Admin only)
- `checkSubscriptionLimit(transactionId)`: Check if subscription has available entries
- `checkTrialEligibility(userId)`: Check if user has active trial_lesson transaction
- `checkTrialPurchaseEligibility(userId)`: Check if user can purchase trial (hasn't purchased before)
- `useSubscriptionEntry(transactionId)`: Increment entriesUsedThisMonth

### RegistrationService
- `registerForEvent(userId, eventId, transactionData?)`: Complete registration flow
  - For trial events: Requires existing active trial_lesson transaction (cannot create during registration)
  - For paid_workshop: Can create transaction during registration if needed
- `cancelRegistration(registrationId, userId)`: Cancel registration
- `getUserRegistrations(userId, futureOnly)`: Get user registrations
- `validateRegistrationEligibility(userId, eventId, activeTransactions)`: Check all eligibility criteria using provided active transactions

## Input Validation

### Transaction Input
- Transaction type validation
- Amount validation (positive number)
- Monthly entries validation (positive number if subscription)
- Total entries validation (positive number if punch card)
- Invoice ID validation (required, from Grow)
- **Trial purchase validation**: If transactionType is 'trial_lesson', verify user.hasPurchasedTrial is false (user hasn't purchased trial before)

## Environment Variables
```env
# Server
PORT=4000
NODE_ENV=production

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Redis
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

# Grow API (placeholder)
GROW_API_URL=
GROW_API_KEY=

# Email Service (placeholder)
EMAIL_SERVICE_PROVIDER=sendgrid|mailgun|smtp
EMAIL_API_KEY=
EMAIL_FROM_ADDRESS=
EMAIL_FROM_NAME=StudioBuda

# Password Reset
PASSWORD_RESET_URL=https://yourapp.com/reset-password
PASSWORD_RESET_TOKEN_EXPIRY=3600

# CORS
CORS_ORIGIN=
```

## Documentation Maintenance
- **After every code change**: Update this requirements document to reflect actual implementation
- **Keep this as single source of truth** for what the system actually does

