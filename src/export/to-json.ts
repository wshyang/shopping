import type { GoodsRecord, Settings } from '../domain/goods-record.js';

export type ExportPayload = {
  searchKey: string;
  exportedAt: string;
  settings: Settings;
  records: GoodsRecord[];
};

function buildPayload(
  records: GoodsRecord[],
  searchKey: string,
  settings: Settings,
  now: Date,
): ExportPayload {
  return {
    searchKey,
    exportedAt: now.toISOString(),
    settings,
    records,
  };
}

export function toJson(
  records: GoodsRecord[],
  searchKey: string,
  settings: Settings,
  now: Date = new Date(),
): string {
  const payload = buildPayload(records, searchKey, settings, now);
  return JSON.stringify(payload, null, 2);
}

export function buildJsonFilename(searchKey: string, now: Date = new Date()): string {
  const stamp = formatTimestamp(now);
  const safeKey = sanitizeKey(searchKey);
  return `pdd-${safeKey}-${stamp}.json`;
}

function formatTimestamp(date: Date): string {
  const singapore = toSingaporeDate(date);
  const year = String(singapore.getFullYear()).slice(-2);
  const month = padTwo(singapore.getMonth() + 1);
  const day = padTwo(singapore.getDate());
  const hours = padTwo(singapore.getHours());
  const minutes = padTwo(singapore.getMinutes());
  const seconds = padTwo(singapore.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function toSingaporeDate(date: Date): Date {
  const utcMs = date.getTime();
  return new Date(utcMs + 8 * 3600 * 1000);
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function sanitizeKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed === '') return 'export';
  return trimmed.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 50);
}
