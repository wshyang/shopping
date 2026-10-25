/**
 * Harvest session state after manual login.
 * Usage: npm run recon:harvest  (while browser.mjs is still running)
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('.auth', { recursive: true });

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
if (contexts.length === 0) {
  console.error('[harvest] No context found. Is browser.mjs running?');
  process.exit(1);
}
const context = contexts[0];

// storage-state (cookies + localStorage)
const storageState = await context.storageState();
writeFileSync('.auth/storage-state.json', JSON.stringify(storageState, null, 2));
console.log('[harvest] Wrote .auth/storage-state.json');

// sessionStorage per page
const pages = context.pages();
const sessionData = {};
for (const page of pages) {
  const data = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key) out[key] = sessionStorage.getItem(key);
    }
    return out;
  });
  sessionData[page.url()] = data;
}
writeFileSync('.auth/session-storage.json', JSON.stringify(sessionData, null, 2));
console.log('[harvest] Wrote .auth/session-storage.json');

await browser.close();
console.log('[harvest] Done. Keep .auth/ git-ignored and never commit it.');
