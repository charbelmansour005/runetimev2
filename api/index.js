// Vercel serverless entry. vercel.json rewrites every /api/* request here and
// the Express app routes it as usual; the rest of the site is static (dist/).
import { createApp } from '../server/app.js';
import { config } from '../server/config.js';
import { connectOnce } from '../server/db.js';
import { bootstrap } from '../server/lib/bootstrap.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectOnce(config.mongoUri, { onConnected: bootstrap });
  } catch {
    // Routes that need the database answer 503 (requireDb); the site then
    // falls back to its built-in content.
  }
  return app(req, res);
}
