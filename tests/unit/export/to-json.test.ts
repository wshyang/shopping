import { describe, expect, it } from 'vitest';
import { createGoodsRecord } from '../../../src/domain/goods-record';
import { DEFAULT_SETTINGS } from '../../../src/settings/settings';
import { createExportFilename, toJson } from '../../../src/export/to-json';

const record = createGoodsRecord({
  goodsId: '1',
  title: '商品',
  priceText: '¥1',
  salesLabel: null,
  url: 'https://mobile.pinduoduo.com/goods.html?goods_id=1',
  position: 1,
});

describe('JSON export', () => {
  it('contains metadata and the same normalized row fields', () => {
    const value = JSON.parse(
      toJson([record], {
        searchKey: '洗衣粉',
        exportedAt: '2026-10-24T01:02:03.000Z',
        settings: DEFAULT_SETTINGS,
      }),
    ) as Record<string, unknown>;
    expect(value).toMatchObject({
      searchKey: '洗衣粉',
      exportedAt: '2026-10-24T01:02:03.000Z',
      rows: [{ goods_id: '1', review_count: null }],
    });
  });

  it('creates a filesystem-safe Singapore-time filename', () => {
    expect(createExportFilename('洗衣粉 / 超值', new Date('2026-10-24T01:02:03.000Z'), 'csv')).toBe(
      'pdd-洗衣粉-超值-261024-090203.csv',
    );
  });
});
