import { handle, json } from '../../../../../server/http.js';
import { Message } from '../../../../../server/models/Message.js';

// The contact form's inbox.
export const GET = handle(
  async () => {
    const [messages, unread] = await Promise.all([
      Message.find().sort({ createdAt: -1 }).limit(500).lean(),
      Message.countDocuments({ read: false }),
    ]);
    return json({ messages, unread });
  },
  { auth: true },
);
