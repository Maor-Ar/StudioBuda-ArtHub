import authService from '../../services/authService.js';
import { AuthenticationError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Enhanced sanitization for OAuth names: removes control chars, emojis, and limits length.
 * Returns fallback if invalid (for lastName).
 */
function sanitizeOAuthName(value, fallback = '') {
  // Remove control characters, emojis, and normalize whitespace
  let s = String(value || '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Control chars
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2000}-\u{206F}]/gu, '') // Unicode punctuation
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 100); // Limit length
  return s.length >= 1 ? s : fallback;
}

/**
 * Create OAuth user in Firestore from decoded Firebase token.
 * Used when user exists in Firebase Auth (valid token) but not in Firestore -
 * e.g. race with loginWithOAuth or prior registration failure.
 */
async function ensureOAuthUserInFirestore(decodedToken) {
  // Edge case: Handle missing email (1-5% of tokens may lack email)
  let userEmail = decodedToken.email;
  if (!userEmail) {
    // Check if email is in identities
    if (decodedToken.firebase?.identities?.email && decodedToken.firebase.identities.email.length > 0) {
      userEmail = decodedToken.firebase.identities.email[0];
      logger.info('[AUTH] Email found in identities for auto-creation', { email: userEmail });
    } else {
      logger.error('[AUTH] OAuth token missing email for auto-creation', { 
        uid: decodedToken.uid, 
        keys: Object.keys(decodedToken)
      });
      throw new AuthenticationError('OAuth token missing email. Please ensure the Google account has an email address.');
    }
  }

  // Enhanced name extraction with multiple fallbacks
  const nameFromToken = decodedToken.name || decodedToken.displayName || '';
  const nameParts = (nameFromToken || '').trim().split(/\s+/).filter(Boolean);
  const rawFirst = nameParts[0] || (userEmail ? userEmail.split('@')[0] : 'User');
  const rawLast = nameParts.slice(1).join(' ') || '';
  const firstName = sanitizeOAuthName(rawFirst, 'User');
  // For OAuth users, if lastName is empty, use firstName as fallback
  const lastName = sanitizeOAuthName(rawLast, firstName || 'User');

  // Determine userType from provider info in token
  const providerInfo = decodedToken.firebase?.sign_in_provider || 'google';
  const userType = providerInfo === 'password' ? 'regular' : providerInfo;

  const user = await authService.createUser({
    firstName,
    lastName,
    phone: '',
    email: userEmail,
    passwordHash: null,
    userType: userType,
    role: 'user',
    firebaseUid: decodedToken.uid,
  });
  logger.info(`[AUTH] Auto-created Firestore user for OAuth: ${user.id}, email: ${user.email}, emailVerified: ${decodedToken.email_verified}`);
  return user;
}

export const createContext = async ({ req }) => {
  const context = {
    user: null,
    userId: null,
    role: null,
  };

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.info('[AUTH] No authorization header found');
      return context;
    }

    const token = authHeader.substring(7);
    logger.info(`[AUTH] Token received, length: ${token.length}, preview: ${token.substring(0, 50)}...`);
    
    const decodedToken = await authService.verifyToken(token);
    logger.info(`[AUTH] Token verified successfully, UID: ${decodedToken.uid}`);

    // Get user from Firestore
    const userService = (await import('../../services/userService.js')).default;
    logger.info(`[AUTH] Looking up user with ID: ${decodedToken.uid}`);
    let user;
    try {
      user = await userService.getUserById(decodedToken.uid);
      logger.info(`[AUTH] User found: ${user.id}, email: ${user.email}`);
    } catch (error) {
      // User exists in Firebase Auth but not in Firestore (OAuth race or prior failure)
      const isNotFoundError = error instanceof NotFoundError || 
                              error.name === 'NotFoundError' || 
                              error.constructor?.name === 'NotFoundError' ||
                              (error.message && error.message.includes('User not found'));
      
      if (isNotFoundError) {
        logger.warn(`[AUTH] User ${decodedToken.uid} in Firebase Auth but not in Firestore - auto-creating from token`);
        try {
          user = await ensureOAuthUserInFirestore(decodedToken);
        } catch (createError) {
          logger.error('[AUTH] Failed to auto-create OAuth user:', createError?.message);
          throw new AuthenticationError('User account is incomplete. Please try signing in again.');
        }
      } else {
        throw error;
      }
    }
    
    // If user is still null after all attempts, something went wrong
    if (!user) {
      logger.error(`[AUTH] User is null after lookup and creation attempts for UID: ${decodedToken.uid}`);
      throw new Error('Failed to retrieve or create user');
    }

    context.user = user;
    context.userId = user.id;
    context.role = user.role;
  } catch (error) {
    logger.error('[AUTH] Context creation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    // Don't throw - allow unauthenticated requests for public endpoints
  }

  return context;
};

export const requireAuth = (context) => {
  if (!context.user) {
    throw new AuthenticationError('Authentication required');
  }
  return context.user;
};

export const requireRole = (context, allowedRoles) => {
  const user = requireAuth(context);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthenticationError('Insufficient permissions');
  }
  return user;
};

