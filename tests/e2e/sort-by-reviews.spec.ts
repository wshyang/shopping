import { test, expect } from '@playwright/test';
import { applySortFilter } from '../../src/domain/sort-filter.js';
import { createGoodsRecord, withFetchResult } from '../../src/domain/goods-record.js';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

function makeRecord(goodsId: string, reviewCount: number): ReturnType<typeof createGoodsRecord> {
  const base = createGoodsRecord({ goodsId, title: `Item ${goodsId}`, priceText: '¥10', salesLabel: parseSalesLabel('热销1万件'), url: `https://mobile.pinduoduo.com/goods.html?goods_id=${goodsId}`, position: parseInt(goodsId, 10) });
  return withFetchResult(base, { status: 'ok', reviewCount, errorMessage: null }, new Date().toISOString(), 'network');
}

test('sort by reviews descending', () => {
  const records = [makeRecord('1', 10), makeRecord('2', 500), makeRecord('3', 100)];
  const sorted = applySortFilter(records, { sortKey: 'reviews_desc', minReviews: null });
  expect(sorted.map((record) => record.goodsId)).toEqual(['2', '3', '1']);
});
