import { ReviewPanelState } from "./ui/use-review-panel";
import { createPanel } from "./ui/review-panel";
import { createBadge } from "./ui/review-badge";
import { watchCards } from "./discovery/watch-cards";
import type { CardRef } from "./discovery/find-cards";
import { ThrottleQueue } from "./fetching/throttle-queue";
import { fetchReviewCount } from "./fetching/goods-fetcher";
import { ReviewCache } from "./cache/review-cache";
import type { GoodsRecord, FetchOutcome } from "./domain/goods-record";
import { loadSettings, validateSettings } from "./settings/settings";
import { toCsv } from "./export/to-csv";
import { toJson } from "./export/to-json";
import { download, exportFilename } from "./export/download";
import type { Settings } from "./settings/settings";
class ShopperApp {
  private state = new ReviewPanelState();
  private cards = new Map<
    HTMLElement,
    { id: string; render: (row: GoodsRecord) => void }
  >();
  private cache: ReviewCache;
  private queue: ThrottleQueue;
  private panel: ReturnType<typeof createPanel>;
  constructor(private settings: Settings) {
    this.cache = new ReviewCache(browser.storage.local, settings.cacheTtlHours);
    this.queue = this.makeQueue();
    this.panel = createPanel(this.actions(), settings.maxItems);
  }
  private actions() {
    return {
      start: () => this.restart(),
      pause: () => this.queue.pause(),
      resume: () => {
        if (this.state.model.isBlocked) this.restart();
        else this.queue.start();
      },
      reset: () => {
        this.queue.stop();
        this.state.reset();
        this.queue = this.makeQueue();
        this.render();
      },
      cap: (cap: number) => {
        this.settings = validateSettings({ ...this.settings, maxItems: cap });
      },
      view: (view: Partial<import("./domain/sort-filter").ViewSettings>) => {
        this.state.view = { ...this.state.view, ...view };
        this.render();
      },
      select: (id: string) => this.select(id),
      export: (format: "csv" | "json") => this.export(format),
    };
  }
  private render() {
    this.panel.render(this.state.model);
    const records = new Map(this.state.all.map((row) => [row.goodsId, row]));
    for (const card of this.cards.values()) {
      const row = records.get(card.id);
      if (row) card.render(row);
    }
  }
  private async read(id: string, signal: AbortSignal): Promise<FetchOutcome> {
    const hit = await this.cache.get(id);
    if (signal.aborted)
      return {
        status: "error",
        reviewCount: null,
        fetchedAt: null,
        source: null,
        errorMessage: "已停止",
      };
    if (hit)
      return { ...hit, status: "ok", source: "cache", errorMessage: null };
    const outcome = await fetchReviewCount(id, signal);
    if (outcome.status === "ok")
      await this.cache.set(id, {
        reviewCount: outcome.reviewCount!,
        fetchedAt: outcome.fetchedAt!,
      });
    if (outcome.errorMessage)
      console.warn("[shopper]", id, outcome.errorMessage);
    return outcome;
  }
  private makeQueue() {
    return new ThrottleQueue({
      settings: this.settings,
      fetch: (id, signal) => this.read(id, signal),
      result: (id, result) => {
        this.state.update(id, result);
        this.render();
      },
      state: (value) => {
        this.state.state = value;
        this.render();
      },
    });
  }
  private enqueue() {
    const eligible = this.state.all.filter((row) =>
      ["pending", "skipped_cap", "blocked", "error"].includes(row.status),
    );
    for (const row of eligible.filter(
      (row) => row.position > this.settings.maxItems,
    ))
      this.state.update(row.goodsId, { status: "skipped_cap" });
    this.queue.add(
      eligible
        .filter((row) => row.position <= this.settings.maxItems)
        .map((row) => row.goodsId),
    );
  }
  private restart() {
    this.queue.stop();
    this.queue = this.makeQueue();
    for (const row of this.state.all)
      if (["blocked", "error", "skipped_cap"].includes(row.status))
        this.state.update(row.goodsId, {
          status: "pending",
          errorMessage: null,
        });
    this.enqueue();
    this.queue.start();
  }
  private select(id: string) {
    const element = [...this.cards].find(([, card]) => card.id === id)?.[0];
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.animate(
      [{ outline: "3px solid #14a878" }, { outline: "3px solid transparent" }],
      1500,
    );
  }
  private export(format: "csv" | "json") {
    const searchKey =
      new URL(location.href).searchParams.get("search_key") ?? "";
    const content =
      format === "csv"
        ? toCsv(this.state.model.rows)
        : toJson(this.state.model.rows, { searchKey, settings: this.settings });
    download(content, `${exportFilename(searchKey)}.${format}`);
  }
  private discover(found: CardRef[]) {
    for (const [element] of this.cards)
      if (!element.isConnected) this.cards.delete(element);
    for (const card of found) {
      const existing = this.cards.get(card.element);
      if (existing?.id === card.record.goodsId) continue;
      if (existing)
        card.element.querySelector('[data-shopper-root="badge"]')?.remove();
      this.cards.set(card.element, {
        id: card.record.goodsId,
        render: createBadge(card.element),
      });
    }
    this.state.add(found.map((card) => card.record));
    if (this.state.state === "running" || this.state.state === "done") {
      const hasNew = this.state.all.some(
        (row) =>
          row.status === "pending" && row.position <= this.settings.maxItems,
      );
      this.enqueue();
      if (this.state.state === "done" && hasNew) this.queue.start();
    }
    this.render();
  }
  mount(): () => void {
    const unwatch = watchCards(document, (found) => this.discover(found));
    return () => {
      unwatch();
      this.queue.stop();
      this.panel.remove();
      for (const element of this.cards.keys())
        element.querySelector('[data-shopper-root="badge"]')?.remove();
    };
  }
}
export async function mountApp(): Promise<() => void> {
  return new ShopperApp(await loadSettings()).mount();
}
