import type { FetchOutcome, FetchStatus, GoodsRecord } from '../domain/goods-record';
import { withFetchOutcome, withFetchStatus } from '../domain/goods-record';
import { sortAndFilterRecords } from '../domain/sort-filter';
import type { SortKey } from '../domain/sort-filter';

export type PanelPhase = 'idle' | 'running' | 'paused' | 'done';
export type StatusCounts = Record<FetchStatus, number>;

export type ReviewPanelViewModel = {
  phase: PanelPhase;
  pauseReason: string | null;
  layoutError: string | null;
  maxItems: number;
  minimumReviews: number;
  sort: SortKey;
  records: readonly GoodsRecord[];
  progress: { completed: number; total: number };
  statusCounts: StatusCounts;
  canExport: boolean;
};

export type ReviewPanelController = {
  subscribe(listener: () => void): () => void;
  getViewModel(): ReviewPanelViewModel;
  getAllRecords(): readonly GoodsRecord[];
  getRunnableRecords(): readonly GoodsRecord[];
  addRecords(records: readonly GoodsRecord[]): void;
  updateRecord(goodsId: string, outcome: FetchOutcome): void;
  setMaximumItems(value: number): void;
  setMinimumReviews(value: number): void;
  setSort(value: SortKey): void;
  setLayoutError(message: string | null): void;
  start(): void;
  pause(reason?: string): void;
  resume(): void;
  complete(): void;
  reset(): void;
};

type ControllerOptions = { maxItems: number };

export function createReviewPanelController(options: ControllerOptions): ReviewPanelController {
  return new ReviewPanelControllerImplementation(options);
}

class ReviewPanelControllerImplementation implements ReviewPanelController {
  private recordsValue: readonly GoodsRecord[] = [];
  private phaseValue: PanelPhase = 'idle';
  private pauseReasonValue: string | null = null;
  private layoutErrorValue: string | null = null;
  private maximumItems: number;
  private minimumReviews = 0;
  private sortValue: SortKey = 'position_asc';
  private readonly listeners = new Set<() => void>();

  constructor(options: ControllerOptions) {
    this.maximumItems = options.maxItems;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getAllRecords(): readonly GoodsRecord[] {
    return this.recordsValue;
  }

  getRunnableRecords(): readonly GoodsRecord[] {
    return this.recordsValue.filter(
      (record) => record.position <= this.maximumItems && record.status !== 'ok',
    );
  }

  addRecords(incoming: readonly GoodsRecord[]): void {
    const additions = getNewRecords(this.recordsValue, incoming);
    if (additions.length === 0) return;
    this.recordsValue = [...this.recordsValue, ...additions];
    this.layoutErrorValue = null;
    this.notify();
  }

  updateRecord(goodsId: string, outcome: FetchOutcome): void {
    this.recordsValue = this.recordsValue.map((record) =>
      record.goodsId === goodsId ? withFetchOutcome(record, outcome) : record,
    );
    this.notify();
  }

  setMaximumItems(value: number): void {
    this.maximumItems = Math.min(300, Math.max(1, Math.round(value)));
    if (this.phaseValue !== 'idle') this.applyCap();
    this.notify();
  }

  setMinimumReviews(value: number): void {
    this.minimumReviews = Math.max(0, Math.round(value));
    this.notify();
  }

  setSort(value: SortKey): void {
    this.sortValue = value;
    this.notify();
  }

  setLayoutError(message: string | null): void {
    this.layoutErrorValue = message;
    this.notify();
  }

  start(): void {
    this.applyCap();
    this.phaseValue = 'running';
    this.pauseReasonValue = null;
    this.notify();
  }

  pause(reason = '已暂停'): void {
    if (this.phaseValue !== 'running') return;
    this.phaseValue = 'paused';
    this.pauseReasonValue = reason;
    this.notify();
  }

  resume(): void {
    if (this.phaseValue !== 'paused') return;
    this.phaseValue = 'running';
    this.pauseReasonValue = null;
    this.notify();
  }

  complete(): void {
    if (this.phaseValue !== 'running') return;
    this.phaseValue = 'done';
    this.notify();
  }

  reset(): void {
    this.recordsValue = this.recordsValue.map((record) => withFetchStatus(record, 'pending'));
    this.phaseValue = 'idle';
    this.pauseReasonValue = null;
    this.notify();
  }

  getViewModel(): ReviewPanelViewModel {
    const statusCounts = countStatuses(this.recordsValue);
    const activeRecords = this.recordsValue.filter(({ position }) => position <= this.maximumItems);
    return {
      phase: this.phaseValue,
      pauseReason: this.pauseReasonValue,
      layoutError: this.layoutErrorValue,
      maxItems: this.maximumItems,
      minimumReviews: this.minimumReviews,
      sort: this.sortValue,
      records: sortAndFilterRecords(this.recordsValue, {
        minimumReviews: this.minimumReviews,
        sort: this.sortValue,
      }),
      progress: { completed: countCompleted(activeRecords), total: activeRecords.length },
      statusCounts,
      canExport: statusCounts.ok > 0,
    };
  }

  private applyCap(): void {
    this.recordsValue = this.recordsValue.map((record) => {
      if (record.position > this.maximumItems && record.status === 'pending') {
        return withFetchStatus(record, 'skipped_cap');
      }
      return record.status === 'skipped_cap' && record.position <= this.maximumItems
        ? withFetchStatus(record, 'pending')
        : record;
    });
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function getNewRecords(
  existing: readonly GoodsRecord[],
  incoming: readonly GoodsRecord[],
): GoodsRecord[] {
  const known = new Set(existing.map(({ goodsId }) => goodsId));
  const additions: GoodsRecord[] = [];
  incoming.forEach((record) => {
    if (known.has(record.goodsId)) return;
    known.add(record.goodsId);
    additions.push(record);
  });
  return additions;
}

function countStatuses(records: readonly GoodsRecord[]): StatusCounts {
  const empty: StatusCounts = {
    pending: 0,
    ok: 0,
    not_found: 0,
    blocked: 0,
    error: 0,
    skipped_cap: 0,
  };
  return records.reduce(
    (counts, { status }) => ({ ...counts, [status]: counts[status] + 1 }),
    empty,
  );
}

function countCompleted(records: readonly GoodsRecord[]): number {
  return records.filter(({ status }) => status !== 'pending').length;
}
