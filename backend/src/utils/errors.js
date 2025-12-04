import { ERROR_CODES } from '../config/constants.js';

export class AppError extends Error {
  constructor(message, code, statusCode = 500, field = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', field = null) {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, 401, field);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied', field = null) {
    super(message, ERROR_CODES.AUTHORIZATION_ERROR, 403, field);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', field = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, field);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', field = null) {
    super(message, ERROR_CODES.NOT_FOUND_ERROR, 404, field);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict occurred', field = null) {
    super(message, ERROR_CODES.CONFLICT_ERROR, 409, field);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error', field = null) {
    super(message, ERROR_CODES.EXTERNAL_SERVICE_ERROR, 502, field);
  }
}

