import type { GoodsRecord } from "../domain/goods-record";
function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function toCsv(rows: readonly GoodsRecord[]): string {
  const header =
    "position,goods_id,title,price,sales_label,sales_count,sales_is_lower_bound,review_count,status,fetched_at,url";
  const lines = rows.map((row) =>
    [
      row.position,
      row.goodsId,
      row.title,
      row.priceText,
      row.salesLabel?.raw,
      row.salesLabel?.count,
      row.salesLabel?.isLowerBound,
      row.reviewCount,
      row.status,
      row.fetchedAt,
      row.url,
    ]
      .map(cell)
      .join(","),
  );
  return "\uFEFF" + [header, ...lines].join("\r\n") + "\r\n";
}
