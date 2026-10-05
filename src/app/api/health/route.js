import { isDbReady } from '../../../../server/db.js';
import { ensureDb } from '../../../../server/lib/bootstrap.js';
import { json } from '../../../../server/http.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureDb().catch(() => {});
  return json({ ok: true, database: isDbReady() ? 'connected' : 'unavailable' });
}
