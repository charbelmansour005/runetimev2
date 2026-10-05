import { revalidatePath } from 'next/cache';
import { fail, handle, json, readJson } from '../../../../../../server/http.js';
import { invalidateContentCache, serializeContent } from '../../../../../../server/lib/content.js';
import { SECTION_KEYS, SiteContent } from '../../../../../../server/models/SiteContent.js';

export const PUT = handle(
  async (request, { params, user }) => {
    const { section } = params;
    if (!SECTION_KEYS.includes(section)) return fail(404, `Unknown section "${section}".`);
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Send the section as a JSON object.');

    const doc = await SiteContent.getSingleton();
    if (!doc) return fail(404, 'No site content yet.');
    doc.set(section, body);
    doc.updatedBy = user.email;
    await doc.save();
    // Rebuild every page of the site, so the change is live straight away.
    invalidateContentCache();
    revalidatePath('/', 'layout');

    const saved = serializeContent(doc);
    return json({ section, data: saved[section], updatedAt: saved.updatedAt, updatedBy: saved.updatedBy });
  },
  { auth: true },
);
