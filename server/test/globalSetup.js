import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function setup(project) {
  // Pin the binary cache: its default location depends on how vitest is launched, and a cache miss
  // triggers a ~600 MB download that can stall the whole run.
  process.env.MONGOMS_DOWNLOAD_DIR ??= fileURLToPath(new URL('../../node_modules/.cache/mongodb-memory-server', import.meta.url));
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  project.provide('mongoUri', replSet.getUri());
  return () => replSet.stop();
}
