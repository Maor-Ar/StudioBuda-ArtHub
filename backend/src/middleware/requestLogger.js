/**
 * Per-request HTTP logging (disabled: too noisy in production).
 * Re-enable and use logger.debug if you need request tracing:
 *   res.on('finish', () => { logger.debug('HTTP', { method, url, statusCode, duration: Date.now() - start }); });
 */
export const requestLogger = (req, res, next) => {
  next();
};

