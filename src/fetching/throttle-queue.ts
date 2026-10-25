import type { FetchOutcome } from "../domain/goods-record";
import type { Settings } from "../settings/settings";
type QueueOptions = {
  settings: Settings;
  fetch: (id: string, signal: AbortSignal) => Promise<FetchOutcome>;
  result: (id: string, outcome: FetchOutcome) => void;
  state: (state: "running" | "paused" | "done") => void;
};
export class ThrottleQueue {
  private pending: string[] = [];
  private admitted = new Set<string>();
  private active = 0;
  private isRunning = false;
  private controller = new AbortController();
  private generation = 0;
  constructor(private options: QueueOptions) {}
  add(ids: string[]): string[] {
    const skipped: string[] = [];
    for (const id of ids) {
      if (this.admitted.has(id)) continue;
      if (this.admitted.size >= this.options.settings.maxItems) {
        skipped.push(id);
        continue;
      }
      this.admitted.add(id);
      this.pending.push(id);
    }
    this.pump();
    return skipped;
  }
  start(): void {
    this.isRunning = true;
    this.options.state("running");
    this.pump();
  }
  pause(): void {
    this.isRunning = false;
    this.options.state("paused");
  }
  stop(): void {
    this.isRunning = false;
    this.generation++;
    this.controller.abort();
    this.pending = [];
  }
  private pump(): void {
    if (!this.isRunning) return;
    while (
      this.active < this.options.settings.concurrency &&
      this.pending.length
    ) {
      const id = this.pending.shift()!;
      this.active++;
      void this.run(id, this.generation);
    }
    if (!this.active && !this.pending.length) {
      this.isRunning = false;
      this.options.state("done");
    }
  }
  private async run(id: string, generation: number): Promise<void> {
    try {
      const delay = this.options.settings.delayMs;
      await this.wait(delay.min + Math.random() * (delay.max - delay.min));
      if (generation !== this.generation) return;
      if (!this.isRunning) {
        this.pending.unshift(id);
        return;
      }
      let result = await this.options.fetch(id, this.controller.signal);
      if (result.status === "error" && this.isRunning) {
        await this.wait(5000);
        if (generation !== this.generation) return;
        if (!this.isRunning) {
          this.pending.unshift(id);
          return;
        }
        result = await this.options.fetch(id, this.controller.signal);
      }
      if (generation !== this.generation) return;
      if (result.status === "blocked") this.pause();
      this.options.result(id, result);
    } finally {
      this.active--;
      this.pump();
    }
  }
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.controller.signal.removeEventListener("abort", finish);
        resolve();
      };
      const timer = setTimeout(finish, ms);
      this.controller.signal.addEventListener("abort", finish, { once: true });
    });
  }
}
