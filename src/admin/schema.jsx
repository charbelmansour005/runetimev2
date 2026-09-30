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
} from '../data/options';

// Describes every editable section of the site. The CMS renders its forms
// from this; the API validates the same shapes (server/models/SiteContent.js).
//
// Field types: text, textarea, color, select, date, tags, lines (list of
// strings), group (nested object) and list (list of objects).
// Widths: full (default), half, third, quarter.

const gradientSwatch = (from, to) => (
  <span className="cms-swatch" style={{ background: `linear-gradient(160deg, ${from}, ${to})` }} />
);

const sectionTitle = { name: 'title', type: 'text', label: 'Section title', max: 80 };
const sectionIntro = { name: 'intro', type: 'textarea', label: 'Intro text', max: 400, rows: 2 };
const menuPromo = {
  name: 'menuPromo',
  type: 'group',
  label: 'Dropdown menu promo',
  help: 'The dark card on the right of this section’s dropdown in the top navigation.',
  fields: [
    { name: 'title', type: 'text', label: 'Promo title', max: 60, width: 'half' },
    { name: 'text', type: 'text', label: 'Promo text', max: 160, width: 'half' },
  ],
};

export const SECTIONS = [
  {
    key: 'hero',
    group: 'Home page',
    label: 'Hero slider',
    description:
      'The rotating slides at the top of the page. Each slide has a headline, a tab in the bar at the bottom, and the shape its particles form, with colours.',
    fields: [
      {
        name: 'slides',
        type: 'list',
        label: 'Slides',
        itemLabel: 'slide',
        minItems: 1,
        maxItems: 6,
        summary: (s) => s.headline?.filter(Boolean).join(' '),
        preview: (s) => gradientSwatch(s.from, s.to),
        newItem: () => ({
          headline: ['New headline'],
          tabTitle: 'New tab',
          tabText: 'One line describing this slide',
          shape: 'globe',
          glow: '#8B6BFF',
          from: '#C7B8FA',
          to: '#7C6CF0',
        }),
        fields: [
          {
            name: 'headline',
            type: 'lines',
            label: 'Headline',
            help: 'Each line sits on its own row. Keep lines to about 16 characters so they fit next to the artwork.',
            minItems: 1,
            maxItems: 5,
            maxLength: 40,
            addLabel: 'Add line',
          },
          { name: 'tabTitle', type: 'text', label: 'Tab title', max: 40, width: 'half' },
          { name: 'tabText', type: 'text', label: 'Tab text', max: 90, width: 'half' },
          { name: 'shape', type: 'select', label: 'Particle shape', options: HERO_SHAPE_OPTIONS, width: 'half' },
          { name: 'from', type: 'color', label: 'Particle colour (top)', width: 'third' },
          { name: 'to', type: 'color', label: 'Particle colour (bottom)', width: 'third' },
          { name: 'glow', type: 'color', label: 'Glow behind', width: 'third' },
        ],
      },
    ],
  },
  {
    key: 'about',
    group: 'Home page',
    label: 'About',
    description: 'The introduction under the hero, next to the code window.',
    fields: [
      { name: 'title', type: 'text', label: 'Title', max: 120 },
      {
        name: 'paragraphs',
        type: 'lines',
        multiline: true,
        label: 'Paragraphs',
        help: 'Wrap words in **double asterisks** to make them bold.',
        minItems: 1,
        maxItems: 6,
        maxLength: 1200,
        addLabel: 'Add paragraph',
      },
    ],
  },
  {
    key: 'services',
    group: 'Home page',
    label: 'Services',
    description: 'The grid of service cards. The same list feeds the Services dropdown and the footer.',
    fields: [
      sectionTitle,
      sectionIntro,
      {
        name: 'items',
        type: 'list',
        label: 'Services',
        itemLabel: 'service',
        minItems: 1,
        maxItems: 24,
        summary: (s) => s.title,
        newItem: () => ({ icon: 'web', title: 'New service', text: 'Describe the service in a sentence or two.' }),
        fields: [
          { name: 'title', type: 'text', label: 'Title', max: 60, width: 'half' },
          { name: 'icon', type: 'select', label: 'Icon', options: SERVICE_ICON_OPTIONS, width: 'half' },
          { name: 'text', type: 'textarea', label: 'Description', max: 240, rows: 2 },
        ],
      },
      menuPromo,
    ],
  },
  {
    key: 'industries',
    group: 'Home page',
    label: 'Industries',
    description: 'The dark section with industry tabs. Each industry uses one of the built-in illustrations.',
    fields: [
      sectionTitle,
      sectionIntro,
      {
        name: 'items',
        type: 'list',
        label: 'Industries',
        itemLabel: 'industry',
        minItems: 1,
        maxItems: 12,
        summary: (i) => i.name,
        newItem: () => ({
          name: 'New industry',
          visual: 'saas',
          text: 'What we do for companies in this industry.',
          points: ['First capability'],
        }),
        fields: [
          { name: 'name', type: 'text', label: 'Name', max: 60, width: 'half' },
          { name: 'visual', type: 'select', label: 'Illustration', options: INDUSTRY_VISUAL_OPTIONS, width: 'half' },
          { name: 'text', type: 'textarea', label: 'Description', max: 320, rows: 2 },
          { name: 'points', type: 'lines', label: 'Bullet points', minItems: 1, maxItems: 6, maxLength: 60, addLabel: 'Add bullet' },
        ],
      },
      menuPromo,
    ],
  },
  {
    key: 'solutions',
    group: 'Home page',
    label: 'Solutions',
    description: 'Productized offers, shown as cards with a small interface mockup.',
    fields: [
      sectionTitle,
      sectionIntro,
      {
        name: 'items',
        type: 'list',
        label: 'Solutions',
        itemLabel: 'solution',
        minItems: 1,
        maxItems: 12,
        summary: (s) => s.title,
        newItem: () => ({ title: 'New solution', visual: 'mvp', text: 'What the client gets, and how fast.' }),
        fields: [
          { name: 'title', type: 'text', label: 'Title', max: 60, width: 'half' },
          { name: 'visual', type: 'select', label: 'Mockup', options: SOLUTION_VISUAL_OPTIONS, width: 'half' },
          { name: 'text', type: 'textarea', label: 'Description', max: 240, rows: 2 },
        ],
      },
      menuPromo,
    ],
  },
  {
    key: 'work',
    group: 'Home page',
    label: 'Selected work',
    description: 'Case-study tiles. Tags drive the All / Web / Mobile / AI filter.',
    fields: [
      sectionTitle,
      sectionIntro,
      {
        name: 'items',
        type: 'list',
        label: 'Projects',
        itemLabel: 'project',
        minItems: 1,
        maxItems: 24,
        summary: (w) => w.name,
        preview: (w) =>
          w.image ? (
            <img className="cms-thumb" src={w.image} alt="" />
          ) : (
            <span className="cms-swatch" style={{ background: w.bg }} />
          ),
        newItem: () => ({
          name: 'New project',
          excerpt: 'One sentence about what we built.',
          tags: ['web'],
          bg: '#E4DCFF',
          device: 'phone',
          app: 'fintech',
          url: '',
          image: '',
          imageFit: 'cover',
          icon: { from: '#4D00F2', to: '#8B5CFF', mark: 'N', accent: '#FFFFFF' },
        }),
        fields: [
          { name: 'name', type: 'text', label: 'Project name', max: 60, width: 'half' },
          {
            name: 'url',
            type: 'text',
            inputType: 'url',
            label: 'Case study link',
            max: 500,
            width: 'half',
            placeholder: 'https://… (optional)',
          },
          { name: 'excerpt', type: 'textarea', label: 'Short description', max: 200, rows: 2 },
          { name: 'tags', type: 'tags', label: 'Tags', options: WORK_TAG_OPTIONS },
          {
            name: 'image',
            type: 'image',
            label: 'Project image',
            help: 'Optional. Shown on the tile instead of the drawn mockup. Landscape images (about 4:3) fit best.',
          },
          {
            name: 'imageFit',
            type: 'select',
            label: 'Image fit',
            width: 'half',
            options: [
              { value: 'cover', label: 'Fill the tile (edges may be cropped)' },
              { value: 'contain', label: 'Show the whole image on the tile colour' },
            ],
          },
          { name: 'bg', type: 'color', label: 'Tile background', width: 'half' },
          {
            name: 'device',
            type: 'select',
            label: 'Device mockup (no image)',
            options: WORK_DEVICE_OPTIONS,
            width: 'half',
          },
          { name: 'app', type: 'select', label: 'Screen design (no image)', options: WORK_APP_OPTIONS, width: 'half' },
          {
            name: 'icon',
            type: 'group',
            label: 'App icon (no image)',
            help: 'Used with the drawn mockup when the project has no image.',
            fields: [
              { name: 'mark', type: 'text', label: 'Letter', max: 2, width: 'quarter' },
              { name: 'accent', type: 'color', label: 'Letter colour', width: 'quarter' },
              { name: 'from', type: 'color', label: 'Icon colour (top)', width: 'quarter' },
              { name: 'to', type: 'color', label: 'Icon colour (bottom)', width: 'quarter' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'stack',
    group: 'Home page',
    label: 'Tech stack',
    description: 'The scrolling strip of technologies.',
    fields: [
      sectionTitle,
      { name: 'items', type: 'lines', label: 'Technologies', minItems: 1, maxItems: 60, maxLength: 40, addLabel: 'Add technology' },
    ],
  },
  {
    key: 'numbers',
    group: 'Home page',
    label: 'Numbers',
    description: 'The stats next to the team constellation.',
    fields: [
      sectionTitle,
      sectionIntro,
      {
        name: 'items',
        type: 'list',
        label: 'Stats',
        itemLabel: 'stat',
        minItems: 1,
        maxItems: 12,
        summary: (s) => [s.value, s.label].filter(Boolean).join(' — '),
        newItem: () => ({ value: '10+', label: 'New stat' }),
        fields: [
          {
            name: 'value',
            type: 'text',
            label: 'Value',
            max: 12,
            width: 'third',
            help: '120+, 98% or 1M+ count up on scroll; anything else (like 24/7) is shown as written.',
          },
          { name: 'label', type: 'text', label: 'Label', max: 60, width: 'third' },
        ],
      },
    ],
  },
  {
    key: 'insights',
    group: 'Home page',
    label: 'Insights',
    description: 'Article cards. Link each one to the full post (your blog, LinkedIn, Medium…). Remove them all to hide the section.',
    fields: [
      sectionTitle,
      sectionIntro,
      {
        name: 'items',
        type: 'list',
        label: 'Articles',
        itemLabel: 'article',
        minItems: 0,
        maxItems: 24,
        summary: (p) => p.title,
        preview: (p) => gradientSwatch(p.art?.from, p.art?.to),
        newItem: () => ({
          title: 'New article',
          date: new Date().toISOString().slice(0, 10),
          tag: 'Engineering',
          url: '',
          art: { from: '#2A0A6B', to: '#6D28FF', glow: '#F08BF5', glyph: 'spark' },
        }),
        fields: [
          { name: 'title', type: 'text', label: 'Title', max: 140 },
          { name: 'date', type: 'date', label: 'Date', width: 'third' },
          { name: 'tag', type: 'text', label: 'Category', max: 40, width: 'third' },
          {
            name: 'url',
            type: 'text',
            inputType: 'url',
            label: 'Link',
            max: 500,
            width: 'third',
            placeholder: 'https://… (optional)',
          },
          {
            name: 'art',
            type: 'group',
            label: 'Cover art',
            fields: [
              { name: 'glyph', type: 'select', label: 'Symbol', options: GLYPH_OPTIONS, width: 'quarter' },
              { name: 'glow', type: 'color', label: 'Glow', width: 'quarter' },
              { name: 'from', type: 'color', label: 'Background (top)', width: 'quarter' },
              { name: 'to', type: 'color', label: 'Background (bottom)', width: 'quarter' },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'contact',
    group: 'Home page',
    label: 'Contact',
    description: 'The call to action above the footer. Messages sent through its form land in the Inbox.',
    fields: [
      { name: 'title', type: 'text', label: 'Title', max: 120 },
      { name: 'text', type: 'textarea', label: 'Text', max: 400, rows: 3 },
    ],
  },
  {
    key: 'brand',
    group: 'Settings',
    label: 'Brand & links',
    description: 'Company name, footer tagline, public email and social links.',
    fields: [
      { name: 'name', type: 'text', label: 'Company name', max: 60, width: 'half' },
      { name: 'email', type: 'text', inputType: 'email', label: 'Public email', max: 200, width: 'half' },
      { name: 'tagline', type: 'text', label: 'Footer tagline', max: 120 },
      {
        name: 'socials',
        type: 'list',
        label: 'Social links',
        itemLabel: 'link',
        minItems: 0,
        maxItems: 8,
        summary: (s) => s.label,
        newItem: () => ({ label: 'LinkedIn', icon: 'linkedin', href: 'https://' }),
        fields: [
          { name: 'label', type: 'text', label: 'Label', max: 40, width: 'third' },
          { name: 'icon', type: 'select', label: 'Icon', options: SOCIAL_ICON_OPTIONS, width: 'third' },
          { name: 'href', type: 'text', inputType: 'url', label: 'URL', max: 500, width: 'third' },
        ],
      },
    ],
  },
  {
    key: 'seo',
    group: 'Settings',
    label: 'SEO',
    description: 'How the site appears in search results and browser tabs.',
    fields: [
      { name: 'title', type: 'text', label: 'Page title', max: 70, help: 'Shown in the browser tab and as the search result headline.' },
      { name: 'description', type: 'textarea', label: 'Meta description', max: 170, rows: 3 },
    ],
  },
];

export const SECTION_GROUPS = [...new Set(SECTIONS.map((s) => s.group))];

// Turns an API error path like "slides.1.tabTitle" into "Slides › 2 › Tab title".
export function describePath(fields, parts) {
  const labels = [];
  let current = fields;
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      labels.push(String(Number(part) + 1));
      continue;
    }
    const field = current?.find((f) => f.name === part);
    if (!field) break;
    labels.push(field.label);
    current = field.fields;
  }
  return labels.join(' › ');
}
