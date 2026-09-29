import bcrypt from 'bcryptjs';
import express, { Router } from 'express';
import { invalidateContentCache, serializeContent } from '../lib/content.js';
import { Media, mediaUrl, sniffImageType } from '../models/Media.js';
import { Message } from '../models/Message.js';
import { SECTION_KEYS, SiteContent } from '../models/SiteContent.js';
import { requireAuth, startSession } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();
router.use(requireDb, requireAuth);

// ---------- Site content ----------

router.get('/content', async (req, res) => {
  const doc = await SiteContent.getSingleton();
  if (!doc) return res.status(404).json({ error: 'No site content yet.' });
  return res.json(serializeContent(doc));
});

router.put('/content/:section', async (req, res) => {
  const { section } = req.params;
  if (!SECTION_KEYS.includes(section)) return res.status(404).json({ error: `Unknown section "${section}".` });
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Send the section as a JSON object.' });
  }

  const doc = await SiteContent.getSingleton();
  if (!doc) return res.status(404).json({ error: 'No site content yet.' });
  doc.set(section, req.body);
  doc.updatedBy = req.user.email;
  await doc.save();
  invalidateContentCache();

  const saved = serializeContent(doc);
  return res.json({ section, data: saved[section], updatedAt: saved.updatedAt, updatedBy: saved.updatedBy });
});

// ---------- Image uploads ----------

// The CMS sends the (already compressed) image as the raw request body.
// Vercel caps request bodies at 4.5 MB, so stay under that everywhere.
router.post('/media', express.raw({ type: 'image/*', limit: '4mb' }), async (req, res) => {
  const data = Buffer.isBuffer(req.body) ? req.body : null;
  if (!data?.length) return res.status(400).json({ error: 'Send the image file as the request body.' });
  const contentType = sniffImageType(data);
  if (!contentType) return res.status(415).json({ error: 'Use a PNG, JPG, WebP, GIF or AVIF image.' });

  const dimension = (v) => Math.max(0, Math.min(20000, Math.round(Number(v) || 0)));
  const media = await Media.create({
    filename: String(req.query.filename ?? '').slice(0, 200),
    contentType,
    size: data.length,
    width: dimension(req.query.width),
    height: dimension(req.query.height),
    data,
    uploadedBy: req.user.email,
  });
  return res.status(201).json({ url: mediaUrl(media.id), width: media.width, height: media.height, size: media.size });
});

// ---------- Contact form inbox ----------

router.get('/messages', async (req, res) => {
  const [messages, unread] = await Promise.all([
    Message.find().sort({ createdAt: -1 }).limit(500).lean(),
    Message.countDocuments({ read: false }),
  ]);
  res.json({ messages, unread });
});

router.patch('/messages/:id', async (req, res) => {
  if (typeof req.body?.read !== 'boolean') return res.status(400).json({ error: 'Send { "read": true | false }.' });
  const message = await Message.findByIdAndUpdate(req.params.id, { read: req.body.read }, { new: true }).lean();
  if (!message) return res.status(404).json({ error: 'Message not found.' });
  return res.json({ message });
});

router.delete('/messages/:id', async (req, res) => {
  const deleted = await Message.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Message not found.' });
  return res.json({ ok: true });
});

// ---------- Account ----------

router.put('/account/password', async (req, res) => {
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  if (newPassword.length < 10) {
    return res.status(400).json({ error: 'Use at least 10 characters for the new password.' });
  }
  if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }

  req.user.passwordHash = await bcrypt.hash(newPassword, 12);
  req.user.tokenVersion += 1; // signs out every other session
  await req.user.save();
  startSession(res, req.user);
  return res.json({ ok: true });
});

export default router;
