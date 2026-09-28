import 'dotenv/config';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name} — set it in .env locally (see .env.example) or in your host's environment settings.`,
    );
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';
// Set automatically on Vercel, where the API runs as a serverless function.
const isVercel = Boolean(process.env.VERCEL);

export const config = {
  isProd,
  isVercel,
  port: Number(process.env.PORT) || 4000,
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  // Session cookies are Secure (HTTPS-only) in production unless overridden.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd || isVercel,
  // Number of reverse proxies in front of the app (e.g. 1 on Render/Railway/Heroku).
  // Vercel's edge is one hop, so client IPs (used for rate limiting) come from X-Forwarded-For.
  trustProxy: Number(process.env.TRUST_PROXY) || (isVercel ? 1 : 0),
};

if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}
