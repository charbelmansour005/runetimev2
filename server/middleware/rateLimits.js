import { rateLimit } from 'express-rate-limit';

const json = (error) => ({ error });

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: json('Too many sign-in attempts — try again in 15 minutes.'),
});

export const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: json('You’ve sent a few messages already — please try again in a little while.'),
});
