import { fail, handle, json } from '../../../../../server/http.js';
import { getArticle } from '../../../../../server/lib/content.js';

export const dynamic = 'force-dynamic';

// One article with its full text.
export const GET = handle(async (request, { params }) => {
  const article = await getArticle(params.slug);
  if (!article) return fail(404, 'Article not found.');
  return json(article, { headers: { 'Cache-Control': 'no-cache' } });
});
