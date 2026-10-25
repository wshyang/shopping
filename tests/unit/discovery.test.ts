import { expect, it } from "vitest";
import { findCards } from "../../src/discovery/find-cards";
it("ignores malformed/offsite links and keeps valid same-origin goods cards", () => {
  const document = new DOMParser().parseFromString(
    '<a href="https://%/?goods_id=1">bad</a><a href="https://example.com/goods.html?goods_id=2">offsite</a><a href="https://mobile.pinduoduo.com/goods.html?goods_id=3">洗衣粉</a>',
    "text/html",
  );
  expect(findCards(document).map((card) => card.record.goodsId)).toEqual(["3"]);
});
