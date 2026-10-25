import { describe, expect, it } from 'vitest';
import { parseSalesLabel } from '../../../src/domain/parse-sales-label';

describe('parseSalesLabel', () => {
  it.each([
    ['热销3.5万+件', 'hot_sales', 35_000, true],
    ['本店已拼8318', 'shop_group', 8_318, false],
    ['已拼10万+件', 'group', 100_000, true],
    ['热销1.2亿+件', 'hot_sales', 120_000_000, true],
    [' 已拼 1，234 件 ', 'group', 1_234, false],
  ] as const)('parses %s', (raw, kind, count, isLowerBound) => {
    expect(parseSalesLabel(raw)).toEqual({ raw: raw.trim(), kind, count, isLowerBound });
  });

  it.each(['', '新品', '热销很多件', '销量100'])('rejects unsupported label %s', (raw) => {
    expect(parseSalesLabel(raw)).toBeNull();
  });
});
