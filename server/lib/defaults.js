import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defaultContent } from '../../src/data/content.js';

// The text of a default article, from src/data/insights/<slug>.md. The site
// itself only bundles the cards, so the text is added when seeding.
function articleText(slug) {
  try {
    return readFileSync(path.join(process.cwd(), 'src/data/insights', `${slug}.md`), 'utf8').trim();
  } catch {
    return '';
  }
}

// The default content for a new database, with the articles' full text.
export function seedContent() {
  const { insights } = defaultContent;
  const items = insights.items.map((post) => ({ ...post, body: post.slug ? articleText(post.slug) : '' }));
  return { ...defaultContent, insights: { ...insights, items } };
}
