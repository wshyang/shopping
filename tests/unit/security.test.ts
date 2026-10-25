import { readdir, readFile } from "node:fs/promises";
import { expect, it } from "vitest";
it("recorded fixture files contain no known session keys or phone-like strings", async () => {
  const files = (await readdir("tests/fixtures/pdd")).filter((name) =>
    /\.(html|json)$/.test(name),
  );
  for (const name of files) {
    const content = await readFile(`tests/fixtures/pdd/${name}`, "utf8");
    expect(content).not.toMatch(
      /PDDAccessToken|pdd_user_id|anti_content|(?<!\d)1[3-9]\d{9}(?!\d)/,
    );
  }
});
it("limits extension permissions and never ships auth material", async () => {
  const text = await readFile("wxt.config.ts", "utf8");
  expect(text).not.toMatch(
    /<all_urls>|['"]cookies['"]|['"]tabs['"]|webRequest/,
  );
  expect(await readFile(".gitignore", "utf8")).toContain(".auth/");
});
