import { test, expect } from '@playwright/test';
import { toCsv } from '../../src/export/to-csv.js';
import { createGoodsRecord, withFetchResult } from '../../src/domain/goods-record.js';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

test('CSV has BOM and correct columns', () => {
  const base = createGoodsRecord({ goodsId: '123', title: '洗衣粉', priceText: '¥10', salesLabel: parseSalesLabel('热销1万件'), url: 'https://mobile.pinduoduo.com/goods.html?goods_id=123', position: 1 });
  const record = withFetchResult(base, { status: 'ok', reviewCount: 999, errorMessage: null }, '2026-10-24T03:15:00.000Z', 'network');
  const csv = toCsv([record]);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('goods_id');
  expect(csv).toContain('123');
  expect(csv).toContain('洗衣粉');
});
