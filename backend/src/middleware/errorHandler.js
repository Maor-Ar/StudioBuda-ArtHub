import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    field: err.field,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      errors: [
        {
          message: err.message,
          code: err.code,
          field: err.field || undefined,
        },
      ],
    });
  }

  // Handle GraphQL errors
  if (err.extensions) {
    return res.status(err.extensions.statusCode || 500).json({
      errors: [
        {
          message: err.message,
          code: err.extensions.code || 'INTERNAL_ERROR',
          field: err.extensions.field || undefined,
        },
      ],
    });
  }

  // Default error
  return res.status(500).json({
    errors: [
      {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    ],
  });
};

