import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
if (!context) throw new Error('No Chromium context found on port 9222. Start recon:browser first.');
await mkdir('.auth', { recursive: true });
await context.storageState({ path: '.auth/storage-state.json' });

const sessions = [];
for (const page of context.pages()) {
  if (!page.url().startsWith('https://mobile.pinduoduo.com/')) continue;
  const values = await page.evaluate(() =>
    Object.fromEntries(
      Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
        .filter((key) => key !== null)
        .map((key) => [key, sessionStorage.getItem(key)]),
    ),
  );
  sessions.push({ origin: new URL(page.url()).origin, url: page.url(), values });
}
await writeFile('.auth/session-storage.json', `${JSON.stringify(sessions, null, 2)}\n`, {
  mode: 0o600,
});
console.log('Credential state written under ignored .auth/. Do not copy it into tests or chat.');
