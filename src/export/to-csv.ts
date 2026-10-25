import type { GoodsRecord } from '../domain/goods-record';
import { toExportRow } from './export-row';
import type { ExportRow } from './export-row';

const COLUMNS: ReadonlyArray<keyof ExportRow> = [
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
];

export function toCsv(records: readonly GoodsRecord[]): string {
  const rows = records.map(toExportRow);
  const lines = [COLUMNS.join(','), ...rows.map(formatRow)];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function formatRow(row: ExportRow): string {
  return COLUMNS.map((column) => escapeCell(row[column])).join(',');
}

function escapeCell(value: ExportRow[keyof ExportRow]): string {
  if (value === null) return '';
  const safe = typeof value === 'string' ? makeSpreadsheetSafe(value) : String(value);
  if (!/[",\r\n]/.test(safe)) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
}

function makeSpreadsheetSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
