// A small in-memory rate limiter. Counts are kept per server process (per
// function instance on Vercel), which is enough to slow down guessing and spam.

// Who's asking. Vercel sets these headers itself; elsewhere they're only
// trusted when TRUST_PROXY says there's a proxy in front (its value is how
// many), and without one every request shares a single count.
export function clientKey(request) {
  const forwarded = (request.headers.get('x-forwarded-for') ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  if (process.env.VERCEL) return request.headers.get('x-real-ip') || forwarded[0] || 'unknown';
  const hops = Number(process.env.TRUST_PROXY) || 0;
  return (hops && forwarded[forwarded.length - hops]) || 'direct';
}

export function rateLimit({ windowMs, limit, message }) {
  const hits = new Map(); // key → { count, resetAt }

  function entry(key, now) {
    let current = hits.get(key);
    if (!current || current.resetAt <= now) {
      // Drop finished windows now and then, so the map can't grow forever.
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      current = { count: 0, resetAt: now + windowMs };
      hits.set(key, current);
    }
    return current;
  }

  return {
    message,
    // Counts this request; `ok` is false once the limit is passed.
    take(key) {
      const now = Date.now();
      const current = entry(key, now);
      current.count += 1;
      return { ok: current.count <= limit, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
    },
    // Takes a request back off the count (a sign-in that succeeded).
    refund(key) {
      const current = hits.get(key);
      if (current && current.count > 0) current.count -= 1;
    },
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many sign-in attempts — try again in 15 minutes.',
});

export const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: 'You’ve sent a few messages already — please try again in a little while.',
});
