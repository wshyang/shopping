import type { GoodsRecord } from '../domain/goods-record';
import type { Settings } from '../settings/settings';
import { toExportRow } from './export-row';

export type ExportMetadata = {
  searchKey: string;
  exportedAt: string;
  settings: Settings | Readonly<Settings>;
};

export function toJson(records: readonly GoodsRecord[], metadata: ExportMetadata): string {
  return JSON.stringify({ ...metadata, rows: records.map(toExportRow) }, null, 2);
}

export function createExportFilename(
  searchKey: string,
  date: Date,
  extension: 'csv' | 'json',
): string {
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const datePart = [local.getUTCFullYear() % 100, local.getUTCMonth() + 1, local.getUTCDate()]
    .map(padTwo)
    .join('');
  const timePart = [local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()]
    .map(padTwo)
    .join('');
  return `pdd-${sanitizeSearchKey(searchKey)}-${datePart}-${timePart}.${extension}`;
}

function sanitizeSearchKey(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (sanitized || 'search').slice(0, 40);
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}
