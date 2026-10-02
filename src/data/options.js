// Choices the CMS offers for fields that map to built-in visuals.
// Shared by the site, the CMS forms and the API's validation.

export const GLYPH_OPTIONS = [
  { value: 'spark', label: '✦ Spark (AI)' },
  { value: 'code', label: '</> Code' },
  { value: 'braces', label: '{ } Braces' },
  { value: 'prompt', label: '>_ Prompt' },
];

export const SERVICE_ICON_OPTIONS = [
  { value: 'web', label: 'Browser with code' },
  { value: 'mobile', label: 'Smartphone' },
  { value: 'ai', label: 'AI chip' },
  { value: 'cloud', label: 'Cloud upload' },
  { value: 'design', label: 'Design layers' },
  { value: 'team', label: 'Team' },
  { value: 'data', label: 'Database' },
  { value: 'qa', label: 'Shield with check' },
];

export const INDUSTRY_VISUAL_OPTIONS = [
  { value: 'fintech', label: 'Bank card & banking app' },
  { value: 'health', label: 'Health dashboard & watch' },
  { value: 'commerce', label: 'Product card & order toast' },
  { value: 'logistics', label: 'Route map & ETA' },
  { value: 'media', label: 'Video player' },
  { value: 'saas', label: 'Revenue dashboard' },
];

export const SOLUTION_VISUAL_OPTIONS = [
  { value: 'mvp', label: 'Roadmap timeline' },
  { value: 'copilot', label: 'AI chat' },
  { value: 'modernize', label: 'Monolith → services' },
  { value: 'extend', label: 'Team video call' },
];

export const WORK_TAG_OPTIONS = [
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'ai', label: 'AI' },
];

export const WORK_DEVICE_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'laptop', label: 'Laptop' },
];

export const WORK_APP_OPTIONS = [
  { value: 'fintech', label: 'Banking app' },
  { value: 'health', label: 'Health app' },
  { value: 'commerce', label: 'Storefront' },
  { value: 'logistics', label: 'Fleet map' },
];

export const SOCIAL_ICON_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'x', label: 'X' },
];

export const optionValues = (options) => options.map((o) => o.value);
