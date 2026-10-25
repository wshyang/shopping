/**
 * WXT content script — matches mobile.pinduoduo.com/search_result.html*
 * Composes discovery → queue → fetcher → parser → store → UI (panel + badges)
 * No background service worker; all work happens in the tab (ARCHITECTURE §3).
 */
import { findCards } from '../src/discovery/find-cards.js';
import { watchCards } from '../src/discovery/watch-cards.js';
import { createGoodsFetcher } from '../src/fetching/goods-fetcher.js';
import { createThrottleQueue } from '../src/fetching/throttle-queue.js';
import { createReviewCache } from '../src/cache/review-cache.js';
import { createReviewPanelStore } from '../src/ui/use-review-panel.js';
import { createReviewPanel } from '../src/ui/review-panel.js';
import { createReviewBadge } from '../src/ui/review-badge.js';
import { createGoodsRecord, DEFAULT_SETTINGS } from '../src/domain/goods-record.js';
import { parseSalesLabel } from '../src/domain/parse-sales-label.js';
import { extractReviewCount } from '../src/domain/parse-review-count.js';
import { createSettingsStore } from '../src/settings/settings.js';
import { toCsv, buildCsvFilename } from '../src/export/to-csv.js';
import { toJson, buildJsonFilename } from '../src/export/to-json.js';
import { downloadCsv, downloadJson } from '../src/export/download.js';
import type { GoodsRecord } from '../src/domain/goods-record.js';

export default defineContentScript({
  matches: ['https://mobile.pinduoduo.com/search_result.html*'],
  runAt: 'document_idle',
  async main() {
    await initializeShopper();
  },
});

async function initializeShopper(): Promise<void> {
  const settingsStore = createSettingsStore();
  const settings = await settingsStore.load();
  const cache = createReviewCache(undefined, settings.cacheTtlHours);
  const fetcher = createGoodsFetcher({ strategy: 'fetch' });
  const panelStore = createReviewPanelStore(settings);

  const badgeMap = new Map<string, ReturnType<typeof createReviewBadge>>();
  let allRecords: GoodsRecord[] = [];

  const panel = createPanelWithCallbacks({
    panelStore,
    allRecordsRef: () => allRecords,
    settings,
    cache,
    fetcher,
  });

  panel.mount();
  panel.render(panelStore.getViewModel());
  panelStore.subscribe((viewModel) => panel.render(viewModel));

  const discoveredCards = findCards(document);
  if (discoveredCards.length === 0) {
    showLayoutUnrecognised(panelStore);
  } else {
    allRecords = await buildInitialRecords(discoveredCards);
    mountBadges(allRecords, badgeMap);
    panelStore.setRecords(allRecords);
  }

  const queue = createQueue({
    settings,
    cache,
    fetcher,
    panelStore,
    badgeMap,
    allRecordsRef: () => allRecords,
  });

  attachPanelControlHandlers(panelStore, queue, () => allRecords, settings, cache, fetcher, panel);

  watchForNewCards(panelStore, badgeMap, () => allRecords, (updated) => { allRecords = updated; });

  if (settings.autoStart && allRecords.length > 0) {
    startCollection(panelStore, queue, allRecords);
  }
}

type PanelDeps = {
  panelStore: ReturnType<typeof createReviewPanelStore>;
  allRecordsRef: () => GoodsRecord[];
  settings: typeof DEFAULT_SETTINGS;
  cache: ReturnType<typeof createReviewCache>;
  fetcher: ReturnType<typeof createGoodsFetcher>;
};

function createPanelWithCallbacks(deps: PanelDeps): ReturnType<typeof createReviewPanel> {
  return createReviewPanel({
    onStart: () => {},
    onPause: () => {},
    onResume: () => {},
    onReset: () => {},
    onSortChange: (key) => deps.panelStore.setSortKey(key),
    onMinReviewsChange: (value) => deps.panelStore.setMinReviews(value),
    onMaxItemsChange: (value) => deps.panelStore.setMaxItems(value),
    onExportCsv: () => handleExportCsv(deps),
    onExportJson: () => handleExportJson(deps),
    onRowClick: (goodsId) => scrollToCard(goodsId),
  });
}

function handleExportCsv(deps: PanelDeps): void {
  const records = deps.allRecordsRef();
  const content = toCsv(records);
  const searchKey = getSearchKey();
  const filename = buildCsvFilename(searchKey, new Date());
  downloadCsv(content, filename);
}

function handleExportJson(deps: PanelDeps): void {
  const records = deps.allRecordsRef();
  const searchKey = getSearchKey();
  const content = toJson(records, searchKey, deps.settings, new Date());
  const filename = buildJsonFilename(searchKey, new Date());
  downloadJson(content, filename);
}

function getSearchKey(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('search_key') ?? params.get('searchKey') ?? 'export';
}

function scrollToCard(goodsId: string): void {
  const card = document.querySelector(`[data-goods-id="${goodsId}"]`) ?? findCardByHref(goodsId);
  if (card !== null) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightCard(card as HTMLElement);
  }
}

function findCardByHref(goodsId: string): Element | null {
  return document.querySelector(`a[href*="goods_id=${goodsId}"]`);
}

function highlightCard(element: HTMLElement): void {
  const original = element.style.outline;
  element.style.outline = '2px solid #ff5722';
  window.setTimeout(() => { element.style.outline = original; }, 2000);
}

function showLayoutUnrecognised(panelStore: ReturnType<typeof createReviewPanelStore>): void {
  panelStore.setBlockedMessage("Couldn't read this page's layout. PDD may have changed it.");
}

async function buildInitialRecords(cards: ReturnType<typeof findCards>): Promise<GoodsRecord[]> {
  return cards.map((card) => buildRecordFromCard(card));
}

function buildRecordFromCard(card: { goodsId: string; element: Element; position: number }): GoodsRecord {
  const title = extractTitle(card.element);
  const priceText = extractPrice(card.element);
  const salesLabel = extractSalesLabel(card.element);
  return createGoodsRecord({
    goodsId: card.goodsId,
    title,
    priceText,
    salesLabel,
    url: `https://mobile.pinduoduo.com/goods.html?goods_id=${card.goodsId}`,
    position: card.position,
  });
}

function extractTitle(element: Element): string {
  const titleEl = element.querySelector('[class*="title"]') ?? element.querySelector('[class*="name"]');
  if (titleEl !== null) return (titleEl.textContent ?? '').trim();
  return element.textContent?.trim().slice(0, 100) ?? '';
}

function extractPrice(element: Element): string {
  const priceEl = element.querySelector('[class*="price"]');
  if (priceEl !== null) return (priceEl.textContent ?? '').trim();
  return '';
}

function extractSalesLabel(element: Element): ReturnType<typeof parseSalesLabel> {
  const labelEl = element.querySelector('[class*="sales"]') ?? element.querySelector('[class*="label"]');
  const raw = labelEl?.textContent?.trim() ?? '';
  if (raw === '') {
    const fallbackText = element.textContent ?? '';
    const labelMatch = fallbackText.match(/(热销[^ ]*|本店已拼\d+|已拼[^ ]*)/);
    if (labelMatch !== null) return parseSalesLabel(labelMatch[0]);
    return null;
  }
  return parseSalesLabel(raw);
}

function mountBadges(
  records: GoodsRecord[],
  badgeMap: Map<string, ReturnType<typeof createReviewBadge>>,
): void {
  for (const record of records) {
    const card = document.querySelector(`a[href*="goods_id=${record.goodsId}"]`) ?? document.querySelector(`[data-goods-id="${record.goodsId}"]`);
    if (card === null) continue;
    const badge = createReviewBadge(card, {
      goodsId: record.goodsId,
      status: record.status,
      reviewCount: record.reviewCount,
      errorMessage: record.errorMessage,
    });
    badgeMap.set(record.goodsId, badge);
  }
}

function createQueue(deps: {
  settings: typeof DEFAULT_SETTINGS;
  cache: ReturnType<typeof createReviewCache>;
  fetcher: ReturnType<typeof createGoodsFetcher>;
  panelStore: ReturnType<typeof createReviewPanelStore>;
  badgeMap: Map<string, ReturnType<typeof createReviewBadge>>;
  allRecordsRef: () => GoodsRecord[];
}): ReturnType<typeof createThrottleQueue> {
  return createThrottleQueue({
    concurrency: deps.settings.concurrency,
    minDelayMs: deps.settings.delayMs.min,
    maxDelayMs: deps.settings.delayMs.max,
    maxItems: deps.settings.maxItems,
    fetchFn: (goodsId) => fetchWithCache(goodsId, deps.cache, deps.fetcher),
    onResult: (goodsId, outcome) => handleQueueResult(goodsId, outcome, deps),
    onBlocked: () => deps.panelStore.setBlockedMessage('PDD asked for verification. Complete it in a tab, then press Resume.'),
    onDrained: () => deps.panelStore.setState('done'),
  });
}

async function fetchWithCache(
  goodsId: string,
  cache: ReturnType<typeof createReviewCache>,
  fetcher: ReturnType<typeof createGoodsFetcher>,
): Promise<import('../src/domain/goods-record.js').FetchOutcome> {
  const cached = await cache.get(goodsId);
  if (cached !== null) {
    return { status: 'ok', reviewCount: cached.reviewCount, errorMessage: null };
  }
  return fetcher.fetchReviewCount(goodsId);
}

function handleQueueResult(
  goodsId: string,
  outcome: { status: string; reviewCount: number | null; errorMessage: string | null },
  deps: {
    panelStore: ReturnType<typeof createReviewPanelStore>;
    badgeMap: Map<string, ReturnType<typeof createReviewBadge>>;
    allRecordsRef: () => GoodsRecord[];
  },
): void {
  const fetchedAt = new Date().toISOString();
  deps.panelStore.updateRecord(goodsId, {
    reviewCount: outcome.reviewCount,
    status: outcome.status as GoodsRecord['status'],
    errorMessage: outcome.errorMessage,
    fetchedAt,
    source: 'network',
  });
  const badge = deps.badgeMap.get(goodsId);
  if (badge !== undefined) {
    badge.update({
      goodsId,
      status: outcome.status as GoodsRecord['status'],
      reviewCount: outcome.reviewCount,
      errorMessage: outcome.errorMessage,
    });
  }
}

function attachPanelControlHandlers(
  panelStore: ReturnType<typeof createReviewPanelStore>,
  queue: ReturnType<typeof createThrottleQueue>,
  allRecordsRef: () => GoodsRecord[],
  settings: typeof DEFAULT_SETTINGS,
  _cache: ReturnType<typeof createReviewCache>,
  _fetcher: ReturnType<typeof createGoodsFetcher>,
  _panel: ReturnType<typeof createReviewPanel>,
): void {
  // Re-wire start/pause/resume/reset after queue is created
  // We recreate the panel callbacks by subscribing to state changes;
  // actual wiring is done via panelStore listeners that the content script
  // sets up as event delegation on the Shadow DOM buttons.
  // For testability, we expose queue controls on panelStore via custom events.
  // Here we monkey-patch the panel's button handlers through DOM events:
  document.addEventListener('shopper:start', () => startCollection(panelStore, queue, allRecordsRef()));
  document.addEventListener('shopper:pause', () => handlePause(panelStore, queue));
  document.addEventListener('shopper:resume', () => handleResume(panelStore, queue));
  document.addEventListener('shopper:reset', () => handleReset(panelStore, queue));
  void settings;
}

function startCollection(
  panelStore: ReturnType<typeof createReviewPanelStore>,
  queue: ReturnType<typeof createThrottleQueue>,
  records: GoodsRecord[],
): void {
  panelStore.setState('running');
  const pending = records.filter((record) => record.status === 'pending').map((record) => ({ goodsId: record.goodsId }));
  if (pending.length > 0) queue.enqueue(pending);
}

function handlePause(
  panelStore: ReturnType<typeof createReviewPanelStore>,
  queue: ReturnType<typeof createThrottleQueue>,
): void {
  queue.pause();
  panelStore.setState('paused');
}

function handleResume(
  panelStore: ReturnType<typeof createReviewPanelStore>,
  queue: ReturnType<typeof createThrottleQueue>,
): void {
  queue.resume();
  panelStore.setState('running');
}

function handleReset(
  panelStore: ReturnType<typeof createReviewPanelStore>,
  queue: ReturnType<typeof createThrottleQueue>,
): void {
  queue.reset();
  panelStore.setState('idle');
  panelStore.setBlockedMessage(null);
}

function watchForNewCards(
  panelStore: ReturnType<typeof createReviewPanelStore>,
  badgeMap: Map<string, ReturnType<typeof createReviewBadge>>,
  allRecordsRef: () => GoodsRecord[],
  setAllRecords: (records: GoodsRecord[]) => void,
): void {
  watchCards({
    onNewCards: (newCards) => {
      const newRecords = newCards.map(buildRecordFromCard);
      const existing = allRecordsRef();
      const updated = [...existing, ...newRecords];
      setAllRecords(updated);
      panelStore.addRecords(newRecords);
      mountBadges(newRecords, badgeMap);
    },
  });
}

// Declare WXT global for typecheck — wxt provides defineContentScript at build time.
declare function defineContentScript(options: {
  matches: string[];
  runAt?: string;
  main: () => void | Promise<void>;
}): unknown;
