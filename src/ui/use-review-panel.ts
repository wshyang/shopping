import type { GoodsRecord, FetchOutcome } from "../domain/goods-record";
import { sortFilter, type ViewSettings } from "../domain/sort-filter";
export type RunState = "idle" | "running" | "paused" | "done";
export class ReviewPanelState {
  private records = new Map<string, GoodsRecord>();
  state: RunState = "idle";
  view: ViewSettings = { sort: "reviews", minReviews: 0 };
  add(rows: GoodsRecord[]): void {
    for (const row of rows)
      if (!this.records.has(row.goodsId))
        this.records.set(row.goodsId, {
          ...row,
          position: this.records.size + 1,
        });
  }
  update(id: string, result: Partial<FetchOutcome>): void {
    const row = this.records.get(id);
    if (row) this.records.set(id, { ...row, ...result });
  }
  reset(): void {
    this.state = "idle";
    for (const [id, row] of this.records)
      this.records.set(id, {
        ...row,
        reviewCount: null,
        status: "pending",
        errorMessage: null,
        source: null,
        fetchedAt: null,
      });
  }
  get all(): GoodsRecord[] {
    return [...this.records.values()];
  }
  get model() {
    const all = this.all;
    const counts = Object.fromEntries(
      ["pending", "ok", "not_found", "blocked", "error", "skipped_cap"].map(
        (status) => [status, all.filter((row) => row.status === status).length],
      ),
    );
    return {
      state: this.state,
      rows: sortFilter(all, this.view),
      counts,
      total: all.length,
      completed: all.filter(
        (row) => !["pending", "skipped_cap"].includes(row.status),
      ).length,
      canExport: all.some((row) => row.status === "ok"),
      isBlocked: all.some((row) => row.status === "blocked"),
    };
  }
}
export type PanelModel = ReviewPanelState["model"];
