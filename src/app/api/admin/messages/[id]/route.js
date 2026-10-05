import { fail, handle, json, readJson } from '../../../../../../server/http.js';
import { Message } from '../../../../../../server/models/Message.js';

export const PATCH = handle(
  async (request, { params }) => {
    const body = await readJson(request);
    if (typeof body?.read !== 'boolean') return fail(400, 'Send { "read": true | false }.');
    const message = await Message.findByIdAndUpdate(params.id, { read: body.read }, { new: true }).lean();
    if (!message) return fail(404, 'Message not found.');
    return json({ message });
  },
  { auth: true },
);

export const DELETE = handle(
  async (request, { params }) => {
    const deleted = await Message.findByIdAndDelete(params.id);
    if (!deleted) return fail(404, 'Message not found.');
    return json({ ok: true });
  },
  { auth: true },
);
