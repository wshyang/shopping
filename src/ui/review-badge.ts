import type { GoodsRecord } from "../domain/goods-record";
export function createBadge(element: HTMLElement): (row: GoodsRecord) => void {
  const host = document.createElement("span");
  host.dataset.shopperRoot = "badge";
  const root = host.attachShadow({ mode: "open" });
  const pill = document.createElement("span");
  pill.dataset.testid = "review-badge__count";
  pill.style.cssText =
    "display:inline-block;padding:3px 8px;border-radius:12px;font:12px system-ui;color:#163029;background:#e7e9ed";
  root.append(pill);
  element.append(host);
  return (row) => {
    pill.textContent =
      row.status === "ok"
        ? `评价 ${row.reviewCount!.toLocaleString("zh-CN")}`
        : row.status === "pending"
          ? "评价 …"
          : row.status === "blocked"
            ? "⛔"
            : row.status === "skipped_cap"
              ? "评价 —"
              : "评价 ?";
    pill.title =
      row.errorMessage ??
      (row.source === "cache" ? "本地缓存 / Cached" : "商品评价 / Reviews");
    pill.style.background =
      row.status !== "ok"
        ? "#e7e9ed"
        : row.reviewCount! >= 10000
          ? "#86d8b3"
          : row.reviewCount! >= 1000
            ? "#b9e7d4"
            : row.reviewCount! >= 100
              ? "#d9eee4"
              : "#eff7f2";
  };
}
