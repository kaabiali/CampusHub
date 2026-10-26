import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function setup(project) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  project.provide('mongoUri', replSet.getUri());
  return () => replSet.stop();
}
