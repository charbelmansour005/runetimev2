import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { ensureDb } from './lib/bootstrap.js';
import { clientKey } from './rateLimit.js';
import { currentUser } from './session.js';

export const json = (data, init) => NextResponse.json(data, init);
export const fail = (status, error, extra) => json({ error, ...extra }, { status });

// Thrown anywhere in a handler to answer with that status and message.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function errorResponse(err) {
  if (err instanceof HttpError) return fail(err.status, err.message);
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
    return fail(400, 'Some fields need attention.', { fields });
  }
  if (err instanceof mongoose.Error.CastError) return fail(400, `Invalid value for ${err.path}.`);
  console.error(err);
  return fail(500, 'Something went wrong on our side.');
}

// Wraps an API route: rate limit, database, sign-in, then the handler, with
// errors turned into JSON answers. The handler gets (request, { params, user,
// limitKey }).
//   limiter: one from rateLimit.js    db: needs the database (default true)
//   auth: needs a signed-in CMS user
export function handle(fn, { limiter, db = true, auth = false } = {}) {
  return async (request, context) => {
    try {
      const ctx = { params: (await context?.params) ?? {} };
      if (limiter) {
        ctx.limitKey = clientKey(request);
        const { ok, retryAfter } = limiter.take(ctx.limitKey);
        if (!ok) return json({ error: limiter.message }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
      }
      if (db) {
        try {
          await ensureDb();
        } catch {
          return fail(503, 'The database is unavailable right now — please try again shortly.');
        }
      }
      if (auth) {
        const { user, error } = await currentUser();
        if (!user) return fail(401, error);
        ctx.user = user;
      }
      return await fn(request, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

const MB = 1024 * 1024;
const declaredSize = (request) => Number(request.headers.get('content-length')) || 0;

// The request's JSON body ({} when there isn't one), up to 1 MB.
export async function readJson(request) {
  if (declaredSize(request) > MB) throw new HttpError(413, 'That request is too large.');
  if (!/\bjson\b/i.test(request.headers.get('content-type') ?? '')) return {};
  const text = await request.text();
  if (text.length > MB) throw new HttpError(413, 'That request is too large.');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'The request body is not valid JSON.');
  }
}

// An uploaded image sent as the raw request body, up to 4 MB (Vercel caps
// request bodies at 4.5 MB). Null when the body isn't an image.
export async function readImage(request) {
  const tooLarge = () => new HttpError(413, 'That file is too large — keep uploads under 4 MB.');
  if (declaredSize(request) > 4 * MB) throw tooLarge();
  if (!/^image\//i.test(request.headers.get('content-type') ?? '')) return null;
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length > 4 * MB) throw tooLarge();
  return data;
}
