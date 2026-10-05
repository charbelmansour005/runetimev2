import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fail, handle, json, readJson } from '../../../../../server/http.js';
import { User } from '../../../../../server/models/User.js';
import { loginLimiter } from '../../../../../server/rateLimit.js';
import { startSession } from '../../../../../server/session.js';

// Compared against when the email is unknown, so both paths take the same time.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash(randomBytes(16).toString('hex'), 12));

export const POST = handle(
  async (request, { limitKey }) => {
    const body = await readJson(request);
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const user = email ? await User.findOne({ email }) : null;
    const valid = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !valid) return fail(401, 'Wrong email or password.');

    // Only failed attempts count towards the limit.
    loginLimiter.refund(limitKey);
    user.lastLoginAt = new Date();
    await user.save();
    await startSession(user);
    return json({ user: user.toSafeJSON() });
  },
  { limiter: loginLimiter },
);
