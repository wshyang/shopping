/**
 * Recon Phase 0: launch a persistent Chromium for manual login.
 * Usage: npm run recon:browser
 * Requires: npx playwright install chromium
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('.auth/pdd-profile', { recursive: true });

const context = await chromium.launchPersistentContext('.auth/pdd-profile', {
  headless: false,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  args: ['--remote-debugging-port=9222'],
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto('https://mobile.pinduoduo.com/login.html');

console.log('[recon] Browser open. Log in with phone + SMS, then run: npm run recon:harvest');
console.log('[recon] Keep this process running. Press Ctrl+C to close when done.');
