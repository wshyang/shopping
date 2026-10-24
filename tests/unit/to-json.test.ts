import { describe, it, expect } from 'vitest';
import { toJson } from '../../src/export/to-json.js';
import { createGoodsRecord, withFetchResult, DEFAULT_SETTINGS } from '../../src/domain/goods-record.js';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

describe('toJson', () => {
  it('produces valid JSON with metadata', () => {
    const base = createGoodsRecord({
      goodsId: '1',
      title: 'Test',
      priceText: '¥10',
      salesLabel: parseSalesLabel('热销1万件'),
      url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1',
      position: 1,
    });
    const record = withFetchResult(base, { status: 'ok', reviewCount: 100, errorMessage: null }, '2026-10-24T03:15:00.000Z', 'network');
    const json = toJson([record], '洗衣粉', DEFAULT_SETTINGS, new Date('2026-10-24T03:15:00.000Z'));
    const parsed = JSON.parse(json) as { searchKey: string; records: unknown[]; settings: unknown };
    expect(parsed.searchKey).toBe('洗衣粉');
    expect(parsed.records).toHaveLength(1);
    expect(parsed.settings).toBeDefined();
  });

  it('is pretty-printed', () => {
    const json = toJson([], 'test', DEFAULT_SETTINGS, new Date('2026-10-24T03:15:00.000Z'));
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});
