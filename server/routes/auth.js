import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { User } from '../models/User.js';
import { endSession, requireAuth, startSession } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimits.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

// Compared against when the email is unknown, so both paths take the same time.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash(randomBytes(16).toString('hex'), 12));

router.post('/login', loginLimiter, requireDb, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = email ? await User.findOne({ email }) : null;
  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return res.status(401).json({ error: 'Wrong email or password.' });

  user.lastLoginAt = new Date();
  await user.save();
  startSession(res, user);
  return res.json({ user: user.toSafeJSON() });
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.json({ ok: true });
});

router.get('/me', requireDb, requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

export default router;
