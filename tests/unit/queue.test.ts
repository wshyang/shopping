import { afterEach, describe, expect, it, vi } from "vitest";
import { ThrottleQueue } from "../../src/fetching/throttle-queue";
import { defaults } from "../../src/settings/settings";
import type { FetchOutcome } from "../../src/domain/goods-record";
const ok: FetchOutcome = {
  status: "ok",
  reviewCount: 0,
  errorMessage: null,
  fetchedAt: "2026-10-24T00:00:00Z",
  source: "network",
};
function setup(status: FetchOutcome["status"] = "ok") {
  const fetch = vi.fn(async () => ({ ...ok, status }));
  const result = vi.fn(),
    state = vi.fn();
  const queue = new ThrottleQueue({
    settings: { ...defaults, maxItems: 2, delayMs: { min: 1000, max: 1000 } },
    fetch,
    result,
    state,
  });
  return { queue, fetch, result, state };
}
afterEach(() => vi.useRealTimers());
describe("polite queue", () => {
  it("requires start, caps, deduplicates and paces", async () => {
    vi.useFakeTimers();
    const t = setup();
    expect(t.queue.add(["1", "1", "2", "3"])).toEqual(["3"]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.fetch).not.toHaveBeenCalled();
    t.queue.start();
    await vi.advanceTimersByTimeAsync(999);
    expect(t.fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1001);
    expect(t.fetch).toHaveBeenCalledTimes(2);
    expect(t.state).toHaveBeenLastCalledWith("done");
  });
  it("globally pauses on a block without retry", async () => {
    vi.useFakeTimers();
    const t = setup("blocked");
    t.queue.add(["1", "2"]);
    t.queue.start();
    await vi.advanceTimersByTimeAsync(20000);
    expect(t.fetch).toHaveBeenCalledTimes(1);
    expect(t.state).toHaveBeenLastCalledWith("paused");
    t.queue.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.fetch).toHaveBeenCalledTimes(2);
  });
  it("retries error once after 5 seconds", async () => {
    vi.useFakeTimers();
    const t = setup("error");
    t.queue.add(["1"]);
    t.queue.start();
    await vi.advanceTimersByTimeAsync(5999);
    expect(t.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(t.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10000);
    expect(t.fetch).toHaveBeenCalledTimes(2);
  });
  it("reset cancels delayed work and stale results", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.queue.add(["1"]);
    t.queue.start();
    t.queue.stop();
    await vi.runAllTimersAsync();
    expect(t.fetch).not.toHaveBeenCalled();
    expect(t.result).not.toHaveBeenCalled();
  });
  it("pause prevents a waiting request from starting", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.queue.add(["1"]);
    t.queue.start();
    t.queue.pause();
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.fetch).not.toHaveBeenCalled();
    t.queue.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.fetch).toHaveBeenCalledTimes(1);
  });
});
