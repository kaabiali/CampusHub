import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    globalSetup: './test/globalSetup.js',
    setupFiles: './test/setup.js',
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
