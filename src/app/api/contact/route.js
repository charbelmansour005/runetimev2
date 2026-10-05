import { handle, json, readJson } from '../../../../server/http.js';
import { Message } from '../../../../server/models/Message.js';
import { contactLimiter } from '../../../../server/rateLimit.js';

export const POST = handle(
  async (request) => {
    const { name, email, phone, company, message, referral_code: trap } = await readJson(request);
    // A hidden spam-trap field: people never see it, bots fill it in.
    if (trap) return json({ ok: true }, { status: 201 });
    await Message.create({
      name: String(name ?? ''),
      email: String(email ?? ''),
      phone: String(phone ?? ''),
      company: String(company ?? ''),
      message: String(message ?? ''),
    });
    return json({ ok: true }, { status: 201 });
  },
  { limiter: contactLimiter },
);
