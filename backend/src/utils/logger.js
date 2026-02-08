import winston from 'winston';
import config from '../config/environment.js';

const isProduction = config.server.nodeEnv === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: 'studiobuda-backend' },
  transports: [
    // Cloud Run best practice: log to stdout/stderr so logs are visible in
    // Cloud Logging. Keep JSON format in production.
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;

