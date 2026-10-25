export type SalesLabel = {
  raw: string;
  kind: "hot_sales" | "shop_group" | "group" | "unknown";
  count: number | null;
  isLowerBound: boolean;
};
export type FetchStatus =
  | "pending"
  | "ok"
  | "not_found"
  | "blocked"
  | "error"
  | "skipped_cap";
export type GoodsRecord = {
  goodsId: string;
  title: string;
  priceText: string;
  salesLabel: SalesLabel | null;
  reviewCount: number | null;
  url: string;
  position: number;
  status: FetchStatus;
  errorMessage: string | null;
  fetchedAt: string | null;
  source: "cache" | "network" | null;
};
export type FetchOutcome = Pick<
  GoodsRecord,
  "status" | "reviewCount" | "errorMessage" | "fetchedAt" | "source"
>;
export const goodsUrl = (id: string) =>
  `https://mobile.pinduoduo.com/goods.html?goods_id=${encodeURIComponent(id)}`;
