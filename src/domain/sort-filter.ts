import type { GoodsRecord } from './goods-record';

export type SortKey = 'reviews_desc' | 'sales_desc' | 'position_asc' | 'feedback_ratio_desc';

export type ViewSettings = {
  minimumReviews: number;
  sort: SortKey;
};

type Comparable = number | null;

export function sortAndFilterRecords(
  records: readonly GoodsRecord[],
  settings: ViewSettings,
): GoodsRecord[] {
  const filtered = records.filter((record) => meetsMinimumReviews(record, settings.minimumReviews));
  return filtered.sort((left, right) => compareRecords(left, right, settings.sort));
}

function meetsMinimumReviews(record: GoodsRecord, minimum: number): boolean {
  if (minimum <= 0) return true;
  return record.reviewCount !== null && record.reviewCount >= minimum;
}

function compareRecords(left: GoodsRecord, right: GoodsRecord, sort: SortKey): number {
  if (sort === 'position_asc') return left.position - right.position;
  const leftValue = getSortValue(left, sort);
  const rightValue = getSortValue(right, sort);
  return compareNullableDescending(leftValue, rightValue) || left.position - right.position;
}

function getSortValue(record: GoodsRecord, sort: Exclude<SortKey, 'position_asc'>): Comparable {
  if (sort === 'reviews_desc') return record.reviewCount;
  if (sort === 'sales_desc') return record.salesLabel?.count ?? null;
  return getFeedbackRatio(record);
}

function getFeedbackRatio(record: GoodsRecord): Comparable {
  const salesCount = record.salesLabel?.count;
  if (record.reviewCount === null || !salesCount || salesCount <= 0) return null;
  return record.reviewCount / salesCount;
}

function compareNullableDescending(left: Comparable, right: Comparable): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}
