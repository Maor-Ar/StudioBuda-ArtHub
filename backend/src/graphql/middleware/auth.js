import authService from '../../services/authService.js';
import { AuthenticationError, NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

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
      // Check if it's a NotFoundError (user doesn't exist in Firestore)
      const isNotFoundError = error instanceof NotFoundError || 
                              error.name === 'NotFoundError' || 
                              error.constructor?.name === 'NotFoundError' ||
                              (error.message && error.message.includes('User not found'));
      
      if (isNotFoundError) {
        // Data integrity issue: User exists in Firebase Auth but not in Firestore
        // This should not happen in normal flow - registration creates both
        // Log as error for investigation
        logger.error(`[AUTH] DATA INTEGRITY ISSUE: User ${decodedToken.uid} exists in Firebase Auth but not in Firestore. This indicates a registration failure or data corruption. User must re-register or data must be manually fixed.`);
        
        // Don't create user automatically - this is a data integrity issue
        // The user should re-register or an admin should fix the data
        throw new AuthenticationError('User account is incomplete. Please contact support or re-register.');
      } else {
        // Re-throw if it's not a NotFoundError
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

