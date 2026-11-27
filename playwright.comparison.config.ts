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
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
  },
});
