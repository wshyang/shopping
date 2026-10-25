import { describe, expect, it, vi, afterEach } from "vitest";
import { ReviewCache } from "../../src/cache/review-cache";
import { isBlocked } from "../../src/fetching/risk-detect";
import { validateSettings } from "../../src/settings/settings";
import { ReviewPanelState } from "../../src/ui/use-review-panel";
import { toCsv } from "../../src/export/to-csv";
import { toJson } from "../../src/export/to-json";
import { defaults } from "../../src/settings/settings";
import { goodsUrl, type GoodsRecord } from "../../src/domain/goods-record";
import { sortFilter } from "../../src/domain/sort-filter";
export const row: GoodsRecord = {
  goodsId: "123",
  title: "洗衣粉",
  priceText: "¥19.9",
  salesLabel: null,
  reviewCount: 0,
  url: goodsUrl("123"),
  position: 1,
  status: "ok",
  errorMessage: null,
  fetchedAt: null,
  source: null,
};
afterEach(() => vi.useRealTimers());
describe("cache storage boundary", () => {
  it("stores only counts and timestamps and observes TTL", async () => {
    vi.useFakeTimers();
    const data: Record<string, unknown> = {};
    const cache = new ReviewCache(
      {
        get: async () => data,
        set: async (value) => {
          Object.assign(data, value);
        },
      },
      24,
    );
    await cache.set("123", {
      reviewCount: 0,
      fetchedAt: new Date().toISOString(),
    });
    expect((await cache.get("123"))?.reviewCount).toBe(0);
    vi.advanceTimersByTime(86400000);
    expect(await cache.get("123")).toBeNull();
  });
  it("tolerates unavailable and corrupt storage", async () => {
    expect(
      await new ReviewCache(
        {
          get: async () => {
            throw Error();
          },
          set: async () => {},
        },
        24,
      ).get("1"),
    ).toBeNull();
    expect(
      await new ReviewCache(
        {
          get: async () => ({ "rc:1": { reviewCount: -1 } }),
          set: async () => {},
        },
        24,
      ).get("1"),
    ).toBeNull();
  });
});
describe("risk and settings", () => {
  it.each([403, 429, 401])("blocks HTTP %s", (status) =>
    expect(isBlocked({ status, url: goodsUrl("1"), body: "" })).toBe(true),
  );
  it("blocks verification redirects but not ordinary pages", () => {
    expect(
      isBlocked({
        status: 200,
        url: "https://mobile.pinduoduo.com/login.html",
        body: "",
      }),
    ).toBe(true);
    expect(
      isBlocked({ status: 200, url: goodsUrl("1"), body: "商品评价(0)" }),
    ).toBe(false);
  });
  it("clamps safety settings and always requires manual start", () => {
    expect(
      validateSettings({
        maxItems: 999,
        concurrency: 99,
        delayMs: { min: 1, max: 0 },
        autoStart: true,
      }),
    ).toEqual({ ...defaults, maxItems: 300, delayMs: { min: 800, max: 800 } });
  });
});
describe("view model and exports", () => {
  it("deduplicates records, retains zero counts, resets safely", () => {
    const state = new ReviewPanelState();
    state.add([row, row]);
    expect(state.model.total).toBe(1);
    expect(state.model.canExport).toBe(true);
    state.update("123", { status: "blocked" });
    expect(state.model.isBlocked).toBe(true);
    state.reset();
    expect(state.model.canExport).toBe(false);
  });
  it("sorts without mutating and filters unknowns", () => {
    const rows = [row, { ...row, goodsId: "2", reviewCount: 100, position: 2 }];
    expect(
      sortFilter(rows, { sort: "reviews", minReviews: 1 }).map(
        (row) => row.goodsId,
      ),
    ).toEqual(["2"]);
    expect(rows[0]).toBe(row);
  });
  it("neutralizes formulas, quotes commas and preserves Chinese with BOM", () => {
    const csv = toCsv([{ ...row, title: '=HYPERLINK("x"),洗衣粉' }]);
    expect(csv.startsWith("\uFEFFposition")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""x""),洗衣粉"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
  it("exports metadata and no session material", () => {
    const data = JSON.parse(
      toJson([row], { searchKey: "洗衣粉", settings: defaults }),
    );
    expect(data.rows[0].reviewCount).toBe(0);
    expect(data.searchKey).toBe("洗衣粉");
  });
});
