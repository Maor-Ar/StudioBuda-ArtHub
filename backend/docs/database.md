# StudioBuda ArtHub - Database Documentation

## Firestore Collections

### users
User accounts and profiles.

**Fields**:
- `id`: string (auto-generated)
- `firstName`: string
- `lastName`: string
- `phone`: string
- `email`: string (unique)
- `passwordHash`: string | null (null for OAuth users)
- `userType`: 'regular' | 'facebook' | 'google' | 'apple'
- `role`: 'user' | 'manager' | 'admin'
- `hasPurchasedTrial`: boolean (default: false)
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `isActive`: boolean

**Indexes Required**:
- `email` (for queries)

### events
Art studio events/classes.

**Fields**:
- `id`: string (auto-generated)
- `date`: timestamp (base date for recurring events)
- `startTime`: string (HH:mm format)
- `duration`: number (minutes)
- `title`: string
- `description`: string
- `isRecurring`: boolean
- `recurringIntervalDays`: number | null
- `instructorName`: string
- `maxRegistrations`: number
- `eventType`: 'trial' | 'subscription_only' | 'paid_workshop'
- `price`: number | null
- `isActive`: boolean
- `registeredCount`: number
- `registeredUsers`: array of user IDs
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `createdBy`: string (manager user ID)

**Indexes Required**:
- `isActive` (for queries)
- `eventType` (for filtering)
- `createdBy` (for manager queries)

**Note**: Recurring events are stored as single documents. Instances generated on-the-fly.

### transactions
User transactions (subscriptions, punch cards, trial lessons).

**Fields**:
- `id`: string (auto-generated)
- `userId`: string
- `transactionType`: 'subscription' | 'punch_card' | 'trial_lesson'
- `monthlyEntries`: number | null (subscription only)
- `isActive`: boolean
- `purchaseDate`: timestamp
- `lastRenewalDate`: timestamp | null (subscription only)
- `entriesUsedThisMonth`: number (subscription only)
- `totalEntries`: number | null (punch card only)
- `entriesRemaining`: number | null (punch card only)
- `invoiceId`: string (from Grow)
- `amount`: number
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Indexes Required**:
- `userId` + `isActive` (for active transactions query)
- `transactionType` (for filtering)

### event_registrations
Event registrations.

**Fields**:
- `id`: string (auto-generated)
- `userId`: string
- `transactionId`: string (always present)
- `eventId`: string
- `occurrenceDate`: timestamp (for recurring events)
- `registrationDate`: timestamp
- `status`: 'confirmed' | 'cancelled'
- `createdAt`: timestamp

**Indexes Required**:
- `userId` + `status` (for user registrations query)
- `eventId` + `status` (for event registrations query)
- `userId` + `eventId` + `status` (for duplicate check)

### password_reset_tokens
Password reset tokens (temporary).

**Fields**:
- `id`: string (reset token)
- `userId`: string
- `email`: string
- `expiresAt`: timestamp
- `used`: boolean
- `createdAt`: timestamp

**Indexes Required**:
- `expiresAt` (for cleanup queries)

## Data Relationships

- User → Transactions (one-to-many)
- User → EventRegistrations (one-to-many)
- Event → EventRegistrations (one-to-many)
- Transaction → EventRegistrations (one-to-many)

## Query Patterns

### Get active transactions for user
```javascript
db.collection('transactions')
  .where('userId', '==', userId)
  .where('isActive', '==', true)
```

### Get user registrations
```javascript
db.collection('event_registrations')
  .where('userId', '==', userId)
  .where('status', '==', 'confirmed')
```

### Get active events
```javascript
db.collection('events')
  .where('isActive', '==', true)
```

