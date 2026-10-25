import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: { video: process.env.PW_VIDEO === "off" ? "off" : "on" },
  reporter: [["list"], ["html", { open: "never" }]],
});
