import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { User } from './models/User.js';

export const SESSION_COOKIE = 'rc_session';
const SESSION_DAYS = 7;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.cookieSecure,
  path: '/api',
});

export async function startSession(user) {
  const token = jwt.sign({ sub: user.id, v: user.tokenVersion }, config.jwtSecret, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_DAYS * 24 * 60 * 60 });
}

export async function endSession() {
  (await cookies()).set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

// The signed-in user, or an `error` to answer 401 with.
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { error: 'Please sign in.' };

  const expired = async () => {
    await endSession();
    return { error: 'Your session has expired — please sign in again.' };
  };
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return expired();
  }
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.v) return expired();
  return { user };
}
