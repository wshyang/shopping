import type { GoodsRecord } from '../domain/goods-record';

export type ExportRow = {
  position: number;
  goods_id: string;
  title: string;
  price: string;
  sales_label: string;
  sales_count: number | null;
  sales_is_lower_bound: boolean | null;
  review_count: number | null;
  status: GoodsRecord['status'];
  fetched_at: string | null;
  url: string;
};

export function toExportRow(record: GoodsRecord): ExportRow {
  return {
    position: record.position,
    goods_id: record.goodsId,
    title: record.title,
    price: record.priceText,
    sales_label: record.salesLabel?.raw ?? '',
    sales_count: record.salesLabel?.count ?? null,
    sales_is_lower_bound: record.salesLabel?.isLowerBound ?? null,
    review_count: record.reviewCount,
    status: record.status,
    fetched_at: record.fetchedAt,
    url: record.url,
  };
}
