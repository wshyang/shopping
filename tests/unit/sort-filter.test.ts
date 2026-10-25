import { describe, it, expect } from 'vitest';
import { applySortFilter } from '../../src/domain/sort-filter.js';
import type { GoodsRecord } from '../../src/domain/goods-record.js';
import { createGoodsRecord, withFetchResult } from '../../src/domain/goods-record.js';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

function makeRecord(overrides: Partial<{ goodsId: string; position: number; reviewCount: number | null; salesLabelRaw: string | null; status: import('../../src/domain/goods-record.js').FetchOutcome['status'] }>): GoodsRecord {
  const base = createGoodsRecord({
    goodsId: overrides.goodsId ?? '1',
    title: 'Test',
    priceText: '¥10',
    salesLabel: overrides.salesLabelRaw !== undefined ? (overrides.salesLabelRaw ? parseSalesLabel(overrides.salesLabelRaw) : null) : null,
    url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1',
    position: overrides.position ?? 1,
  });
  if (overrides.reviewCount !== undefined || overrides.status !== undefined) {
    return withFetchResult(base, { status: overrides.status ?? 'ok', reviewCount: overrides.reviewCount ?? null, errorMessage: null }, new Date().toISOString(), 'network');
  }
  return base;
}

describe('applySortFilter', () => {
  const records: GoodsRecord[] = [
    makeRecord({ goodsId: 'a', position: 2, reviewCount: 100, status: 'ok' }),
    makeRecord({ goodsId: 'b', position: 1, reviewCount: 500, status: 'ok' }),
    makeRecord({ goodsId: 'c', position: 3, reviewCount: 50, status: 'ok' }),
  ];

  it('sorts by reviews_desc descending', () => {
    const result = applySortFilter(records, { sortKey: 'reviews_desc', minReviews: null });
    expect(result.map((record) => record.goodsId)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by position_asc', () => {
    const result = applySortFilter(records, { sortKey: 'position_asc', minReviews: null });
    expect(result.map((record) => record.goodsId)).toEqual(['b', 'a', 'c']);
  });

  it('filters by minReviews', () => {
    const result = applySortFilter(records, { sortKey: 'reviews_desc', minReviews: 100 });
    expect(result.map((record) => record.goodsId)).toEqual(['b', 'a']);
  });

  it('null minReviews shows all', () => {
    const result = applySortFilter(records, { sortKey: 'reviews_desc', minReviews: null });
    expect(result).toHaveLength(3);
  });

  it('records with null reviewCount go last in reviews_desc', () => {
    const withNull = [...records, makeRecord({ goodsId: 'd', position: 4, reviewCount: null, status: 'not_found' })];
    const result = applySortFilter(withNull, { sortKey: 'reviews_desc', minReviews: null });
    expect(result[result.length - 1].goodsId).toBe('d');
  });

  it('does not mutate input', () => {
    const original = [...records];
    applySortFilter(records, { sortKey: 'reviews_desc', minReviews: 100 });
    expect(records).toEqual(original);
  });

  it('sorts by ratio_desc', () => {
    const ratioRecords = [
      makeRecord({ goodsId: 'a', position: 1, reviewCount: 100, salesLabelRaw: '热销1000件', status: 'ok' }),
      makeRecord({ goodsId: 'b', position: 2, reviewCount: 100, salesLabelRaw: '热销100件', status: 'ok' }),
    ];
    const result = applySortFilter(ratioRecords, { sortKey: 'ratio_desc', minReviews: null });
    // b: 100/100=1, a: 100/1000=0.1 => b first
    expect(result[0].goodsId).toBe('b');
  });
});
