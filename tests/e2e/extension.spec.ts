import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
// Explicitly synthetic browser integration, not A-003 recorded-response acceptance.
test("unpacked extension: manual start, review badge, cap and CSV download", async () => {
  const profile = await mkdtemp(path.join(tmpdir(), "shopper-"));
  const extension = path.resolve(".output/chrome-mv3");
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    recordVideo:
      process.env.PW_VIDEO === "off"
        ? undefined
        : { dir: "test-results/videos" },
  });
  try {
    let requests = 0;
    await context.route("https://mobile.pinduoduo.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/goods.html") {
        requests++;
        await route.fulfill({
          contentType: "text/html",
          body: "<main>商品评价(22999)</main>",
        });
        return;
      }
      await route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html lang="zh-CN"><body><a href="/goods.html?goods_id=123"><img alt="洗衣粉">¥19.9 热销3.5万+件</a></body></html>',
      });
    });
    const page = await context.newPage();
    await page.goto(
      "https://mobile.pinduoduo.com/search_result.html?search_key=test",
    );
    await expect(page.getByTestId("review-panel__start-button")).toBeVisible();
    expect(requests).toBe(0);
    await page.getByTestId("review-panel__start-button").click();
    await expect(page.getByTestId("review-badge__count")).toHaveText(
      "评价 22,999",
    );
    expect(requests).toBe(1);
    const download = page.waitForEvent("download");
    await page.getByTestId("review-panel__export-csv-button").click();
    expect((await download).suggestedFilename()).toMatch(/^pdd-test-.*\.csv$/);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
