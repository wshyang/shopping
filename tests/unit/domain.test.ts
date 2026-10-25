import { describe, it, expect } from "vitest";
import { parseSalesLabel } from "../../src/domain/parse-sales-label";
import { parseReviewCount } from "../../src/domain/parse-review-count";
describe("sales grammar (synthetic table cases, not captured PDD data)", () => {
  it.each([
    ["热销3.5万+件", 35000],
    ["本店已拼8318", 8318],
    ["已拼10万+件", 100000],
    ["热销1.2亿+件", 120000000],
  ])("%s", (text, count) => expect(parseSalesLabel(text)?.count).toBe(count));
  it("rejects unrelated labels", () =>
    expect(parseSalesLabel("新品")).toBeNull());
});
describe("review grammar", () => {
  it.each([
    ["商品评价(22,999)", 22999],
    ["商品评价（1.2万+）", 12000],
    ["暂无评价", 0],
    ["商品评价", null],
    ["<script>商品评价(99)</script>", null],
    ["商品评价(1,2)", null],
  ])("%s", (html, count) => expect(parseReviewCount(html)).toBe(count));
});
