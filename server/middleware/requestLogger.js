// Request/Response Logger Middleware
import log from '../logger.js';

let _id = 0;

export default function requestLogger(req, res, next) {
  req._logId = ++_id;
  req._logStart = Date.now();

  log.reqStart(req);

  // Pfad und Methode jetzt merken (Express kann req.path später ändern)
  const method = req.method;
  const path   = req.originalUrl || req.url;

  // Intercept res.end to log response
  const origEnd = res.end.bind(res);
  res.end = function (...args) {
    const ms = Date.now() - req._logStart;
    log.reqEnd(method, path, req._logId, res.statusCode, ms);
    return origEnd(...args);
  };

  next();
}
