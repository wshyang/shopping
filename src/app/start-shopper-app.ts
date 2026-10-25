import type { FetchOutcome, GoodsRecord } from '../domain/goods-record';
import { createGoodsRecord } from '../domain/goods-record';
import type { SortKey } from '../domain/sort-filter';
import type { CardRef } from '../discovery/find-cards';
import { watchCards } from '../discovery/watch-cards';
import { downloadText } from '../export/download';
import { toCsv } from '../export/to-csv';
import { createExportFilename, toJson } from '../export/to-json';
import type { FetchResult, GoodsFetcher } from '../fetching/goods-fetcher';
import { createHtmlGoodsFetcher } from '../fetching/goods-fetcher';
import { createThrottleQueue } from '../fetching/throttle-queue';
import type { ThrottleQueue } from '../fetching/throttle-queue';
import { createReviewCache } from '../cache/review-cache';
import type { ReviewCache } from '../cache/review-cache';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings/settings';
import type { Settings } from '../settings/settings';
import type { StorageArea } from '../storage/storage-area';
import { mountReviewBadge } from '../ui/review-badge';
import type { ReviewBadge } from '../ui/review-badge';
import { mountReviewPanel } from '../ui/review-panel';
import { createReviewPanelController } from '../ui/use-review-panel';
import type { ReviewPanelController } from '../ui/use-review-panel';

type AppOptions = {
  localStorage: StorageArea;
  syncStorage: StorageArea;
  fetcher?: GoodsFetcher;
};

type AppRuntime = {
  controller: ReviewPanelController;
  cache: ReviewCache;
  fetcher: GoodsFetcher;
  settings: Settings;
  syncStorage: StorageArea;
};

export async function startShopperApp(options: AppOptions): Promise<() => void> {
  const settings = await loadRuntimeSettings(options.syncStorage);
  const runtime: AppRuntime = {
    controller: createReviewPanelController({ maxItems: settings.maxItems }),
    cache: createReviewCache(options.localStorage),
    fetcher: options.fetcher ?? createHtmlGoodsFetcher(),
    settings,
    syncStorage: options.syncStorage,
  };
  return mountApplication(runtime);
}

async function loadRuntimeSettings(storage: StorageArea): Promise<Settings> {
  try {
    return await loadSettings(storage);
  } catch (error) {
    console.warn('[shopper] 读取设置失败，使用安全默认值', error);
    return { ...DEFAULT_SETTINGS, delayMs: { ...DEFAULT_SETTINGS.delayMs } };
  }
}

function mountApplication(runtime: AppRuntime): () => void {
  const badges = new Map<string, ReviewBadge>();
  const cards = new Map<string, HTMLElement>();
  let queue: ThrottleQueue<GoodsRecord> | null = null;
  const queueState = {
    get: () => queue,
    set: (next: ThrottleQueue<GoodsRecord> | null) => {
      queue = next;
    },
  };
  const handlers = createHandlers(runtime, cards, queueState);
  const panel = mountReviewPanel(handlers);
  let hasAutoStarted = false;
  const unsubscribe = runtime.controller.subscribe(() =>
    renderApplication(runtime.controller, panel, badges),
  );
  const watcher = watchCards(document, (found) => {
    handleCards(found, runtime.controller, { cards, badges, queue });
    if (runtime.settings.autoStart && !hasAutoStarted && found.length > 0) {
      hasAutoStarted = true;
      handlers.onStart();
    }
  });
  if (runtime.controller.getAllRecords().length === 0) {
    runtime.controller.setLayoutError('无法读取当前页面布局，拼多多页面可能已更新。');
  }
  renderApplication(runtime.controller, panel, badges);

  return () => {
    queue?.stop();
    watcher.stop();
    unsubscribe();
    badges.forEach((badge) => badge.remove());
    panel.remove();
  };
}

type QueueState = {
  get(): ThrottleQueue<GoodsRecord> | null;
  set(queue: ThrottleQueue<GoodsRecord> | null): void;
};

function createHandlers(
  runtime: AppRuntime,
  cards: Map<string, HTMLElement>,
  queueState: QueueState,
) {
  function start(): void {
    queueState.get()?.stop();
    runtime.controller.start();
    const records = runtime.controller.getRunnableRecords();
    if (records.length === 0) {
      queueState.set(null);
      runtime.controller.complete();
      return;
    }
    const queue = buildQueue(runtime);
    queueState.set(queue);
    records.forEach((record) => queue.enqueue(record));
  }

  function pause(): void {
    queueState.get()?.pause();
    runtime.controller.pause();
  }

  function resume(): void {
    queueState.get()?.resume();
    runtime.controller.resume();
  }

  function reset(): void {
    queueState.get()?.stop();
    queueState.set(null);
    runtime.controller.reset();
  }

  function setMaximumItems(value: number): void {
    runtime.controller.setMaximumItems(value);
    const maximum = runtime.controller.getViewModel().maxItems;
    persistMaximum(runtime, maximum);
  }

  return {
    onStart: start,
    onPause: pause,
    onResume: resume,
    onReset: reset,
    onMaximumItems: setMaximumItems,
    onMinimumReviews: (value: number) => runtime.controller.setMinimumReviews(value),
    onSort: (value: SortKey) => runtime.controller.setSort(value),
    onSelectRecord: (goodsId: string) => focusCard(cards.get(goodsId)),
    onExportCsv: () => exportCsv(runtime),
    onExportJson: () => exportJson(runtime),
  };
}

function buildQueue(runtime: AppRuntime): ThrottleQueue<GoodsRecord> {
  return createThrottleQueue<GoodsRecord, FetchResult>({
    concurrency: runtime.settings.concurrency,
    delayMs: runtime.settings.delayMs,
    maxItems: runtime.controller.getViewModel().maxItems,
    getKey: ({ goodsId }) => goodsId,
    worker: (record) => collectQueueResult(record, runtime),
    onResult: (result, record) => handleResult(result, record, runtime.controller),
    onError: (error, record) => handleUnexpectedError(error, record, runtime.controller),
    shouldPause: ({ outcome }) => outcome.status === 'blocked',
    onIdle: () => runtime.controller.complete(),
  });
}

async function collectQueueResult(record: GoodsRecord, runtime: AppRuntime) {
  const result = await collectRecord(record, runtime);
  return { value: result, shouldRetry: result.shouldRetry };
}

async function collectRecord(record: GoodsRecord, runtime: AppRuntime): Promise<FetchResult> {
  const cached = await getCachedOutcome(record.goodsId, runtime);
  if (cached) return { outcome: cached, shouldRetry: false };
  const result = await runtime.fetcher.fetchReviewCount(record.goodsId);
  if (result.outcome.status === 'ok' && result.outcome.reviewCount !== null) {
    await cacheOutcome(record.goodsId, result.outcome.reviewCount, runtime.cache);
  }
  return result;
}

async function getCachedOutcome(
  goodsId: string,
  runtime: AppRuntime,
): Promise<FetchOutcome | null> {
  try {
    const entry = await runtime.cache.get(goodsId, runtime.settings.cacheTtlHours);
    if (!entry) return null;
    return {
      status: 'ok',
      reviewCount: entry.reviewCount,
      fetchedAt: entry.fetchedAt,
      source: 'cache',
      errorMessage: null,
    };
  } catch (error) {
    console.warn('[shopper]', goodsId, '读取缓存失败', error);
    return null;
  }
}

async function cacheOutcome(goodsId: string, count: number, cache: ReviewCache): Promise<void> {
  try {
    await cache.set(goodsId, count);
  } catch (error) {
    console.warn('[shopper]', goodsId, '写入缓存失败', error);
  }
}

function handleResult(
  result: FetchResult,
  record: GoodsRecord,
  controller: ReviewPanelController,
): void {
  controller.updateRecord(record.goodsId, result.outcome);
  if (result.outcome.status !== 'blocked') return;
  controller.pause('拼多多要求验证。请在页面完成验证，然后按“继续”。');
}

function handleUnexpectedError(
  error: unknown,
  record: GoodsRecord,
  controller: ReviewPanelController,
): void {
  const message = error instanceof Error ? error.message.slice(0, 160) : '未知错误';
  console.warn('[shopper]', record.goodsId, message);
  controller.updateRecord(record.goodsId, {
    status: 'error',
    reviewCount: null,
    errorMessage: message,
    fetchedAt: new Date().toISOString(),
    source: null,
  });
}

type CardBindings = {
  cards: Map<string, HTMLElement>;
  badges: Map<string, ReviewBadge>;
  queue: ThrottleQueue<GoodsRecord> | null;
};

function handleCards(
  found: readonly CardRef[],
  controller: ReviewPanelController,
  bindings: CardBindings,
): void {
  const records = found.map(cardToRecord);
  found.forEach((card, index) => {
    bindings.cards.set(card.goodsId, card.element);
    const record = records[index];
    if (record && !bindings.badges.has(card.goodsId)) {
      bindings.badges.set(card.goodsId, mountReviewBadge(card.element, record));
    }
  });
  controller.addRecords(records);
  if (controller.getViewModel().phase !== 'running' || !bindings.queue) return;
  records.forEach((record) => bindings.queue?.enqueue(record));
}

function cardToRecord(card: CardRef): GoodsRecord {
  return createGoodsRecord({
    goodsId: card.goodsId,
    title: card.title,
    priceText: card.priceText,
    salesLabel: card.salesLabel,
    url: card.url,
    position: card.position,
  });
}

function renderApplication(
  controller: ReviewPanelController,
  panel: ReturnType<typeof mountReviewPanel>,
  badges: ReadonlyMap<string, ReviewBadge>,
): void {
  panel.render(controller.getViewModel());
  controller.getAllRecords().forEach((record) => badges.get(record.goodsId)?.render(record));
}

function persistMaximum(runtime: AppRuntime, maximum: number): void {
  runtime.settings = { ...runtime.settings, maxItems: maximum };
  void saveSettings(runtime.syncStorage, runtime.settings)
    .then((saved) => {
      runtime.settings = saved;
    })
    .catch((error: unknown) => console.warn('[shopper] 保存设置失败', error));
}

function focusCard(card: HTMLElement | undefined): void {
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.animate(
    [{ outline: '3px solid rgba(217,54,62,.9)' }, { outline: '3px solid transparent' }],
    { duration: 1_800, easing: 'ease-out' },
  );
}

function exportCsv(runtime: AppRuntime): void {
  const now = new Date();
  const name = createExportFilename(getSearchKey(), now, 'csv');
  downloadText(name, toCsv(runtime.controller.getAllRecords()), 'text/csv');
}

function exportJson(runtime: AppRuntime): void {
  const now = new Date();
  const metadata = {
    searchKey: getSearchKey(),
    exportedAt: now.toISOString(),
    settings: runtime.settings,
  };
  const name = createExportFilename(metadata.searchKey, now, 'json');
  downloadText(name, toJson(runtime.controller.getAllRecords(), metadata), 'application/json');
}

function getSearchKey(): string {
  return new URL(location.href).searchParams.get('search_key')?.trim() || 'search';
}
