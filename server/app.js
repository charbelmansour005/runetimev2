import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { PAGES } from './lib/html.js';
import { errorHandler, notFound } from './middleware/errors.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import pageRoutes from './routes/pages.js';
import publicRoutes from './routes/public.js';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          // Only force HTTPS sub-resources when the site is actually served over HTTPS.
          'upgrade-insecure-requests': config.cookieSecure ? [] : null,
        },
      },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);
  // Articles and the sitemap, built from the CMS content.
  app.use(pageRoutes);

  // In production the API also serves the built site (npm run build → dist/).
  if (existsSync(path.join(distDir, 'index.html'))) {
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    // Real pages get their HTML (each with its own <head>); anything else is a 404.
    const pageFiles = Object.fromEntries(PAGES.map((page) => [page.path, page.file]));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const pathname = req.path.replace(/\/+$/, '') || '/';
      const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
      const page = isAdmin ? 'admin.html' : pageFiles[pathname];
      res.setHeader('Cache-Control', 'no-cache');
      if (!page) return res.status(404).sendFile(path.join(distDir, '404.html'));
      if (isAdmin) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.sendFile(path.join(distDir, page));
    });
  }

  app.use(errorHandler);
  return app;
}
