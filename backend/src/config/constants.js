// User roles
export const USER_ROLES = {
  USER: 'user',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

// User types
export const USER_TYPES = {
  REGULAR: 'regular',
  FACEBOOK: 'facebook',
  GOOGLE: 'google',
  APPLE: 'apple',
};

// Event types
export const EVENT_TYPES = {
  TRIAL: 'trial',
  SUBSCRIPTION_ONLY: 'subscription_only',
  PAID_WORKSHOP: 'paid_workshop',
};

// Transaction types
export const TRANSACTION_TYPES = {
  SUBSCRIPTION: 'subscription',
  PUNCH_CARD: 'punch_card',
  TRIAL_LESSON: 'trial_lesson',
};

// Registration status
export const REGISTRATION_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

// Cache TTL (in seconds)
export const CACHE_TTL = {
  USER: 3600, // 1 hour
  EVENT: 1800, // 30 minutes
  EVENTS_ACTIVE: 900, // 15 minutes
  TRANSACTIONS_ACTIVE: 300, // 5 minutes
  REGISTRATIONS_FUTURE: 600, // 10 minutes
};

// Date range limits
export const MAX_EVENT_DATE_RANGE_DAYS = 31; // Max 1 month

// Error codes
export const ERROR_CODES = {
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};

