import { readFile, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
const [input, output] = process.argv.slice(2);
if (!input?.startsWith(".auth/") || !output?.startsWith(".auth/"))
  throw new Error(
    "Use .auth/ input AND output; reviewed fixtures must be copied manually.",
  );
const dom = new JSDOM(await readFile(input, "utf8"));
for (const node of dom.window.document.querySelectorAll(
  "script,style,iframe,form,input,textarea,meta,link",
))
  node.remove();
function safeGoodsLink(attribute) {
  if (attribute.name !== "href") return null;
  try {
    const url = new URL(attribute.value, "https://mobile.pinduoduo.com");
    const id = url.searchParams.get("goods_id");
    if (
      url.origin !== "https://mobile.pinduoduo.com" ||
      url.pathname !== "/goods.html" ||
      !/^\d+$/.test(id ?? "")
    )
      return null;
    return `/goods.html?goods_id=${id}`;
  } catch {
    return null;
  }
}
for (const node of dom.window.document.querySelectorAll("*")) {
  for (const attribute of [...node.attributes]) {
    const link = safeGoodsLink(attribute);
    node.removeAttribute(attribute.name);
    if (link) node.setAttribute("href", link);
  }
}
const walker = dom.window.document.createTreeWalker(
  dom.window.document,
  dom.window.NodeFilter.SHOW_COMMENT,
);
const comments = [];
while (walker.nextNode()) comments.push(walker.currentNode);
comments.forEach((node) => node.remove());
const result = dom
  .serialize()
  .replace(/(?:PDDAccessToken|pdd_user_id|anti_content)[^<\n]*/gi, "[REDACTED]")
  .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, "[PHONE]");
await writeFile(output, result, { mode: 0o600 });
console.log(
  "Candidate only: manually remove names, addresses, account IDs and other private text before copying to tests/fixtures/pdd. Scripts were removed; rawData requires separate manual allowlisting.",
);
