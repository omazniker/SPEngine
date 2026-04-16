// Centralized error handler
import log from '../logger.js';

export default function errorHandler(err, req, res, next) {
  log.error('HTTP', {
    method: req.method,
    path: req.path,
    status: err.status || 500,
    message: err.message,
    stack: err.stack,
  });

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Interner Serverfehler',
    path: req.path,
    timestamp: new Date().toISOString()
  });
}
