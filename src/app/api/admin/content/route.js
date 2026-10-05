import { fail, handle, json } from '../../../../../server/http.js';
import { serializeContent } from '../../../../../server/lib/content.js';
import { SiteContent } from '../../../../../server/models/SiteContent.js';

export const GET = handle(
  async () => {
    const doc = await SiteContent.getSingleton();
    if (!doc) return fail(404, 'No site content yet.');
    return json(serializeContent(doc));
  },
  { auth: true },
);
