import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { testOutbox } from '../src/lib/mailer.js';

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${randomBytes(4).toString('hex')}` });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

beforeEach(async () => {
  testOutbox.length = 0;
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
