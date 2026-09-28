import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';

export const SESSION_COOKIE = 'rc_session';
const SESSION_DAYS = 7;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.cookieSecure,
  path: '/api',
});

export function startSession(res, user) {
  const token = jwt.sign({ sub: user.id, v: user.tokenVersion }, config.jwtSecret, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

export function endSession(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Please sign in.' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    endSession(res);
    return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
  }

  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.v) {
    endSession(res);
    return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
  }
  req.user = user;
  return next();
}
