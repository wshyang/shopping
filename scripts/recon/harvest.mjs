import { chromium } from "@playwright/test";
import { mkdir, writeFile, chmod } from "node:fs/promises";
await mkdir(".auth", { recursive: true, mode: 0o700 });
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
try {
  const context = browser.contexts()[0];
  if (!context) throw new Error("No browser context");
  const session = [];
  for (const page of context.pages()) {
    if (new URL(page.url()).origin !== "https://mobile.pinduoduo.com") continue;
    session.push(
      await page.evaluate(() => ({
        origin: location.origin,
        values: { ...sessionStorage },
      })),
    );
  }
  await context.storageState({ path: ".auth/storage-state.json" });
  await writeFile(".auth/session-storage.json", JSON.stringify(session), {
    mode: 0o600,
  });
  await chmod(".auth/storage-state.json", 0o600);
  console.log("Saved locally under .auth/. Never upload these files.");
} finally {
  await browser.close();
}
