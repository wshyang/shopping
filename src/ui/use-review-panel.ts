import type { GoodsRecord, Settings } from '../domain/goods-record.js';
import { applySortFilter, type SortKey, type ViewSettings } from '../domain/sort-filter.js';

export type PanelState = 'idle' | 'running' | 'paused' | 'done';

export type PanelViewModel = {
  state: PanelState;
  progress: { done: number; total: number };
  countsByStatus: Record<string, number>;
  filteredCount: number;
  canExport: boolean;
  blockedMessage: string | null;
  rows: GoodsRecord[];
  sortKey: SortKey;
  minReviews: number | null;
  maxItems: number;
};

type Listener = (viewModel: PanelViewModel) => void;

function computeCountsByStatus(records: GoodsRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
  }
  return counts;
}

function computeDoneCount(records: GoodsRecord[]): number {
  return records.filter((record) => record.status !== 'pending').length;
}

function buildViewModel(
  records: GoodsRecord[],
  state: PanelState,
  viewSettings: ViewSettings,
  settings: Settings,
  blockedMessage: string | null,
): PanelViewModel {
  const rows = applySortFilter(records, viewSettings);
  return {
    state,
    progress: { done: computeDoneCount(records), total: records.length },
    countsByStatus: computeCountsByStatus(records),
    filteredCount: rows.length,
    canExport: records.some((record) => record.status === 'ok'),
    blockedMessage,
    rows,
    sortKey: viewSettings.sortKey,
    minReviews: viewSettings.minReviews,
    maxItems: settings.maxItems,
  };
}

export function createReviewPanelStore(initialSettings: Settings): {
  getViewModel: () => PanelViewModel;
  subscribe: (listener: Listener) => () => void;
  setRecords: (records: GoodsRecord[]) => void;
  updateRecord: (goodsId: string, patch: Partial<GoodsRecord>) => void;
  setState: (state: PanelState) => void;
  setBlockedMessage: (message: string | null) => void;
  setSortKey: (key: SortKey) => void;
  setMinReviews: (value: number | null) => void;
  setMaxItems: (value: number) => void;
  addRecords: (records: GoodsRecord[]) => void;
} {
  let records: GoodsRecord[] = [];
  let panelState: PanelState = 'idle';
  let blockedMessage: string | null = null;
  let viewSettings: ViewSettings = { sortKey: 'reviews_desc', minReviews: null };
  let currentSettings = { ...initialSettings };
  const listeners = new Set<Listener>();

  function emit(): void {
    const viewModel = buildViewModel(records, panelState, viewSettings, currentSettings, blockedMessage);
    for (const listener of listeners) listener(viewModel);
  }

  function getViewModel(): PanelViewModel {
    return buildViewModel(records, panelState, viewSettings, currentSettings, blockedMessage);
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setRecords(next: GoodsRecord[]): void {
    records = [...next];
    emit();
  }

  function addRecords(next: GoodsRecord[]): void {
    const existingIds = new Set(records.map((record) => record.goodsId));
    const filtered = next.filter((record) => !existingIds.has(record.goodsId));
    records = [...records, ...filtered];
    emit();
  }

  function updateRecord(goodsId: string, patch: Partial<GoodsRecord>): void {
    records = records.map((record) =>
      record.goodsId === goodsId ? { ...record, ...patch } : record,
    );
    emit();
  }

  function setState(state: PanelState): void {
    panelState = state;
    emit();
  }

  function setBlockedMessage(message: string | null): void {
    blockedMessage = message;
    emit();
  }

  function setSortKey(key: SortKey): void {
    viewSettings = { ...viewSettings, sortKey: key };
    emit();
  }

  function setMinReviews(value: number | null): void {
    viewSettings = { ...viewSettings, minReviews: value };
    emit();
  }

  function setMaxItems(value: number): void {
    currentSettings = { ...currentSettings, maxItems: value };
    emit();
  }

  return {
    getViewModel,
    subscribe,
    setRecords,
    addRecords,
    updateRecord,
    setState,
    setBlockedMessage,
    setSortKey,
    setMinReviews,
    setMaxItems,
  };
}
