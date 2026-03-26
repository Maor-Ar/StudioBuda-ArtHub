import rateLimit from 'express-rate-limit';

const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  !process.env.NODE_ENV;

const GENERAL_MAX_REQUESTS = isDevelopment ? 1000 : 300;

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: GENERAL_MAX_REQUESTS, // Looser limit in development to avoid blocking local test flows
  standardHeaders: true,
  legacyHeaders: false,
  // CORS preflight must not consume the budget or return 429 without ACAO headers
  skip: (req) => req.method === 'OPTIONS',
});

