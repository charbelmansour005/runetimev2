import bcrypt from 'bcryptjs';
import { fail, handle, json, readJson } from '../../../../../../server/http.js';
import { startSession } from '../../../../../../server/session.js';

export const PUT = handle(
  async (request, { user }) => {
    const body = await readJson(request);
    const currentPassword = String(body?.currentPassword ?? '');
    const newPassword = String(body?.newPassword ?? '');
    if (newPassword.length < 10) return fail(400, 'Use at least 10 characters for the new password.');
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return fail(400, 'Your current password is incorrect.');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1; // signs out every other session
    await user.save();
    await startSession(user);
    return json({ ok: true });
  },
  { auth: true },
);
