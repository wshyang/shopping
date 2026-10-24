import { describe, it, expect, vi } from 'vitest';
import { createGoodsFetcher } from '../../src/fetching/goods-fetcher.js';

function mockFetch(html: string, status = 200, url = 'https://mobile.pinduoduo.com/goods.html?goods_id=123'): typeof fetch {
  return vi.fn(async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      url,
      redirected: false,
      text: async () => html,
    }) as unknown as Response,
  );
}

describe('createGoodsFetcher', () => {
  it('returns ok when HTML contains review count', async () => {
    const html = '<script>window.rawData = {"data":{"goods":{"reviewNum":22999}}}</script><div>商品评价(22,999)</div>';
    const fetcher = createGoodsFetcher({ fetchImpl: mockFetch(html) });
    const outcome = await fetcher.fetchReviewCount('123');
    expect(outcome.status).toBe('ok');
    expect(outcome.reviewCount).toBe(22999);
  });

  it('returns not_found when no marker', async () => {
    const html = '<html><body>no data</body></html>';
    const fetcher = createGoodsFetcher({ fetchImpl: mockFetch(html) });
    const outcome = await fetcher.fetchReviewCount('123');
    expect(outcome.status).toBe('not_found');
  });

  it('returns blocked when body has 风控', async () => {
    const html = '<div>风控拦截 请验证</div>';
    const fetcher = createGoodsFetcher({ fetchImpl: mockFetch(html) });
    const outcome = await fetcher.fetchReviewCount('123');
    expect(outcome.status).toBe('blocked');
  });

  it('returns blocked on 403 status', async () => {
    const fetcher = createGoodsFetcher({ fetchImpl: mockFetch('forbidden', 403) });
    const outcome = await fetcher.fetchReviewCount('123');
    expect(outcome.status).toBe('blocked');
  });

  it('returns error on network failure', async () => {
    const failFetch = vi.fn(async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const fetcher = createGoodsFetcher({ fetchImpl: failFetch });
    const outcome = await fetcher.fetchReviewCount('123');
    expect(outcome.status).toBe('error');
    expect(outcome.errorMessage).toContain('network down');
  });

  it('handles 暂无评价 as 0', async () => {
    const html = '<div>暂无评价</div>';
    const fetcher = createGoodsFetcher({ fetchImpl: mockFetch(html) });
    const outcome = await fetcher.fetchReviewCount('123');
    expect(outcome.status).toBe('ok');
    expect(outcome.reviewCount).toBe(0);
  });
});
