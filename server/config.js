import 'dotenv/config';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name} — copy .env.example to .env and fill it in.`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  // Session cookies are Secure (HTTPS-only) in production unless overridden.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  // Number of reverse proxies in front of the app (e.g. 1 on Render/Railway/Heroku).
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
};

if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}
