import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { connectOnce } from '../db.js';
import { SiteContent } from '../models/SiteContent.js';
import { seedContent } from './defaults.js';
import { User } from '../models/User.js';

// First-run setup: default content and the first CMS admin.
export async function bootstrap() {
  // Runs on every cold start, so the independent checks go out together.
  const [hasContent, userCount] = await Promise.all([
    SiteContent.exists({ key: 'site' }),
    User.estimatedDocumentCount(),
  ]);

  if (!hasContent) {
    await SiteContent.create({ key: 'site', ...seedContent(), updatedBy: 'seed' });
    console.log('[setup] created the site content from the defaults');
  }

  if (userCount === 0) {
    if (config.adminEmail && config.adminPassword) {
      await User.create({
        email: config.adminEmail,
        name: 'Admin',
        passwordHash: await bcrypt.hash(config.adminPassword, 12),
      });
      console.log(`[setup] created the CMS admin ${config.adminEmail} (password from ADMIN_PASSWORD in .env)`);
    } else {
      console.warn('[setup] no CMS users yet — set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart to create one');
    }
  }
}

// Connects (once) and runs the first-run setup. Rejects while the database is
// unreachable.
export const ensureDb = () => connectOnce(config.mongoUri, { onConnected: bootstrap });
