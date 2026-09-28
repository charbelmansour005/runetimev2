import { Router } from 'express';
import { config } from '../config.js';
import { isDbReady } from '../db.js';
import { getPublicContent } from '../lib/content.js';
import { Message } from '../models/Message.js';
import { contactLimiter } from '../middleware/rateLimits.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, database: isDbReady() ? 'connected' : 'unavailable' });
});

router.get('/content', requireDb, async (req, res) => {
  const content = await getPublicContent();
  if (!content) return res.status(404).json({ error: 'No site content yet.' });
  // On Vercel, let the CDN answer instantly and refresh in the background, so
  // visitors never wait on a cold function; CMS edits show within ~10 seconds.
  res.set(
    'Cache-Control',
    config.isVercel ? 'public, max-age=0, s-maxage=10, stale-while-revalidate=86400' : 'no-cache',
  );
  return res.json(content);
});

router.post('/contact', contactLimiter, requireDb, async (req, res) => {
  const { name, email, company, message, website } = req.body ?? {};
  // "website" is a hidden honeypot field: people never fill it in, bots do.
  if (website) return res.status(201).json({ ok: true });
  await Message.create({
    name: String(name ?? ''),
    email: String(email ?? ''),
    company: String(company ?? ''),
    message: String(message ?? ''),
  });
  return res.status(201).json({ ok: true });
});

export default router;
