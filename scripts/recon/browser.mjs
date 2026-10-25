import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(".auth", { recursive: true, mode: 0o700 });
const context = await chromium.launchPersistentContext(".auth/pdd-profile", {
  headless: false,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  args: [
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=9222",
  ],
});
await (context.pages()[0] ?? (await context.newPage())).goto(
  "https://mobile.pinduoduo.com/login.html",
);
console.log(
  "Log in locally. Do not share credentials or expose port 9222. Close the browser when done.",
);
await new Promise((resolve) => context.on("close", resolve));
