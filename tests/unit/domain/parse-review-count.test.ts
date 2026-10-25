import { describe, expect, it } from 'vitest';
import { parseReviewCount } from '../../../src/domain/parse-review-count';

describe('parseReviewCount', () => {
  it('prefers a structured review key in rawData', () => {
    const html = `<script>window.rawData = {"goods":{"reviewCount":22999}};</script>商品评价(3)`;
    expect(parseReviewCount(html)).toBe(22_999);
  });

  it('scans only explicit review keys in nested structured data', () => {
    const html = `<script>window.rawData={"salesCount":999,"a":{"review_num":"1.2万+"}};</script>`;
    expect(parseReviewCount(html)).toBe(12_000);
  });

  it.each([
    ['<span>商品评价(22,999)</span>', 22_999],
    ['<span>商品评价（1.2万+）</span>', 12_000],
    ['<b>商品评价</b> ( 1，001 )', 1_001],
  ])('falls back to labelled text', (html, count) => {
    expect(parseReviewCount(html)).toBe(count);
  });

  it.each(['商品评价 暂无评价', '<div>暂无评价</div>', '商品评价（0）'])(
    'recognizes zero reviews',
    (html) => {
      expect(parseReviewCount(html)).toBe(0);
    },
  );

  it('does not guess from unrelated counts or malformed rawData', () => {
    expect(parseReviewCount('<script>window.rawData={broken}</script>已售 999')).toBeNull();
  });

  it('does not execute embedded JavaScript', () => {
    const html = `<script>window.rawData=globalThis.compromised=true</script>`;
    expect(parseReviewCount(html)).toBeNull();
    expect((globalThis as { compromised?: boolean }).compromised).toBeUndefined();
  });
});
