// npm run seed            → create the default content and first admin if missing
// npm run seed -- --reset → overwrite the site content with the defaults
//                           (CMS users and contact messages are kept)
import mongoose from 'mongoose';
import { config } from '../config.js';
import { defaultContent } from '../../src/data/content.js';
import { bootstrap } from '../lib/bootstrap.js';
import { SECTION_KEYS, SiteContent } from '../models/SiteContent.js';

const reset = process.argv.includes('--reset');

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`[seed] connected to "${mongoose.connection.name}"`);

  if (reset) {
    const doc = (await SiteContent.getSingleton()) ?? new SiteContent({ key: 'site' });
    for (const key of SECTION_KEYS) doc.set(key, defaultContent[key]);
    doc.updatedBy = 'seed --reset';
    await doc.save();
    console.log('[seed] site content reset to the defaults');
  }
  await bootstrap();
  console.log('[seed] done');
} catch (err) {
  console.error('[seed] failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
