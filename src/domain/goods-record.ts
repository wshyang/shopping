export type SalesKind = 'hot_sales' | 'shop_group' | 'group' | 'unknown';

export type SalesLabel = {
  raw: string;
  kind: SalesKind;
  count: number | null;
  isLowerBound: boolean;
};

export type FetchStatus = 'pending' | 'ok' | 'not_found' | 'blocked' | 'error' | 'skipped_cap';
export type RecordSource = 'cache' | 'network' | null;

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
  source: RecordSource;
};

export type GoodsRecordInput = Pick<
  GoodsRecord,
  'goodsId' | 'title' | 'priceText' | 'salesLabel' | 'url' | 'position'
>;

export type FetchOutcome = Pick<
  GoodsRecord,
  'status' | 'reviewCount' | 'errorMessage' | 'fetchedAt' | 'source'
>;

export function createGoodsRecord(input: GoodsRecordInput): GoodsRecord {
  return {
    ...input,
    reviewCount: null,
    status: 'pending',
    errorMessage: null,
    fetchedAt: null,
    source: null,
  };
}

export function withFetchOutcome(record: GoodsRecord, outcome: FetchOutcome): GoodsRecord {
  return { ...record, ...outcome };
}

export function withFetchStatus(
  record: GoodsRecord,
  status: Extract<FetchStatus, 'pending' | 'skipped_cap'>,
): GoodsRecord {
  return {
    ...record,
    status,
    reviewCount: null,
    errorMessage: null,
    fetchedAt: null,
    source: null,
  };
}
