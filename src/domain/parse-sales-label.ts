import type { SalesLabel } from "./goods-record";
export function parseSalesLabel(raw: string): SalesLabel | null {
  const match =
    /^(热销|本店已拼|已拼)\s*(\d+(?:\.\d+)?)\s*(万|亿)?(\+)?件?$/.exec(
      raw.trim(),
    );
  if (!match) return null;
  const count = Math.round(
    Number(match[2]) * (match[3] === "亿" ? 1e8 : match[3] === "万" ? 1e4 : 1),
  );
  if (!Number.isSafeInteger(count)) return null;
  return {
    raw,
    kind:
      match[1] === "热销"
        ? "hot_sales"
        : match[1] === "本店已拼"
          ? "shop_group"
          : "group",
    count,
    isLowerBound: !!match[4],
  };
}
