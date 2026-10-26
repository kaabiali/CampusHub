import { createServer } from 'node:http';
import { config } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

await connectDb(config.mongoUrl);

const app = createApp();
const server = createServer(app);

server.listen(config.port, () => logger.info(`API prête sur http://localhost:${config.port}`));
