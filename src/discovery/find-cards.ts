import { goodsUrl, type GoodsRecord } from "../domain/goods-record";
import { parseSalesLabel } from "../domain/parse-sales-label";
export type CardRef = { element: HTMLElement; record: GoodsRecord };
function readGoodsId(anchor: HTMLAnchorElement): string | null {
  try {
    const url = new URL(anchor.href, anchor.ownerDocument.baseURI);
    const id = url.searchParams.get("goods_id");
    return url.origin === "https://mobile.pinduoduo.com" &&
      url.pathname === "/goods.html" &&
      /^\d+$/.test(id ?? "")
      ? id
      : null;
  } catch {
    return null;
  }
}
// Only explicit same-origin goods links; no speculative React/private-state scraping.
export function findCards(document: Document): CardRef[] {
  const cards: CardRef[] = [];
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="goods_id="]',
  )) {
    const id = readGoodsId(anchor);
    if (!id) continue;
    if (anchor.closest("[data-shopper-root]")) continue;
    const text = anchor.textContent?.trim() ?? "";
    const sales = text.match(
      /(?:本店已拼|热销|已拼)\s*\d+(?:\.\d+)?\s*[万亿]?\+?件?/,
    );
    cards.push({
      element: anchor,
      record: {
        goodsId: id,
        title:
          anchor.querySelector("img")?.alt ||
          anchor.getAttribute("title") ||
          text.slice(0, 160) ||
          `商品 ${id}`,
        priceText: text.match(/[¥￥]\s*\d+(?:\.\d+)?/)?.[0] ?? "",
        salesLabel: sales ? parseSalesLabel(sales[0]) : null,
        reviewCount: null,
        url: goodsUrl(id),
        position: cards.length + 1,
        status: "pending",
        errorMessage: null,
        fetchedAt: null,
        source: null,
      },
    });
  }
  return cards;
}
