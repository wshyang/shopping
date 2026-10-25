import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/live',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    storageState: '.auth/storage-state.json',
  },
  projects: [
    {
      name: 'chromium-live',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
