export type EnqueueResult = 'accepted' | 'duplicate' | 'capped' | 'stopped';

export type QueueSnapshot = {
  pending: number;
  running: number;
  accepted: number;
  isPaused: boolean;
  isStopped: boolean;
};

export type QueueWorkResult<Result> = {
  value: Result;
  shouldRetry: boolean;
};

type QueueOptions<Task, Result> = {
  concurrency: 1 | 2;
  delayMs: { min: number; max: number };
  maxItems: number;
  retryDelayMs?: number;
  getKey(task: Task): string;
  worker(task: Task): Promise<QueueWorkResult<Result>>;
  onResult(result: Result, task: Task): void;
  onIdle?(): void;
  onError?(error: unknown, task: Task): void;
  shouldPause(result: Result): boolean;
  sleep?(milliseconds: number): Promise<void>;
  random?: () => number;
};

export type ThrottleQueue<Task> = {
  enqueue(task: Task): EnqueueResult;
  pause(): void;
  resume(): void;
  stop(): void;
  getSnapshot(): QueueSnapshot;
  whenIdle(): Promise<void>;
};

export function createThrottleQueue<Task, Result>(
  options: QueueOptions<Task, Result>,
): ThrottleQueue<Task> {
  return new ThrottleQueueImplementation(options);
}

class ThrottleQueueImplementation<Task, Result> implements ThrottleQueue<Task> {
  private readonly pending: Task[] = [];
  private readonly acceptedKeys = new Set<string>();
  private readonly idleWaiters: Array<() => void> = [];
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;
  private running = 0;
  private isPaused = false;
  private isStopped = false;

  constructor(private readonly options: QueueOptions<Task, Result>) {
    this.sleep = (milliseconds) =>
      options.sleep ? options.sleep(milliseconds) : defaultSleep(milliseconds);
    this.random = options.random ?? (() => Math.random());
  }

  enqueue(task: Task): EnqueueResult {
    if (this.isStopped) return 'stopped';
    const key = this.options.getKey(task);
    if (this.acceptedKeys.has(key)) return 'duplicate';
    if (this.acceptedKeys.size >= this.options.maxItems) return 'capped';
    this.acceptedKeys.add(key);
    this.pending.push(task);
    this.pump();
    return 'accepted';
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    if (this.isStopped) return;
    this.isPaused = false;
    this.pump();
    this.notifyIdle();
  }

  stop(): void {
    this.isStopped = true;
    this.pending.length = 0;
    this.notifyIdle();
  }

  getSnapshot(): QueueSnapshot {
    return {
      pending: this.pending.length,
      running: this.running,
      accepted: this.acceptedKeys.size,
      isPaused: this.isPaused,
      isStopped: this.isStopped,
    };
  }

  whenIdle(): Promise<void> {
    if (this.isIdle()) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private pump(): void {
    while (this.canStartEntry()) {
      const task = this.pending.shift();
      if (task !== undefined) this.startEntry(task);
    }
  }

  private canStartEntry(): boolean {
    return (
      !this.isStopped &&
      !this.isPaused &&
      this.running < this.options.concurrency &&
      this.pending.length > 0
    );
  }

  private startEntry(task: Task): void {
    this.running += 1;
    void this.processEntry(task).finally(() => {
      this.running -= 1;
      this.pump();
      this.notifyIdle();
    });
  }

  private async processEntry(task: Task): Promise<void> {
    try {
      const result = await this.runWithRetry(task);
      if (this.isStopped) return;
      this.options.onResult(result.value, task);
      if (this.options.shouldPause(result.value)) this.isPaused = true;
      await this.sleep(getJitter(this.options.delayMs, this.random));
    } catch (error) {
      if (!this.isStopped) this.options.onError?.(error, task);
    }
  }

  private async runWithRetry(task: Task): Promise<QueueWorkResult<Result>> {
    const first = await this.options.worker(task);
    if (!first.shouldRetry || this.isStopped) return first;
    await this.sleep(this.options.retryDelayMs ?? 5_000);
    if (this.isStopped) return first;
    return this.options.worker(task);
  }

  private isIdle(): boolean {
    return this.pending.length === 0 && this.running === 0 && (!this.isPaused || this.isStopped);
  }

  private notifyIdle(): void {
    if (!this.isIdle()) return;
    if (!this.isStopped) this.options.onIdle?.();
    this.idleWaiters.splice(0).forEach((resolve) => resolve());
  }
}

function getJitter(range: { min: number; max: number }, random: () => number): number {
  const minimum = Math.max(0, Math.round(range.min));
  const maximum = Math.max(minimum, Math.round(range.max));
  return Math.round(minimum + random() * (maximum - minimum));
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
