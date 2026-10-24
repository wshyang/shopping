import { describe, it, expect } from 'vitest';
import { parseSalesLabel } from '../../src/domain/parse-sales-label.js';

describe('parseSalesLabel', () => {
  it('parses 热销3.5万+件 as hot_sales 35000 lower bound', () => {
    const result = parseSalesLabel('热销3.5万+件');
    expect(result).toEqual({ raw: '热销3.5万+件', kind: 'hot_sales', count: 35000, isLowerBound: true });
  });

  it('parses 本店已拼8318 as shop_group 8318 exact', () => {
    const result = parseSalesLabel('本店已拼8318');
    expect(result).toEqual({ raw: '本店已拼8318', kind: 'shop_group', count: 8318, isLowerBound: false });
  });

  it('parses 已拼10万+件 as group 100000 lower bound', () => {
    const result = parseSalesLabel('已拼10万+件');
    expect(result).toEqual({ raw: '已拼10万+件', kind: 'group', count: 100000, isLowerBound: true });
  });

  it('parses 热销1.2亿+件 as hot_sales 120000000', () => {
    const result = parseSalesLabel('热销1.2亿+件');
    expect(result).toEqual({ raw: '热销1.2亿+件', kind: 'hot_sales', count: 120000000, isLowerBound: true });
  });

  it('parses 万 without plus as exact', () => {
    const result = parseSalesLabel('热销1.2万件');
    expect(result).toEqual({ raw: '热销1.2万件', kind: 'hot_sales', count: 12000, isLowerBound: false });
  });

  it('returns null for 新品', () => {
    expect(parseSalesLabel('新品')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSalesLabel('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(parseSalesLabel('   ')).toBeNull();
  });

  it('parses integer without unit', () => {
    const result = parseSalesLabel('本店已拼42');
    expect(result).toEqual({ raw: '本店已拼42', kind: 'shop_group', count: 42, isLowerBound: false });
  });

  it('trims surrounding whitespace', () => {
    const result = parseSalesLabel('  热销3.5万+件  ');
    expect(result?.count).toBe(35000);
  });
});
