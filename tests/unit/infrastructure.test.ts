import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
it("activates inert pipeline into scratch and refuses overwrite/invalid owner", () => {
  const target = mkdtempSync(path.join(tmpdir(), "shopper-ci-"));
  try {
    const args = [
      "activate-shiphats.sh",
      "--non-interactive",
      "--keep-inert",
      "--output-dir",
      target,
    ];
    const env = { ...process.env, SHIPHATS_CODE_OWNER: "@shopping-team" };
    execFileSync("bash", args, { env });
    expect(readFileSync(path.join(target, ".gitlab/CODEOWNERS"), "utf8")).toBe(
      "* @shopping-team\n",
    );
    const pipeline = readFileSync(path.join(target, ".gitlab-ci.yml"), "utf8");
    expect(pipeline).toContain("build-job:");
    expect(pipeline).toContain("npm run test:coverage");
    expect(pipeline).not.toContain("@@SHIPHATS_");
    expect(spawnSync("bash", args, { env }).status).not.toBe(0);
    execFileSync("bash", [...args, "--force"], { env });
    expect(
      spawnSync("bash", [...args, "--force"], {
        env: { ...env, SHIPHATS_CODE_OWNER: "bad; command" },
      }).status,
    ).not.toBe(0);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
it("keeps Bash 3.2 syntax and Playwright pipeline versions aligned", () => {
  const script = readFileSync("activate-shiphats.sh", "utf8");
  expect(script).not.toMatch(/declare -A|mapfile|\$\{\w+,,\}/);
  const version = JSON.parse(readFileSync("package.json", "utf8"))
    .devDependencies["@playwright/test"];
  expect(readFileSync(".gitlab-ci.yml.shiphats", "utf8")).toContain(
    `playwright:v${version}-noble`,
  );
});
