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

// Connect on the first request and reuse the connection while the server (or
// serverless function instance) stays up. After a failure, wait before trying
// again so requests fail fast (503) instead of each waiting on a timeout.
// The state lives on globalThis so it survives hot reloads in development.
const RETRY_COOLDOWN_MS = 20_000;
const state = (globalThis.__rcDb ??= { pending: null, lastFailureAt: 0 });

export function connectOnce(uri, { onConnected } = {}) {
  if (isDbReady()) return Promise.resolve();
  if (state.pending) return state.pending;
  if (mongoose.connection.readyState === 2) return mongoose.connection.asPromise();
  if (Date.now() - state.lastFailureAt < RETRY_COOLDOWN_MS) {
    return Promise.reject(new Error('database unavailable (waiting before the next attempt)'));
  }

  state.pending = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5_000, maxPoolSize: 5 })
    .then(async () => {
      console.log(`[db] connected to "${mongoose.connection.name}"`);
      await onConnected?.();
    })
    .catch(async (err) => {
      state.lastFailureAt = Date.now();
      console.error(`[db] connection failed: ${explain(err)}`);
      await mongoose.disconnect().catch(() => {});
      throw err;
    })
    .finally(() => {
      state.pending = null;
    });
  return state.pending;
}
