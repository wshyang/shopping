import { describe, it, expect } from 'vitest';
import { toCsv, buildCsvFilename } from '../../src/export/to-csv.js';
import { createGoodsRecord, withFetchResult } from '../../src/domain/goods-record.js';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

function makeRecord(): ReturnType<typeof createGoodsRecord> {
  const base = createGoodsRecord({
    goodsId: '123456789',
    title: '立白洗衣粉 10斤装',
    priceText: '¥29.9',
    salesLabel: parseSalesLabel('热销3.5万+件'),
    url: 'https://mobile.pinduoduo.com/goods.html?goods_id=123456789',
    position: 1,
  });
  return withFetchResult(base, { status: 'ok', reviewCount: 22999, errorMessage: null }, '2026-10-24T03:15:00.000Z', 'network');
}

describe('toCsv', () => {
  it('starts with BOM', () => {
    const csv = toCsv([makeRecord()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('has header row', () => {
    const csv = toCsv([makeRecord()]);
    expect(csv).toContain('position,goods_id,title');
  });

  it('uses CRLF', () => {
    const csv = toCsv([makeRecord()]);
    expect(csv).toContain('\r\n');
  });

  it('quotes fields with commas', () => {
    const base = createGoodsRecord({
      goodsId: '1',
      title: 'A, B',
      priceText: '¥10',
      salesLabel: null,
      url: 'https://example.com',
      position: 1,
    });
    const record = withFetchResult(base, { status: 'ok', reviewCount: 10, errorMessage: null }, '2026-10-24T03:15:00.000Z', 'network');
    const csv = toCsv([record]);
    expect(csv).toContain('"A, B"');
  });

  it('handles empty list with only header', () => {
    const csv = toCsv([]);
    const lines = csv.trim().split('\r\n');
    // BOM + header
    expect(lines.length).toBe(1);
  });
});

describe('buildCsvFilename', () => {
  it('includes search key and timestamp', () => {
    const date = new Date('2026-10-24T03:15:00.000Z');
    const filename = buildCsvFilename('洗衣粉', date);
    expect(filename).toContain('pdd-');
    expect(filename.endsWith('.csv')).toBe(true);
    expect(filename).toContain('洗衣粉');
  });

  it('sanitizes unsafe characters', () => {
    const filename = buildCsvFilename('a/b:c', new Date());
    expect(filename).not.toContain('/');
    expect(filename).not.toContain(':');
  });
});
