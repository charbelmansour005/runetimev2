import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { HERO_SHAPE_OPTIONS, optionValues } from '../../src/data/options.js';
import { SiteContent } from '../models/SiteContent.js';
import { seedContent } from './defaults.js';
import { User } from '../models/User.js';

// Hero slides saved before the particle sculpture had a crystal symbol
// (`glyph`) and shard colours (`shardFrom`/`shardTo`). Converts them in place
// and keeps every other edit.
const GLYPH_SHAPES = { spark: 'neural', code: 'screens', braces: 'globe', prompt: 'infinity' };

async function migrateHeroSlides() {
  const doc = await SiteContent.collection.findOne({ key: 'site' }, { projection: { 'hero.slides': 1 } });
  const slides = doc?.hero?.slides;
  if (!Array.isArray(slides) || slides.every((slide) => slide.shape)) return;

  const shapes = optionValues(HERO_SHAPE_OPTIONS);
  const converted = slides.map(({ glyph, shardFrom, shardTo, ...slide }, i) => ({
    ...slide,
    shape: slide.shape ?? GLYPH_SHAPES[glyph] ?? shapes[i % shapes.length],
    from: slide.from ?? shardFrom ?? '#C7B8FA',
    to: slide.to ?? shardTo ?? '#7C6CF0',
  }));
  await SiteContent.collection.updateOne({ _id: doc._id }, { $set: { 'hero.slides': converted } });
  console.log('[setup] converted the hero slides to particle shapes');
}

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
  } else {
    try {
      await migrateHeroSlides();
    } catch (err) {
      // The site copes with unconverted slides, so don't take the API down over it.
      console.error(`[setup] could not convert the hero slides: ${err.message}`);
    }
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
