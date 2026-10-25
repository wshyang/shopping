import { test, expect } from '@playwright/test';
import { createThrottleQueue } from '../../src/fetching/throttle-queue.js';

test('cap respected — items past maxItems are not fetched', async () => {
  const fetched: string[] = [];
  const results: string[] = [];
  const queue = createThrottleQueue({
    concurrency: 1,
    minDelayMs: 0,
    maxDelayMs: 0,
    maxItems: 2,
    fetchFn: async (goodsId) => { fetched.push(goodsId); return { status: 'ok', reviewCount: 1, errorMessage: null }; },
    onResult: (goodsId) => results.push(goodsId),
    delayFn: async () => {},
  });
  queue.enqueue([{ goodsId: 'a' }, { goodsId: 'b' }, { goodsId: 'c' }, { goodsId: 'd' }]);
  await new Promise((resolve) => setTimeout(resolve, 80));
  // c,d are past cap — onResult called with skipped marker, not fetched
  expect(fetched.length).toBeLessThanOrEqual(2);
});
