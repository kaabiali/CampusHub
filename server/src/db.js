import mongoose from 'mongoose';
import { logger } from './lib/logger.js';

mongoose.set('strictQuery', true);

export async function connectDb(url) {
  mongoose.connection.on('disconnected', () => logger.warn('db_disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('db_reconnected'));
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName) {
    throw new Error('MongoDB is not running as a replica set; transactions will fail. Run `npm run db:init`.');
  }
  logger.info({ replicaSet: hello.setName }, 'db_connected');
}

export const isDbUp = () => mongoose.connection.readyState === 1;
