import 'dotenv/config';

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './services/games/tests/e2e',
  testMatch: '**/*.e2e-spec.ts',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? '/tmp/crash-game-playwright-results',
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_API_BASE_URL ?? 'http://localhost:8000',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
});
