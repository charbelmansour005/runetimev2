import { isDbReady } from '../db.js';

export function requireDb(req, res, next) {
  if (isDbReady()) return next();
  return res.status(503).json({ error: 'The database is unavailable right now — please try again shortly.' });
}
