import { handle, json } from '../../../../../server/http.js';
import { endSession } from '../../../../../server/session.js';

export const POST = handle(
  async () => {
    await endSession();
    return json({ ok: true });
  },
  { db: false },
);
