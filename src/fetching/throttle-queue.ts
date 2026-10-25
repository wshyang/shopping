import type { FetchOutcome } from '../domain/goods-record.js';

export type QueueItem = {
  goodsId: string;
};

export type QueueOptions = {
  concurrency: number;
  minDelayMs: number;
  maxDelayMs: number;
  maxItems: number;
  fetchFn: (goodsId: string) => Promise<FetchOutcome>;
  onResult: (goodsId: string, outcome: FetchOutcome) => void;
  onBlocked?: () => void;
  onDrained?: () => void;
  delayFn?: (ms: number) => Promise<void>;
};

export type QueueHandle = {
  enqueue: (items: QueueItem[]) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  getState: () => QueueState;
};

export type QueueState = 'idle' | 'running' | 'paused' | 'done';

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetry(status: FetchOutcome['status']): boolean {
  return status === 'error';
}

export function createThrottleQueue(options: QueueOptions): QueueHandle {
  const queue: QueueItem[] = [];
  const seen = new Set<string>();
  let state: QueueState = 'idle';
  let activeWorkers = 0;
  let paused = false;
  let retryCounts = new Map<string, number>();

  const delayFn = options.delayFn ?? defaultDelay;

  function enqueue(items: QueueItem[]): void {
    for (const item of items) addIfEligible(item);
    if (state === 'idle' || state === 'done') startIfNeeded();
  }

  function addIfEligible(item: QueueItem): void {
    if (seen.has(item.goodsId)) return;
    if (queue.length >= options.maxItems) {
      handleSkippedCap(item.goodsId);
      return;
    }
    seen.add(item.goodsId);
    queue.push(item);
  }

  function handleSkippedCap(goodsId: string): void {
    options.onResult(goodsId, {
      status: 'not_found',
      reviewCount: null,
      errorMessage: 'skipped — over cap',
    });
  }

  function startIfNeeded(): void {
    if (queue.length === 0) return;
    state = 'running';
    paused = false;
    launchWorkers();
  }

  function launchWorkers(): void {
    const workerCount = Math.min(options.concurrency, queue.length);
    for (let index = 0; index < workerCount; index += 1) runWorker();
  }

  async function runWorker(): Promise<void> {
    activeWorkers += 1;
    while (hasWork()) {
      if (paused) break;
      const next = queue.shift();
      if (next === undefined) break;
      await processItem(next);
      await waitBetweenRequests();
    }
    activeWorkers -= 1;
    checkDrained();
  }

  function hasWork(): boolean {
    return queue.length > 0 && !paused;
  }

  async function processItem(item: QueueItem): Promise<void> {
    const outcome = await options.fetchFn(item.goodsId);
    if (outcome.status === 'blocked') {
      handleBlocked(item.goodsId, outcome);
      return;
    }
    if (shouldRetry(outcome.status)) {
      const retried = await tryRetry(item);
      if (retried) return;
    }
    options.onResult(item.goodsId, outcome);
  }

  function handleBlocked(goodsId: string, outcome: FetchOutcome): void {
    paused = true;
    state = 'paused';
    options.onResult(goodsId, outcome);
    options.onBlocked?.();
  }

  async function tryRetry(item: QueueItem): Promise<boolean> {
    const count = retryCounts.get(item.goodsId) ?? 0;
    if (count >= 1) return false;
    retryCounts.set(item.goodsId, count + 1);
    await delayFn(5000);
    if (paused) return true;
    const retryOutcome = await options.fetchFn(item.goodsId);
    options.onResult(item.goodsId, retryOutcome);
    return true;
  }

  async function waitBetweenRequests(): Promise<void> {
    if (queue.length === 0) return;
    const delayMs = randomDelay(options.minDelayMs, options.maxDelayMs);
    await delayFn(delayMs);
  }

  function checkDrained(): void {
    if (activeWorkers === 0 && queue.length === 0 && !paused && state === 'running') {
      state = 'done';
      options.onDrained?.();
    }
  }

  function pause(): void {
    if (state !== 'running') return;
    paused = true;
    state = 'paused';
  }

  function resume(): void {
    if (state !== 'paused') return;
    paused = false;
    state = 'running';
    launchWorkers();
  }

  function reset(): void {
    queue.length = 0;
    seen.clear();
    retryCounts = new Map();
    paused = false;
    state = 'idle';
  }

  function getState(): QueueState {
    return state;
  }

  return { enqueue, pause, resume, reset, getState };
}
