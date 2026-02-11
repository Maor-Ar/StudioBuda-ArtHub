/**
 * User-Friendly Error Messages in Hebrew
 * Maps backend errors and technical errors to friendly Hebrew messages
 */

/**
 * Authentication error messages
 */
export const AUTH_ERRORS = {
  // Login errors
  INVALID_CREDENTIALS: 'נראה שטעית באחד מהשדות, נסה שוב',
  WRONG_PASSWORD: 'נראה שטעית באחד מהשדות, נסה שוב',
  USER_NOT_FOUND: 'נראה שטעית באחד מהשדות, נסה שוב',
  INVALID_EMAIL: 'כתובת האימייל אינה תקינה',

  // Registration errors
  EMAIL_EXISTS: 'כתובת האימייל כבר קיימת במערכת',
  USER_EXISTS: 'משתמש עם אימייל זה כבר קיים במערכת',
  WEAK_PASSWORD: 'הסיסמה חלשה מדי, נסה סיסמה חזקה יותר',

  // OAuth errors
  OAUTH_CANCELLED: 'ההתחברות בוטלה',
  OAUTH_FAILED: 'ההתחברות נכשלה, נסה שוב',
  GOOGLE_SIGNIN_FAILED: 'ההתחברות עם Google נכשלה, נסה שוב',
  FACEBOOK_LOGIN_FAILED: 'ההתחברות עם Facebook נכשלה, נסה שוב',
  APPLE_SIGNIN_FAILED: 'ההתחברות עם Apple נכשלה, נסה שוב',

  // Network errors
  NETWORK_ERROR: 'אופס, נראה שיש בעיה בחיבור לאינטרנט',
  SERVER_ERROR: 'אופס, נראה שיש בעיה בשרת, תנסה שוב מאוחר יותר',
  TIMEOUT: 'הפעולה ארכה זמן רב מדי, נסה שוב',

  // General errors
  UNKNOWN_ERROR: 'משהו השתבש, נסה שוב',
  VALIDATION_ERROR: 'אחד מהשדות אינו תקין',
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'התחברת בהצלחה!',
  REGISTER_SUCCESS: 'נרשמת בהצלחה!',
  OAUTH_SUCCESS: 'התחברת בהצלחה!',
  PASSWORD_RESET_SENT: 'נשלח אליך מייל לאיפוס סיסמה',
  PASSWORD_RESET_SUCCESS: 'הסיסמה אופסה בהצלחה',
};

/**
 * Maps GraphQL errors to user-friendly messages
 * @param {Error} error - GraphQL error object
 * @returns {string} - User-friendly error message in Hebrew
 */
export const getGraphQLErrorMessage = (error) => {
  if (!error) {
    return AUTH_ERRORS.UNKNOWN_ERROR;
  }

  // Extract error message from GraphQL error
  const errorMessage = error.graphQLErrors?.[0]?.message || error.message || '';
  const lowerMessage = errorMessage.toLowerCase();

  // If backend already returned a Hebrew message, show it as-is.
  // (Many of our backend validation errors are user-facing.)
  if (/[\u0590-\u05FF]/.test(errorMessage)) {
    return errorMessage;
  }

  // Network errors
  if (error.networkError || lowerMessage.includes('network')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }

  // Domain-specific registration / purchase errors
  if (lowerMessage.includes('active subscription') || lowerMessage.includes('punch card')) {
    return 'כדי להירשם לשיעור צריך מנוי פעיל או כרטיסייה עם כניסות שנותרו.';
  }
  if (lowerMessage.includes('trial lesson transaction required') || lowerMessage.includes('trial transaction required')) {
    return 'כדי להירשם לשיעור ניסיון צריך קודם לרכוש שיעור ניסיון.';
  }
  if (lowerMessage.includes('transaction data required for paid workshop')) {
    return 'לסדנה בתשלום צריך לבצע תשלום לפני הרשמה.';
  }
  if (lowerMessage.includes('already registered')) {
    return 'כבר נרשמת לשיעור הזה.';
  }
  if (lowerMessage.includes('full capacity') || lowerMessage.includes('event is at full capacity')) {
    return 'השיעור מלא, אין מקומות פנויים.';
  }

  // Authentication errors
  if (lowerMessage.includes('invalid email') || lowerMessage.includes('invalid password')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }

  if (lowerMessage.includes('user not found')) {
    return AUTH_ERRORS.USER_NOT_FOUND;
  }

  if (lowerMessage.includes('wrong password')) {
    return AUTH_ERRORS.WRONG_PASSWORD;
  }

  if (lowerMessage.includes('email already exists') || lowerMessage.includes('user already exists')) {
    return AUTH_ERRORS.EMAIL_EXISTS;
  }

  if (lowerMessage.includes('weak password')) {
    return AUTH_ERRORS.WEAK_PASSWORD;
  }

  // Server errors
  if (lowerMessage.includes('server error') || lowerMessage.includes('internal')) {
    return AUTH_ERRORS.SERVER_ERROR;
  }

  // Validation errors
  if (lowerMessage.includes('validation')) {
    return AUTH_ERRORS.VALIDATION_ERROR;
  }

  // Default to a friendly generic error
  return AUTH_ERRORS.UNKNOWN_ERROR;
};

/**
 * Maps OAuth errors to user-friendly messages
 * @param {Error} error - OAuth error object
 * @param {string} provider - OAuth provider (google, facebook, apple)
 * @returns {string} - User-friendly error message in Hebrew
 */
export const getOAuthErrorMessage = (error, provider) => {
  if (!error) {
    return AUTH_ERRORS.OAUTH_FAILED;
  }

  const errorMessage = error.message || '';
  const lowerMessage = errorMessage.toLowerCase();

  // User cancellation - don't show error
  if (lowerMessage.includes('cancelled') || lowerMessage.includes('canceled')) {
    return null; // No message for user cancellation
  }

  // Pass through Hebrew messages (e.g. popup blocker hint)
  if (errorMessage && /[\u0590-\u05FF]/.test(errorMessage)) {
    return errorMessage;
  }

  // Network errors
  if (lowerMessage.includes('network')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }

  // Provider-specific errors
  switch (provider) {
    case 'google':
      if (lowerMessage.includes('play services')) {
        return 'Google Play Services לא זמין במכשיר זה';
      }
      return AUTH_ERRORS.GOOGLE_SIGNIN_FAILED;

    case 'facebook':
      return AUTH_ERRORS.FACEBOOK_LOGIN_FAILED;

    case 'apple':
      if (lowerMessage.includes('not available')) {
        return 'התחברות עם Apple לא זמינה במכשיר זה';
      }
      return AUTH_ERRORS.APPLE_SIGNIN_FAILED;

    default:
      return AUTH_ERRORS.OAUTH_FAILED;
  }
};

/**
 * Gets a friendly error message for any error type
 * @param {Error} error - Error object
 * @param {string} context - Context of the error (login, register, oauth)
 * @returns {string} - User-friendly error message
 */
export const getFriendlyErrorMessage = (error, context = 'general') => {
  if (!error) {
    return AUTH_ERRORS.UNKNOWN_ERROR;
  }

  // Check if it's a GraphQL error
  if (error.graphQLErrors || error.networkError) {
    return getGraphQLErrorMessage(error);
  }

  // Check if it's a validation error (custom errors from our validation)
  if (error.message && typeof error.message === 'string') {
    const message = error.message;

    // If the error message is already in Hebrew, return it
    if (/[\u0590-\u05FF]/.test(message)) {
      return message;
    }
  }

  // Network timeout
  if (error.message?.includes('timeout')) {
    return AUTH_ERRORS.TIMEOUT;
  }

  // Default friendly error
  return AUTH_ERRORS.UNKNOWN_ERROR;
};
