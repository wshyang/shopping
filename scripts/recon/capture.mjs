/**
 * Capture search + goods pages using the harvested session.
 * Usage: npm run recon:capture
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const SEARCH_URL = 'https://mobile.pinduoduo.com/search_result.html?search_key=%E6%B4%97%E8%A1%A3%E7%B2%89&search_type=goods';

mkdirSync('tests/fixtures/pdd', { recursive: true });

let storageState;
try {
  storageState = JSON.parse(readFileSync('.auth/storage-state.json', 'utf-8'));
} catch {
  console.error('[capture] Missing .auth/storage-state.json. Run recon:browser + recon:harvest first.');
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext({ storageState, isMobile: true, viewport: { width: 390, height: 844 } });
const page = await context.newPage();

// Capture search page
page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('search') && response.request().resourceType() === 'xhr') {
    try {
      const body = await response.text();
      writeFileSync('tests/fixtures/pdd/search-list-page2.json', body);
      console.log('[capture] Saved XHR:', url);
    } catch {}
  }
});
await page.goto(SEARCH_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const searchHtml = await page.content();
writeFileSync('tests/fixtures/pdd/search-xiyifen.html', searchHtml);
console.log('[capture] Saved search HTML');

// Capture 3 goods pages
const links = await page.locator('a[href*="goods_id="]').evaluateAll((els) =>
  els.slice(0, 3).map((el) => el.href),
);
console.log('[capture] Found goods links:', links);

for (let i = 0; i < links.length; i += 1) {
  await page.goto(links[i], { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const html = await page.content();
  const rawData = await page.evaluate(() => window.rawData ?? null);
  if (rawData) writeFileSync(`tests/fixtures/pdd/rawData-${i}.json`, JSON.stringify(rawData, null, 2));
  const suffix = i === 0 ? 'high' : i === 1 ? 'low' : 'zero';
  writeFileSync(`tests/fixtures/pdd/goods-${suffix}.html`, html);
  console.log(`[capture] Saved goods-${suffix}.html`);
}

await browser.close();
console.log('[capture] Done. Now run: npm run recon:sanitize');
