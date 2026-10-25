import { defineConfig } from '@playwright/test';

const video = process.env.PW_VIDEO === 'off' ? 'off' : 'on';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  timeout: 30_000,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
