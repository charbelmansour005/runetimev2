import mongoose from 'mongoose';
import {
  GLYPH_OPTIONS,
  HERO_SHAPE_OPTIONS,
  INDUSTRY_VISUAL_OPTIONS,
  SERVICE_ICON_OPTIONS,
  SOCIAL_ICON_OPTIONS,
  SOLUTION_VISUAL_OPTIONS,
  WORK_APP_OPTIONS,
  WORK_DEVICE_OPTIONS,
  WORK_TAG_OPTIONS,
  optionValues,
} from '../../src/data/options.js';
import { MEDIA_URL_PATTERN } from './Media.js';
import { EMAIL_PATTERN } from './Message.js';

const { Schema } = mongoose;

// ---------- Field helpers ----------

const tooLong = (max) => [max, `Keep this under ${max} characters`];

const text = (max, { required = true } = {}) =>
  required
    ? { type: String, trim: true, maxlength: tooLong(max), required: [true, 'This field is required'] }
    : { type: String, trim: true, maxlength: tooLong(max), default: '' };

const color = {
  type: String,
  trim: true,
  required: [true, 'Pick a colour'],
  match: [/^#(?:[0-9a-f]{3}){1,2}$/i, '"{VALUE}" is not a hex colour like #4D00F2'],
};

const oneOf = (options) => ({
  type: String,
  required: [true, 'Choose an option'],
  enum: { values: optionValues(options), message: '"{VALUE}" isn’t one of the available options' },
});

const link = {
  type: String,
  trim: true,
  maxlength: 500,
  default: '',
  validate: {
    validator: (v) => !v || /^(https?:\/\/|mailto:|\/|#)/i.test(v),
    message: 'Links must start with https://, mailto:, / or #',
  },
};

// An image uploaded through the CMS (served from /api/media/<id>), or empty.
const image = {
  type: String,
  trim: true,
  default: '',
  validate: {
    validator: (v) => !v || MEDIA_URL_PATTERN.test(v),
    message: 'Upload the image through the CMS',
  },
};

const lines = ({ min = 1, max, maxLength, label = 'lines' }) => ({
  type: [{ type: String, trim: true, maxlength: tooLong(maxLength) }],
  validate: {
    validator: (v) => v.length >= min && v.length <= max && v.every((s) => s.length > 0),
    message: `Needs ${min === max ? min : `${min}–${max}`} non-empty ${label}`,
  },
});

const list = (schema, { min = 0, max }) => ({
  type: [schema],
  validate: {
    validator: (v) => v.length >= min && v.length <= max,
    message: min ? `Needs between ${min} and ${max} items` : `Can hold at most ${max} items`,
  },
});

const section = (definition) => new Schema(definition, { _id: false });

// ---------- Item schemas (array items keep an _id so the CMS can track them) ----------

const socialSchema = new Schema({
  label: text(40),
  icon: oneOf(SOCIAL_ICON_OPTIONS),
  href: link,
});

const slideSchema = new Schema({
  headline: lines({ min: 1, max: 5, maxLength: 40, label: 'headline lines' }),
  tabTitle: text(40),
  tabText: text(90),
  shape: oneOf(HERO_SHAPE_OPTIONS),
  from: color,
  to: color,
  glow: color,
});

const serviceSchema = new Schema({
  icon: oneOf(SERVICE_ICON_OPTIONS),
  title: text(60),
  text: text(240),
});

const industrySchema = new Schema({
  name: text(60),
  visual: oneOf(INDUSTRY_VISUAL_OPTIONS),
  text: text(320),
  points: lines({ min: 1, max: 6, maxLength: 60, label: 'bullet points' }),
});

const solutionSchema = new Schema({
  title: text(60),
  visual: oneOf(SOLUTION_VISUAL_OPTIONS),
  text: text(240),
});

const workSchema = new Schema({
  name: text(60),
  excerpt: text(200),
  tags: {
    type: [{ type: String, enum: optionValues(WORK_TAG_OPTIONS) }],
    validate: { validator: (v) => v.length > 0, message: 'Pick at least one tag' },
  },
  bg: color,
  device: oneOf(WORK_DEVICE_OPTIONS),
  app: oneOf(WORK_APP_OPTIONS),
  url: link,
  // When set, the tile shows this image instead of the drawn device mockup.
  image,
  imageFit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
  icon: section({ from: color, to: color, mark: text(2), accent: color }),
});

const statSchema = new Schema({
  value: text(12),
  label: text(60),
});

const insightSchema = new Schema({
  title: text(140),
  date: { type: String, required: [true, 'Pick a date'], match: [/^\d{4}-\d{2}-\d{2}$/, 'Dates look like 2026-09-28'] },
  tag: text(40),
  url: link,
  art: section({ from: color, to: color, glow: color, glyph: oneOf(GLYPH_OPTIONS) }),
});

const menuPromo = section({ title: text(60), text: text(160) });

// ---------- The site document ----------

export const SECTION_KEYS = [
  'seo',
  'brand',
  'hero',
  'about',
  'services',
  'industries',
  'solutions',
  'work',
  'stack',
  'numbers',
  'insights',
  'contact',
];

const siteContentSchema = new Schema(
  {
    key: { type: String, default: 'site', unique: true, immutable: true },
    seo: section({ title: text(70), description: text(170) }),
    brand: section({
      name: text(60),
      tagline: text(120),
      email: { ...text(200), lowercase: true, match: [EMAIL_PATTERN, 'That email address doesn’t look right'] },
      socials: list(socialSchema, { max: 8 }),
    }),
    hero: section({ slides: list(slideSchema, { min: 1, max: 6 }) }),
    about: section({
      title: text(120),
      paragraphs: lines({ min: 1, max: 6, maxLength: 1200, label: 'paragraphs' }),
    }),
    services: section({
      title: text(80),
      intro: text(400, { required: false }),
      menuPromo,
      items: list(serviceSchema, { min: 1, max: 24 }),
    }),
    industries: section({
      title: text(80),
      intro: text(400, { required: false }),
      menuPromo,
      items: list(industrySchema, { min: 1, max: 12 }),
    }),
    solutions: section({
      title: text(80),
      intro: text(400, { required: false }),
      menuPromo,
      items: list(solutionSchema, { min: 1, max: 12 }),
    }),
    work: section({
      title: text(80),
      intro: text(400, { required: false }),
      items: list(workSchema, { min: 1, max: 24 }),
    }),
    stack: section({
      title: text(80),
      items: lines({ min: 1, max: 60, maxLength: 40, label: 'technologies' }),
    }),
    numbers: section({
      title: text(80),
      intro: text(400, { required: false }),
      items: list(statSchema, { min: 1, max: 12 }),
    }),
    insights: section({
      title: text(80),
      intro: text(400, { required: false }),
      items: list(insightSchema, { min: 0, max: 24 }),
    }),
    contact: section({ title: text(120), text: text(400) }),
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true, minimize: false },
);

siteContentSchema.statics.getSingleton = function getSingleton() {
  return this.findOne({ key: 'site' });
};

export const SiteContent = mongoose.model('SiteContent', siteContentSchema);
