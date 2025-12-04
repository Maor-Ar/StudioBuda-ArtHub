import authService from '../../services/authService.js';
import { AuthenticationError } from '../../utils/errors.js';
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
      return context;
    }

    const token = authHeader.substring(7);
    const decodedToken = await authService.verifyToken(token);

    // Get user from Firestore
    const userService = (await import('../../services/userService.js')).default;
    const user = await userService.getUserById(decodedToken.uid);

    context.user = user;
    context.userId = user.id;
    context.role = user.role;
  } catch (error) {
    logger.error('Context creation error:', error);
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

