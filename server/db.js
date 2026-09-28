import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export const isDbReady = () => mongoose.connection.readyState === 1;

function explain(err) {
  const msg = String(err?.message ?? err);
  if (/bad auth|authentication failed/i.test(msg)) {
    return 'authentication failed — check the username and password in MONGODB_URI (Atlas → Database Access)';
  }
  if (/whitelist|not authorized to access|ECONNREFUSED|Server selection timed out/i.test(msg)) {
    return `${msg.split('\n')[0]} — if this is Atlas, make sure this machine's IP is on the Network Access list`;
  }
  return msg.split('\n')[0];
}

// Keeps retrying so the site (which falls back to built-in content) can start
// even while the database is unreachable.
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
