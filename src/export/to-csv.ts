import type { GoodsRecord } from '../domain/goods-record.js';

const CSV_COLUMNS = [
  'position',
  'goods_id',
  'title',
  'price',
  'sales_label',
  'sales_count',
  'sales_is_lower_bound',
  'review_count',
  'status',
  'fetched_at',
  'url',
] as const;

function escapeCsvField(field: string): string {
  const needsQuoting = field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r');
  if (!needsQuoting) return field;
  return `"${field.replace(/"/g, '""')}"`;
}

function recordToRow(record: GoodsRecord): string {
  const fields = buildFields(record);
  return fields.map(escapeCsvField).join(',');
}

function buildFields(record: GoodsRecord): string[] {
  return [
    String(record.position),
    record.goodsId,
    record.title,
    record.priceText,
    record.salesLabel?.raw ?? '',
    record.salesLabel?.count !== null && record.salesLabel?.count !== undefined ? String(record.salesLabel.count) : '',
    record.salesLabel !== null ? String(record.salesLabel.isLowerBound) : '',
    record.reviewCount !== null ? String(record.reviewCount) : '',
    record.status,
    record.fetchedAt ?? '',
    record.url,
  ];
}

function buildHeader(): string {
  return CSV_COLUMNS.join(',');
}

export function toCsv(records: GoodsRecord[]): string {
  const header = buildHeader();
  const rows = records.map(recordToRow);
  const body = [header, ...rows].join('\r\n');
  const bom = '\uFEFF';
  return bom + body + '\r\n';
}

export function buildCsvFilename(searchKey: string, now: Date = new Date()): string {
  const stamp = formatSingaporeTimestamp(now);
  const safeKey = sanitizeSearchKey(searchKey);
  return `pdd-${safeKey}-${stamp}.csv`;
}

function formatSingaporeTimestamp(date: Date): string {
  const singapore = toSingaporeTime(date);
  const year = String(singapore.getFullYear()).slice(-2);
  const month = padTwo(singapore.getMonth() + 1);
  const day = padTwo(singapore.getDate());
  const hours = padTwo(singapore.getHours());
  const minutes = padTwo(singapore.getMinutes());
  const seconds = padTwo(singapore.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function toSingaporeTime(date: Date): Date {
  const utcMs = date.getTime();
  const singaporeOffsetMs = 8 * 60 * 60 * 1000;
  return new Date(utcMs + singaporeOffsetMs);
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function sanitizeSearchKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed === '') return 'export';
  return trimmed.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 50);
}
