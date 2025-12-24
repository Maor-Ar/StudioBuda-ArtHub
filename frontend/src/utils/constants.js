// API Configuration
export const GRAPHQL_ENDPOINT = __DEV__
  ? 'http://localhost:4000/graphql' // Change to your local IP for physical device testing
  : 'https://your-production-url.com/graphql';

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@studiobuda:auth_token',
  USER_DATA: '@studiobuda:user_data',
};

// Event Types
export const EVENT_TYPES = {
  TRIAL: 'trial',
  SUBSCRIPTION_ONLY: 'subscription_only',
  PAID_WORKSHOP: 'paid_workshop',
};

// Transaction Types
export const TRANSACTION_TYPES = {
  SUBSCRIPTION: 'subscription',
  PUNCH_CARD: 'punch_card',
  TRIAL_LESSON: 'trial_lesson',
};

// User Roles
export const USER_ROLES = {
  USER: 'user',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

// OAuth Providers
export const OAUTH_PROVIDERS = {
  FACEBOOK: 'facebook',
  GOOGLE: 'google',
  APPLE: 'apple',
};

// Products (hardcoded for now - can be moved to config/API later)
export const PRODUCTS = [
  {
    id: 'subscription-monthly',
    name: 'Monthly Subscription',
    description: 'Unlimited monthly classes',
    type: TRANSACTION_TYPES.SUBSCRIPTION,
    growUrl: 'https://grow.com/products/subscription-monthly', // Replace with actual Grow URL
  },
  {
    id: 'punch-card-10',
    name: '10-Class Punch Card',
    description: '10 classes to use anytime',
    type: TRANSACTION_TYPES.PUNCH_CARD,
    growUrl: 'https://grow.com/products/punch-card-10', // Replace with actual Grow URL
  },
  {
    id: 'trial-lesson',
    name: 'Trial Lesson',
    description: 'Try your first class',
    type: TRANSACTION_TYPES.TRIAL_LESSON,
    growUrl: 'https://grow.com/products/trial-lesson', // Replace with actual Grow URL
  },
];

