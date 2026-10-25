import { describe, expect, it, vi } from 'vitest';
import { createHtmlGoodsFetcher } from '../../../src/fetching/goods-fetcher';

const now = () => new Date('2026-10-24T00:00:00.000Z');

describe('HTML goods fetcher', () => {
  it('fetches same-origin HTML with credentials and parses reviews', async () => {
    const fetchImplementation = vi.fn(async () => new Response('商品评价(1,234)', { status: 200 }));
    const fetcher = createHtmlGoodsFetcher({ fetchImplementation, now });
    const result = await fetcher.fetchReviewCount('42');
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://mobile.pinduoduo.com/goods.html?goods_id=42',
      { credentials: 'include', redirect: 'follow', signal: expect.any(AbortSignal) },
    );
    expect(result.outcome).toMatchObject({ status: 'ok', reviewCount: 1234, source: 'network' });
    expect(result.shouldRetry).toBe(false);
  });

  it('pauses rather than retrying a challenged response', async () => {
    const fetchImplementation = vi.fn(async () => new Response('请完成安全验证', { status: 429 }));
    const result = await createHtmlGoodsFetcher({ fetchImplementation, now }).fetchReviewCount('7');
    expect(result.outcome.status).toBe('blocked');
    expect(result.shouldRetry).toBe(false);
  });

  it('marks 5xx and network failures retryable', async () => {
    const server = vi.fn(async () => new Response('bad', { status: 503 }));
    const network = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(
      createHtmlGoodsFetcher({ fetchImplementation: server, now }).fetchReviewCount('1'),
    ).resolves.toMatchObject({ shouldRetry: true, outcome: { status: 'error' } });
    await expect(
      createHtmlGoodsFetcher({ fetchImplementation: network, now }).fetchReviewCount('1'),
    ).resolves.toMatchObject({ shouldRetry: true, outcome: { status: 'error' } });
  });

  it('reports an unrecognized successful page without guessing', async () => {
    const fetchImplementation = vi.fn(
      async () => new Response('<html>商品详情</html>', { status: 200 }),
    );
    const result = await createHtmlGoodsFetcher({ fetchImplementation, now }).fetchReviewCount('1');
    expect(result.outcome).toMatchObject({ status: 'not_found', reviewCount: null });
  });
});
