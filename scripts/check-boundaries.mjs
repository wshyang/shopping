import { readdir, readFile } from "node:fs/promises";
for (const file of await readdir("src/ui")) {
  const text = await readFile(`src/ui/${file}`, "utf8");
  if (/from ['"].*(?:fetching|cache)\//.test(text))
    throw new Error(`UI I/O boundary violation: ${file}`);
}
