import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: '../e2e-results/artifacts',
  // The specs share the stub's request log, so they run one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: '../e2e-results/report', open: 'never' }]]
    : 'list',
  use: {
    baseURL: process.env.GRAFANA_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node astra-stub.mjs',
    url: 'http://localhost:9201/__requests',
    reuseExistingServer: !process.env.CI,
  },
});
