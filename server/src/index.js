import { createServer } from 'node:http';
import { config } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { ensureDefaultCategories } from './models/Category.js';
import { startScheduler } from './jobs/scheduler.js';
import { attachRealtime } from './lib/realtime.js';
import { handleSocket } from './routes/messages.js';

await connectDb(config.mongoUrl);
await ensureDefaultCategories();
startScheduler();

const app = createApp();
const server = createServer(app);
attachRealtime(server, { onConnection: handleSocket });

server.listen(config.port, () => logger.info(`API prête sur http://localhost:${config.port}`));
