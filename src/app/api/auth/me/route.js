import { handle, json } from '../../../../../server/http.js';

export const GET = handle(async (request, { user }) => json({ user: user.toSafeJSON() }), { auth: true });
