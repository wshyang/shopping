import type { GoodsRecord } from "../domain/goods-record";
import type { Settings } from "../settings/settings";
export function toJson(
  rows: readonly GoodsRecord[],
  metadata: { searchKey: string; settings: Settings },
): string {
  return JSON.stringify(
    { ...metadata, exportedAt: new Date().toISOString(), rows },
    null,
    2,
  );
}
