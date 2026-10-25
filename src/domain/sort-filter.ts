import type { GoodsRecord } from './goods-record.js';

export type SortKey = 'reviews_desc' | 'sales_desc' | 'position_asc' | 'ratio_desc';

export type ViewSettings = {
  sortKey: SortKey;
  minReviews: number | null;
};

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  sortKey: 'reviews_desc',
  minReviews: null,
};

function passesMinReviewsFilter(record: GoodsRecord, minReviews: number | null): boolean {
  if (minReviews === null) return true;
  if (record.reviewCount === null) return false;
  return record.reviewCount >= minReviews;
}

function compareByReviewsDesc(a: GoodsRecord, b: GoodsRecord): number {
  return numericDesc(a.reviewCount, b.reviewCount);
}

function compareBySalesDesc(a: GoodsRecord, b: GoodsRecord): number {
  return numericDesc(a.salesLabel?.count ?? null, b.salesLabel?.count ?? null);
}

function compareByPositionAsc(a: GoodsRecord, b: GoodsRecord): number {
  return a.position - b.position;
}

function compareByRatioDesc(a: GoodsRecord, b: GoodsRecord): number {
  return numericDesc(computeFeedbackRatio(a), computeFeedbackRatio(b));
}

function computeFeedbackRatio(record: GoodsRecord): number | null {
  if (record.reviewCount === null) return null;
  const sales = record.salesLabel?.count;
  if (sales === null || sales === undefined || sales === 0) return null;
  return record.reviewCount / sales;
}

function numericDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function getComparator(sortKey: SortKey): (a: GoodsRecord, b: GoodsRecord) => number {
  const comparators: Record<SortKey, (a: GoodsRecord, b: GoodsRecord) => number> = {
    reviews_desc: compareByReviewsDesc,
    sales_desc: compareBySalesDesc,
    position_asc: compareByPositionAsc,
    ratio_desc: compareByRatioDesc,
  };
  return comparators[sortKey];
}

export function applySortFilter(
  records: GoodsRecord[],
  viewSettings: ViewSettings,
): GoodsRecord[] {
  const filtered = filterByMinReviews(records, viewSettings.minReviews);
  return sortRecords(filtered, viewSettings.sortKey);
}

function filterByMinReviews(records: GoodsRecord[], minReviews: number | null): GoodsRecord[] {
  return records.filter((record) => passesMinReviewsFilter(record, minReviews));
}

function sortRecords(records: GoodsRecord[], sortKey: SortKey): GoodsRecord[] {
  const comparator = getComparator(sortKey);
  return [...records].sort(comparator);
}
