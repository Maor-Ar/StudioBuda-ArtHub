import { USER_ROLES } from '../../config/constants.js';
import { AuthorizationError } from '../../utils/errors.js';
import { requireRole, requireAuth } from './auth.js';

export const requireManager = (context) => {
  return requireRole(context, [USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
};

export const requireAdmin = (context) => {
  return requireRole(context, [USER_ROLES.ADMIN]);
};

export const requireAuthenticated = (context) => {
  return requireAuth(context);
};

