import { describe, expect, it, vi } from 'vitest';
import { createThrottleQueue } from '../../../src/fetching/throttle-queue';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('throttle queue', () => {
  it('deduplicates, caps, and processes FIFO', async () => {
    const results: number[] = [];
    const queue = createThrottleQueue<number, number>({
      concurrency: 1,
      delayMs: { min: 0, max: 0 },
      maxItems: 2,
      getKey: String,
      worker: async (value) => ({ value, shouldRetry: false }),
      onResult: (value) => results.push(value),
      shouldPause: () => false,
      sleep: async () => undefined,
    });

    expect(queue.enqueue(1)).toBe('accepted');
    expect(queue.enqueue(1)).toBe('duplicate');
    expect(queue.enqueue(2)).toBe('accepted');
    expect(queue.enqueue(3)).toBe('capped');
    await queue.whenIdle();
    expect(results).toEqual([1, 2]);
    expect(queue.getSnapshot()).toMatchObject({ pending: 0, running: 0 });
  });

  it('retries once and publishes only the final result', async () => {
    const worker = vi
      .fn()
      .mockResolvedValueOnce({ value: 'first', shouldRetry: true })
      .mockResolvedValueOnce({ value: 'second', shouldRetry: false });
    const onResult = vi.fn();
    const queue = createThrottleQueue({
      concurrency: 1,
      delayMs: { min: 0, max: 0 },
      maxItems: 1,
      retryDelayMs: 0,
      getKey: String,
      worker,
      onResult,
      shouldPause: () => false,
      sleep: async () => undefined,
    });

    queue.enqueue('goods');
    await queue.whenIdle();
    expect(worker).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith('second', 'goods');
  });

  it('globally pauses on a challenge until manually resumed', async () => {
    const handled: string[] = [];
    const queue = createThrottleQueue<string, string>({
      concurrency: 1,
      delayMs: { min: 0, max: 0 },
      maxItems: 3,
      getKey: String,
      worker: async (value) => ({ value, shouldRetry: false }),
      onResult: (value) => handled.push(value),
      shouldPause: (value) => value === 'blocked',
      sleep: async () => undefined,
    });

    queue.pause();
    queue.enqueue('blocked');
    queue.enqueue('next');
    await flush();
    expect(handled).toEqual([]);
    queue.resume();
    await flush();
    expect(handled).toEqual(['blocked']);
    expect(queue.getSnapshot().isPaused).toBe(true);
    queue.resume();
    await queue.whenIdle();
    expect(handled).toEqual(['blocked', 'next']);
  });

  it('becomes idle when the last result pauses and the user resumes', async () => {
    const onIdle = vi.fn();
    const queue = createThrottleQueue({
      concurrency: 1,
      delayMs: { min: 0, max: 0 },
      maxItems: 1,
      getKey: String,
      worker: async (value: string) => ({ value, shouldRetry: false }),
      onResult: () => undefined,
      shouldPause: () => true,
      onIdle,
      sleep: async () => undefined,
    });
    queue.enqueue('blocked');
    await flush();
    expect(queue.getSnapshot()).toMatchObject({ pending: 0, running: 0, isPaused: true });
    queue.resume();
    await queue.whenIdle();
    expect(onIdle).toHaveBeenCalledOnce();
  });

  it('notifies when it becomes idle and can be stopped', async () => {
    const onIdle = vi.fn();
    const queue = createThrottleQueue({
      concurrency: 1,
      delayMs: { min: 0, max: 0 },
      maxItems: 2,
      getKey: String,
      worker: async (value: string) => ({ value, shouldRetry: false }),
      onResult: () => undefined,
      onIdle,
      shouldPause: () => false,
      sleep: async () => undefined,
    });
    queue.enqueue('one');
    await queue.whenIdle();
    expect(onIdle).toHaveBeenCalledOnce();
    queue.stop();
    expect(queue.enqueue('two')).toBe('stopped');
  });
});
