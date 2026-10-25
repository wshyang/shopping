import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
// Keep all raw responses private. No HAR or response goes directly into tests/.
await mkdir(".auth/captures", { recursive: true, mode: 0o700 });
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
try {
  const pages = browser.contexts()[0]?.pages() ?? [];
  let index = 0;
  for (const page of pages) {
    if (new URL(page.url()).origin !== "https://mobile.pinduoduo.com") continue;
    await writeFile(
      `.auth/captures/page-${index++}.html`,
      await page.content(),
      { mode: 0o600 },
    );
  }
  console.log(
    "Private captures saved. Sanitize and manually inspect before using as fixtures.",
  );
} finally {
  await browser.close();
}
