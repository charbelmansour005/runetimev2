// Settings from the environment (.env locally, the host's settings in
// production). Read on first use, not at import: `next build` imports every
// route, and must work on a machine that has no secrets.

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
// Set automatically on Vercel.
const isVercel = Boolean(process.env.VERCEL);

export const config = {
  isProd,
  isVercel,
  get mongoUri() {
    return required('MONGODB_URI');
  },
  get jwtSecret() {
    const secret = required('JWT_SECRET');
    if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.');
    return secret;
  },
  get adminEmail() {
    return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD ?? '';
  },
  // Session cookies are Secure (HTTPS-only) in production unless overridden.
  get cookieSecure() {
    return process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd || isVercel;
  },
};

// The public address, for canonical and Open Graph URLs, robots.txt and the
// sitemap. On Vercel it follows the production domain; SITE_URL overrides it.
export const siteUrl = () =>
  (
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    'https://runtimecollective.vercel.app'
  ).replace(/\/+$/, '');
