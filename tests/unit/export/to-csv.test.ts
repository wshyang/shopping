import { describe, expect, it } from 'vitest';
import { createGoodsRecord, withFetchOutcome } from '../../../src/domain/goods-record';
import { toCsv } from '../../../src/export/to-csv';

const record = withFetchOutcome(
  createGoodsRecord({
    goodsId: '42',
    title: '“清香”,\n洗衣粉',
    priceText: '¥19.9',
    salesLabel: { raw: '热销3.5万+件', kind: 'hot_sales', count: 35_000, isLowerBound: true },
    url: 'https://mobile.pinduoduo.com/goods.html?goods_id=42',
    position: 1,
  }),
  {
    status: 'ok',
    reviewCount: 22_999,
    errorMessage: null,
    fetchedAt: '2026-10-24T00:00:00.000Z',
    source: 'network',
  },
);

describe('toCsv', () => {
  it('writes BOM, RFC 4180 quoting, CRLF, and the documented columns', () => {
    const csv = toCsv([record]);
    expect(csv.startsWith('\uFEFFposition,goods_id,title,price,sales_label')).toBe(true);
    expect(csv).toContain('"“清香”,\n洗衣粉"');
    expect(csv).toContain(',35000,true,22999,ok,');
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).toContain('fetched_at,url\r\n1,42,');
  });

  it('neutralizes spreadsheet formulas in text cells', () => {
    const dangerous = { ...record, title: '=HYPERLINK("bad")' };
    expect(toCsv([dangerous])).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
