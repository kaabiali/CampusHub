import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Port 9 (discard) is never open: tests get the fallback unless they start their own fake ML server.
    env: { NODE_ENV: 'test', ML_URL: 'http://127.0.0.1:9' },
    globalSetup: './test/globalSetup.js',
    setupFiles: './test/setup.js',
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
