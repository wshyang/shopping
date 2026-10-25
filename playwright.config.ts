import { defineConfig, devices } from '@playwright/test';

const videoMode = process.env.PW_VIDEO === 'off' ? 'off' : 'retain-on-failure';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    video: videoMode as 'off' | 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // E2E serves sanitized fixtures via route interception — no external network.
  // Video on by default, off with PW_VIDEO=off (GREENFIELD §3).
  webServer: undefined,
});
