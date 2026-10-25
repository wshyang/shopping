// Synthetic DOM contracts only. These are NOT captured PDD fixtures or live validation.
import { afterEach, expect, it, vi } from "vitest";
import { mountApp } from "../../src/app";
import { defaults } from "../../src/settings/settings";
import { fetchReviewCount } from "../../src/fetching/goods-fetcher";
import { sortFilter } from "../../src/domain/sort-filter";
import { exportFilename } from "../../src/export/download";
const page =
  '<a href="https://mobile.pinduoduo.com/goods.html?goods_id=123"><img alt="洗衣粉">¥19.9 热销3.5万+件</a>';
function storage() {
  const data: Record<string, unknown> = {
    settings: { ...defaults, maxItems: 1 },
  };
  return {
    get: vi.fn(async (key: string) => ({ [key]: data[key] })),
    set: vi.fn(async (values: Record<string, unknown>) => {
      Object.assign(data, values);
    }),
  };
}
function prepare() {
  vi.useFakeTimers();
  document.body.innerHTML = page;
  const local = storage();
  vi.stubGlobal("browser", { storage: { local, sync: storage() } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      url: "https://mobile.pinduoduo.com/goods.html?goods_id=123",
      text: async () => "商品评价(999)",
    })),
  );
  return local;
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
it("composes real modules: start, badges, sorting/filtering, cap, reset, cache reuse and exports", async () => {
  const local = prepare();
  const cleanup = await mountApp();
  const root = document.querySelector(
    '[data-shopper-root="panel"]',
  )!.shadowRoot!;
  const click = (role: string) =>
    (
      root.querySelector(
        `[data-testid="review-panel__${role}"]`,
      ) as HTMLButtonElement
    ).click();
  expect(fetch).not.toHaveBeenCalled();
  click("start-button");
  await vi.advanceTimersByTimeAsync(2000);
  expect(local.set).toHaveBeenCalled();
  expect(root.textContent).toContain("成功 1");
  expect(
    document.querySelector('[data-shopper-root="badge"]')!.shadowRoot!
      .textContent,
  ).toContain("评价 999");
  const sort = root.querySelector("select")!;
  sort.value = "position";
  sort.dispatchEvent(new Event("change"));
  const min = root.querySelector<HTMLInputElement>(
    '[data-testid="review-panel__min-reviews-input"]',
  )!;
  min.value = "1000";
  min.dispatchEvent(new Event("change"));
  expect(
    root.querySelectorAll('[data-testid="review-panel__row"]'),
  ).toHaveLength(0);
  const create = vi.fn(() => "blob:test"),
    revoke = vi.fn();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
  );
  const anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  click("export-csv-button");
  click("export-json-button");
  await vi.advanceTimersByTimeAsync(1000);
  expect(create).toHaveBeenCalledTimes(2);
  anchorClick.mockRestore();
  click("reset-button");
  click("start-button");
  await vi.advanceTimersByTimeAsync(2000);
  expect(fetch).toHaveBeenCalledTimes(1);
  document.body.insertAdjacentHTML(
    "beforeend",
    '<a href="https://mobile.pinduoduo.com/goods.html?goods_id=456">洗衣液</a>',
  );
  await vi.advanceTimersByTimeAsync(500);
  expect(root.textContent).toContain("超出上限 1");
  expect(fetch).toHaveBeenCalledTimes(1);
  click("reset-button");
  cleanup();
  expect(document.querySelector("[data-shopper-root]")).toBeNull();
});
it("shows layout failures without initiating requests", async () => {
  prepare();
  document.body.replaceChildren();
  const cleanup = await mountApp();
  expect(document.querySelector("aside")!.shadowRoot!.textContent).toContain(
    "无法读取",
  );
  cleanup();
});
it.each([
  {
    status: 403,
    url: "https://mobile.pinduoduo.com/goods.html",
    body: "",
    expected: "blocked",
  },
  {
    status: 500,
    url: "https://mobile.pinduoduo.com/goods.html",
    body: "",
    expected: "error",
  },
  {
    status: 404,
    url: "https://mobile.pinduoduo.com/goods.html",
    body: "",
    expected: "not_found",
  },
  {
    status: 200,
    url: "https://mobile.pinduoduo.com/goods.html",
    body: "<script>count=3</script>",
    expected: "not_found",
  },
])(
  "fetch outcome $expected (HTTP $status)",
  async ({ status, url, body, expected }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status,
        url,
        ok: status === 200,
        text: async () => body,
      })),
    );
    expect(
      (await fetchReviewCount("123", new AbortController().signal)).status,
    ).toBe(expected);
  },
);
it("handles transport failure and invalid IDs without guessing", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error();
    }),
  );
  expect(
    (await fetchReviewCount("123", new AbortController().signal)).status,
  ).toBe("error");
  expect(
    (await fetchReviewCount("evil", new AbortController().signal)).status,
  ).toBe("error");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("names downloads in Singapore time with safe filenames", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T00:00:00Z"));
  expect(exportFilename("洗衣/粉")).toBe("pdd-洗衣_粉-261024-080000");
});
it("orders ratios while excluding shop-level sales", () => {
  const base = {
    goodsId: "1",
    title: "",
    priceText: "",
    reviewCount: 10,
    url: "",
    position: 1,
    status: "ok" as const,
    errorMessage: null,
    fetchedAt: null,
    source: null,
  };
  const rows = [
    {
      ...base,
      salesLabel: {
        raw: "本店已拼1",
        kind: "shop_group" as const,
        count: 1,
        isLowerBound: false,
      },
    },
    {
      ...base,
      goodsId: "2",
      position: 2,
      salesLabel: {
        raw: "已拼100",
        kind: "group" as const,
        count: 100,
        isLowerBound: false,
      },
    },
  ];
  expect(sortFilter(rows, { sort: "ratio", minReviews: 0 })[0]?.goodsId).toBe(
    "2",
  );
  expect(sortFilter(rows, { sort: "sales", minReviews: 0 })[0]?.goodsId).toBe(
    "2",
  );
});
it("never follows an opaque redirect to another origin", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ type: "opaqueredirect", status: 0 })),
  );
  expect(
    (await fetchReviewCount("123", new AbortController().signal)).status,
  ).toBe("blocked");
  expect(fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ credentials: "include", redirect: "manual" }),
  );
});
