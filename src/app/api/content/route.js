import { fail, handle, json } from '../../../../server/http.js';
import { getPublicContent } from '../../../../server/lib/content.js';

export const dynamic = 'force-dynamic';

// The public content as JSON. The pages don't need it (they're rendered on the
// server from the same data); it's here for anything else that reads the site.
export const GET = handle(async () => {
  const content = await getPublicContent();
  if (!content) return fail(404, 'No site content yet.');
  return json(content, { headers: { 'Cache-Control': 'no-cache' } });
});
