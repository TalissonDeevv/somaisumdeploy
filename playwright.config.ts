import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', outputDir:'test-results/runs', timeout: 180000, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1280, height: 720 }, headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
