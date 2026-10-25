import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const profilePath = '.auth/pdd-profile';
await mkdir(profilePath, { recursive: true });

const context = await chromium.launchPersistentContext(profilePath, {
  headless: false,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  args: ['--remote-debugging-port=9222'],
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto('https://mobile.pinduoduo.com/login.html', { waitUntil: 'domcontentloaded' });
console.log(
  'Browser opened. Log in manually, navigate to the sample search, then run recon:harvest in another terminal.',
);
console.log('Press Ctrl+C here only after harvesting is complete.');

const close = async () => {
  await context.close();
  process.exit(0);
};
process.once('SIGINT', close);
process.once('SIGTERM', close);
await new Promise(() => undefined);
