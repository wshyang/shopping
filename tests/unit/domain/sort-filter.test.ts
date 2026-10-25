import { describe, expect, it } from 'vitest';
import { createGoodsRecord, withFetchOutcome } from '../../../src/domain/goods-record';
import { sortAndFilterRecords } from '../../../src/domain/sort-filter';
import type { GoodsRecord } from '../../../src/domain/goods-record';

const makeRecord = (
  position: number,
  reviews: number | null,
  sales: number | null,
): GoodsRecord => {
  const record = createGoodsRecord({
    goodsId: String(position),
    title: `商品 ${position}`,
    priceText: '¥10',
    salesLabel:
      sales === null
        ? null
        : { raw: String(sales), kind: 'group', count: sales, isLowerBound: false },
    url: `https://mobile.pinduoduo.com/goods.html?goods_id=${position}`,
    position,
  });
  if (reviews === null) return record;
  return withFetchOutcome(record, {
    status: 'ok',
    reviewCount: reviews,
    source: 'network',
    errorMessage: null,
    fetchedAt: '2026-10-24T00:00:00.000Z',
  });
};

const records = [
  makeRecord(1, 100, 1_000),
  makeRecord(2, 900, 1_000),
  makeRecord(3, null, null),
  makeRecord(4, 300, 600),
];

describe('sortAndFilterRecords', () => {
  it('sorts reviews descending and leaves the input untouched', () => {
    const input = [...records];
    expect(
      sortAndFilterRecords(input, { minimumReviews: 0, sort: 'reviews_desc' }).map(
        ({ goodsId }) => goodsId,
      ),
    ).toEqual(['2', '4', '1', '3']);
    expect(input).toEqual(records);
  });

  it('filters unknown and low counts when a positive minimum is set', () => {
    expect(
      sortAndFilterRecords(records, { minimumReviews: 200, sort: 'position_asc' }).map(
        ({ goodsId }) => goodsId,
      ),
    ).toEqual(['2', '4']);
  });

  it('sorts by sales and feedback ratio with unknown values last', () => {
    expect(
      sortAndFilterRecords(records, { minimumReviews: 0, sort: 'sales_desc' }).map(
        ({ goodsId }) => goodsId,
      ),
    ).toEqual(['1', '2', '4', '3']);
    expect(
      sortAndFilterRecords(records, { minimumReviews: 0, sort: 'feedback_ratio_desc' }).map(
        ({ goodsId }) => goodsId,
      ),
    ).toEqual(['2', '4', '1', '3']);
  });
});
