import { describe, it, expect } from 'vitest';
import { parseReviewCount, extractReviewCount } from '../../src/domain/parse-review-count.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadFixture(name: string): string {
  return readFileSync(join(import.meta.dirname, '..', 'fixtures', 'pdd', name), 'utf-8');
}

describe('parseReviewCount', () => {
  it('extracts from window.rawData structured path (high)', () => {
    const html = loadFixture('goods-high.html');
    const result = parseReviewCount(html);
    expect(result.count).toBe(22999);
    expect(result.source).toBe('rawData');
  });

  it('extracts from window.rawData (low)', () => {
    const html = loadFixture('goods-low.html');
    expect(parseReviewCount(html).count).toBe(856);
  });

  it('returns 0 for 暂无评价', () => {
    const html = loadFixture('goods-zero.html');
    const result = parseReviewCount(html);
    expect(result.count).toBe(0);
    expect(result.source).toBe('zero');
  });

  it('falls back to 商品评价 text with comma', () => {
    const html = '<div>商品评价(22,999)</div>';
    expect(extractReviewCount(html)).toBe(22999);
  });

  it('parses 商品评价 with 万', () => {
    const html = '<div>商品评价(1.2万+)</div>';
    expect(extractReviewCount(html)).toBe(12000);
  });

  it('parses 商品评价 with Chinese parentheses', () => {
    const html = '<div>商品评价（856）</div>';
    expect(extractReviewCount(html)).toBe(856);
  });

  it('returns null when no marker found', () => {
    const html = '<html><body><p>no review info</p></body></html>';
    expect(parseReviewCount(html).count).toBeNull();
  });

  it('prefers rawData over text fallback', () => {
    // rawData says 100, text says 999 — should return 100
    const html = '<script>window.rawData = {"data":{"goods":{"reviewNum":100}}}</script><div>商品评价(999)</div>';
    expect(parseReviewCount(html).count).toBe(100);
  });
});
