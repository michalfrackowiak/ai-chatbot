import { defineConfig, devices } from '@playwright/test';

if (!process.env.BASE_URL) {
  throw new Error('BASE_URL is required for comparison runs.');
}

export default defineConfig({
  testDir: './tests/comparison',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  outputDir: './test-results/comparison-runtime',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 60_000,
  },
});
