import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // The scenarios share one database, so they run one after another.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    // Uses the locally installed Edge, so no Playwright browser download is required.
    channel: 'msedge',
    locale: 'fr-FR',
    timezoneId: 'Africa/Tunis',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
