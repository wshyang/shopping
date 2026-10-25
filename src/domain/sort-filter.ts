import type { GoodsRecord } from "./goods-record";
export type ViewSettings = {
  sort: "reviews" | "sales" | "position" | "ratio";
  minReviews: number;
};
function score(row: GoodsRecord, sort: ViewSettings["sort"]): number {
  if (sort === "position") return -row.position;
  if (sort === "reviews") return row.reviewCount ?? -1;
  const sales =
    row.salesLabel?.kind === "shop_group" ? null : row.salesLabel?.count;
  if (sort === "sales") return sales ?? -1;
  return sales && row.reviewCount !== null ? row.reviewCount / sales : -1;
}
export function sortFilter(
  rows: readonly GoodsRecord[],
  view: ViewSettings,
): GoodsRecord[] {
  return rows
    .filter(
      (row) =>
        view.minReviews <= 0 ||
        (row.reviewCount !== null && row.reviewCount >= view.minReviews),
    )
    .sort(
      (a, b) =>
        score(b, view.sort) - score(a, view.sort) || a.position - b.position,
    );
}
