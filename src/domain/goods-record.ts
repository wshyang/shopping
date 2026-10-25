/**
 * Typed wire contract — single source of truth (GREENFIELD §6).
 * Every consumer imports from here; a field rename is a compile error.
 */

export type SalesKind = 'hot_sales' | 'shop_group' | 'group' | 'unknown';

export type SalesLabel = {
  raw: string;
  kind: SalesKind;
  count: number | null;
  isLowerBound: boolean;
};

export type FetchStatus =
  | 'pending'
  | 'ok'
  | 'not_found'
  | 'blocked'
  | 'error'
  | 'skipped_cap';

export type GoodsRecord = {
  goodsId: string;
  title: string;
  priceText: string;
  salesLabel: SalesLabel | null;
  reviewCount: number | null;
  url: string;
  position: number;
  status: FetchStatus;
  errorMessage: string | null;
  fetchedAt: string | null;
  source: 'cache' | 'network' | null;
};

export type CacheEntry = {
  reviewCount: number;
  fetchedAt: string;
};

export type Settings = {
  maxItems: number;
  concurrency: 1 | 2;
  delayMs: { min: number; max: number };
  cacheTtlHours: number;
  autoStart: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  maxItems: 60,
  concurrency: 1,
  delayMs: { min: 800, max: 1500 },
  cacheTtlHours: 24,
  autoStart: false,
};

export type FetchOutcome = {
  status: 'ok' | 'not_found' | 'blocked' | 'error';
  reviewCount: number | null;
  errorMessage: string | null;
};

export function createGoodsRecord(params: {
  goodsId: string;
  title: string;
  priceText: string;
  salesLabel: SalesLabel | null;
  url: string;
  position: number;
}): GoodsRecord {
  return {
    goodsId: params.goodsId,
    title: params.title,
    priceText: params.priceText,
    salesLabel: params.salesLabel,
    reviewCount: null,
    url: params.url,
    position: params.position,
    status: 'pending',
    errorMessage: null,
    fetchedAt: null,
    source: null,
  };
}

export function withFetchResult(
  record: GoodsRecord,
  outcome: FetchOutcome,
  fetchedAt: string,
  source: 'cache' | 'network',
): GoodsRecord {
  return {
    ...record,
    reviewCount: outcome.reviewCount,
    status: outcome.status,
    errorMessage: outcome.errorMessage,
    fetchedAt,
    source,
  };
}

export function toCacheEntry(reviewCount: number, fetchedAt: string): CacheEntry {
  return { reviewCount, fetchedAt };
}
