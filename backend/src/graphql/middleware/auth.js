import authService from '../../services/authService.js';
import { AuthenticationError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Create OAuth user in Firestore from decoded Firebase token.
 * Used when user exists in Firebase Auth (valid token) but not in Firestore -
 * e.g. race with loginWithOAuth or prior registration failure.
 */
async function ensureOAuthUserInFirestore(decodedToken) {
  if (!decodedToken.email) {
    throw new AuthenticationError('OAuth token missing email');
  }
  const nameFromToken = decodedToken.name || decodedToken.displayName || '';
  const nameParts = (nameFromToken || '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User');
  const lastName = nameParts.slice(1).join(' ') || '';

  const user = await authService.createUser({
    firstName,
    lastName,
    phone: '',
    email: decodedToken.email,
    passwordHash: null,
    userType: 'google',
    role: 'user',
    firebaseUid: decodedToken.uid,
  });
  logger.info(`[AUTH] Auto-created Firestore user for OAuth: ${user.id}, email: ${user.email}`);
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

