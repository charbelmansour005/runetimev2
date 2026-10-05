import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dev = process.env.NODE_ENV !== 'production';
const root = path.dirname(fileURLToPath(import.meta.url));

// Next puts small inline scripts in every page, so scripts can't be limited to
// 'self' without rendering each page per visit (for a nonce). The site never
// outputs HTML from the CMS, which is what that rule would guard against.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self'${dev ? ' ws:' : ''}`,
].join('; ');

const noIndex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  trailingSlash: false,
  outputFileTracingRoot: root,
  // The default articles' text, read from disk when a new database is seeded.
  outputFileTracingIncludes: { '/**': ['./src/data/insights/*.md'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      { source: '/admin/:path*', headers: noIndex },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
  async redirects() {
    return ['work', 'insights', 'admin'].map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true }));
  },
};
