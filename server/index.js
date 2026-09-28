import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectWithRetry } from './db.js';
import { bootstrap } from './lib/bootstrap.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port} (${config.isProd ? 'production' : 'development'})`);
});

connectWithRetry(config.mongoUri, {
  onConnected: async () => {
    // Only report drops after a successful connection, not between retries.
    mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
    mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
    await bootstrap();
  },
}).catch((err) => {
  console.error('[db] setup failed:', err);
});

async function shutdown(signal) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
