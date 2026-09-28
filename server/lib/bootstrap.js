import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { defaultContent } from '../../src/data/content.js';
import { SiteContent } from '../models/SiteContent.js';
import { User } from '../models/User.js';

// First-run setup: default content and the first CMS admin.
export async function bootstrap() {
  if (!(await SiteContent.exists({ key: 'site' }))) {
    await SiteContent.create({ key: 'site', ...defaultContent, updatedBy: 'seed' });
    console.log('[setup] created the site content from the defaults');
  }

  if ((await User.estimatedDocumentCount()) === 0) {
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
