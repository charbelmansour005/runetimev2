import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export const isDbReady = () => mongoose.connection.readyState === 1;

export function explain(err) {
  const msg = String(err?.message ?? err);
  if (/bad auth|authentication failed/i.test(msg)) {
    return 'authentication failed — check the username and password in MONGODB_URI (Atlas → Database Access)';
  }
  if (/whitelist|not authorized to access|ECONNREFUSED|Server selection timed out/i.test(msg)) {
    return `${msg.split('\n')[0]} — if this is Atlas, make sure this machine's IP is on the Network Access list`;
  }
  return msg.split('\n')[0];
}

// Long-running server: keeps retrying so the site (which falls back to
// built-in content) can start even while the database is unreachable.
export async function connectWithRetry(uri, { onConnected } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
      console.log(`[db] connected to "${mongoose.connection.name}"`);
      await onConnected?.();
      return;
    } catch (err) {
      await mongoose.disconnect().catch(() => {});
      const wait = Math.min(60, attempt * 5);
      console.error(`[db] connection failed: ${explain(err)}. Retrying in ${wait}s…`);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    }
  }
}

// Serverless (Vercel): connect on the first request and reuse the connection
// while the function instance stays warm. After a failure, wait before trying
// again so requests fail fast (503) instead of each waiting on a timeout.
const RETRY_COOLDOWN_MS = 20_000;
let pending = null;
let lastFailureAt = 0;

export function connectOnce(uri, { onConnected } = {}) {
  if (isDbReady()) return Promise.resolve();
  if (pending) return pending;
  if (mongoose.connection.readyState === 2) return mongoose.connection.asPromise();
  if (Date.now() - lastFailureAt < RETRY_COOLDOWN_MS) {
    return Promise.reject(new Error('database unavailable (waiting before the next attempt)'));
  }

  pending = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5_000, maxPoolSize: 5 })
    .then(async () => {
      console.log(`[db] connected to "${mongoose.connection.name}"`);
      await onConnected?.();
    })
    .catch(async (err) => {
      lastFailureAt = Date.now();
      console.error(`[db] connection failed: ${explain(err)}`);
      await mongoose.disconnect().catch(() => {});
      throw err;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
