import { test, expect } from '@playwright/test';
import { createThrottleQueue } from '../../src/fetching/throttle-queue.js';

test('blocked pauses queue', async () => {
  let blockedCalled = false;
  const queue = createThrottleQueue({
    concurrency: 1,
    minDelayMs: 0,
    maxDelayMs: 0,
    maxItems: 10,
    fetchFn: async () => ({ status: 'blocked', reviewCount: null, errorMessage: 'blocked' }),
    onResult: () => {},
    onBlocked: () => { blockedCalled = true; },
    delayFn: async () => {},
  });
  queue.enqueue([{ goodsId: 'a' }, { goodsId: 'b' }]);
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(blockedCalled).toBe(true);
  expect(queue.getState()).toBe('paused');
});
