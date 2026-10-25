import { describe, it, expect, vi } from 'vitest';
import { createThrottleQueue } from '../../src/fetching/throttle-queue.js';

describe('createThrottleQueue', () => {
  it('processes items in FIFO order with concurrency 1', async () => {
    const order: string[] = [];
    const queue = createThrottleQueue({
      concurrency: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      maxItems: 10,
      fetchFn: async (goodsId) => {
        order.push(goodsId);
        return { status: 'ok', reviewCount: 100, errorMessage: null };
      },
      onResult: () => {},
      delayFn: async () => {},
    });
    queue.enqueue([{ goodsId: 'a' }, { goodsId: 'b' }, { goodsId: 'c' }]);
    // wait for async workers
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('deduplicates by goodsId', async () => {
    const fetched: string[] = [];
    const queue = createThrottleQueue({
      concurrency: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      maxItems: 10,
      fetchFn: async (goodsId) => {
        fetched.push(goodsId);
        return { status: 'ok', reviewCount: 1, errorMessage: null };
      },
      onResult: () => {},
      delayFn: async () => {},
    });
    queue.enqueue([{ goodsId: 'a' }, { goodsId: 'a' }, { goodsId: 'b' }]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetched).toEqual(['a', 'b']);
  });

  it('pauses on blocked and calls onBlocked', async () => {
    const onBlocked = vi.fn();
    const queue = createThrottleQueue({
      concurrency: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      maxItems: 10,
      fetchFn: async () => ({ status: 'blocked', reviewCount: null, errorMessage: 'blocked' }),
      onResult: () => {},
      onBlocked,
      delayFn: async () => {},
    });
    queue.enqueue([{ goodsId: 'a' }, { goodsId: 'b' }]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onBlocked).toHaveBeenCalled();
    expect(queue.getState()).toBe('paused');
  });

  it('retries once on error then reports', async () => {
    let calls = 0;
    const queue = createThrottleQueue({
      concurrency: 1,
      minDelayMs: 0,
      maxDelayMs: 0,
      maxItems: 10,
      fetchFn: async () => {
        calls += 1;
        if (calls === 1) return { status: 'error', reviewCount: null, errorMessage: 'network' };
        return { status: 'ok', reviewCount: 5, errorMessage: null };
      },
      onResult: () => {},
      delayFn: async () => {},
    });
    queue.enqueue([{ goodsId: 'a' }]);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(calls).toBe(2);
  });
});
