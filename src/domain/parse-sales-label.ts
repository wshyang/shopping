import type { SalesLabel, SalesKind } from './goods-record.js';

type PrefixMatch = { kind: SalesKind; rest: string };

function matchPrefix(raw: string): PrefixMatch | null {
  if (raw.startsWith('本店已拼')) {
    return { kind: 'shop_group', rest: raw.slice('本店已拼'.length) };
  }
  if (raw.startsWith('热销')) {
    return { kind: 'hot_sales', rest: raw.slice('热销'.length) };
  }
  if (raw.startsWith('已拼')) {
    return { kind: 'group', rest: raw.slice('已拼'.length) };
  }
  if (isKnownPrefixWithoutCount(raw)) {
    return { kind: 'unknown', rest: raw };
  }
  return null;
}

function isKnownPrefixWithoutCount(raw: string): boolean {
  return raw.startsWith('总售') || raw.startsWith('已售');
}

function parseNumberPart(segment: string): number | null {
  const cleaned = stripTrailingDecorators(segment);
  return convertWithUnit(cleaned);
}

function stripTrailingDecorators(segment: string): string {
  return segment.replace(/件\s*$/, '').replace(/\+\s*$/, '').trim();
}

function hasLowerBoundMarker(segment: string): boolean {
  return segment.includes('+') || segment.includes('＋');
}

function convertWithUnit(cleaned: string): number | null {
  const unit = detectUnit(cleaned);
  const numericPart = stripUnit(cleaned, unit);
  const parsed = parseFloat(numericPart);
  if (Number.isNaN(parsed)) return null;
  return applyUnit(parsed, unit);
}

function detectUnit(cleaned: string): string | null {
  if (cleaned.includes('亿')) return '亿';
  if (cleaned.includes('万')) return '万';
  return null;
}

function stripUnit(cleaned: string, unit: string | null): string {
  if (unit === null) return cleaned;
  return cleaned.replace(unit, '').trim();
}

function applyUnit(value: number, unit: string | null): number {
  if (unit === '亿') return Math.round(value * 100_000_000);
  if (unit === '万') return Math.round(value * 10_000);
  return Math.round(value);
}

/**
 * Grammar: label := prefix number unit? "+"? "件"?
 * Defensive: handles 已拼/热销/本店已拼 + 万/亿 + optional +/件
 */
export function parseSalesLabel(raw: string): SalesLabel | null {
  const trimmed = raw.trim();
  if (trimmed === '' || isNonSalesLabel(trimmed)) return null;

  const prefix = matchPrefix(trimmed);
  if (prefix === null) return buildUnknownIfNumeric(trimmed);

  if (prefix.kind === 'unknown') {
    return buildUnknownSalesLabel(trimmed);
  }

  const numberPart = parseNumberPart(prefix.rest);
  if (numberPart === null) return null;

  return {
    raw: trimmed,
    kind: prefix.kind,
    count: numberPart,
    isLowerBound: hasLowerBoundMarker(prefix.rest),
  };
}

function isNonSalesLabel(trimmed: string): boolean {
  return trimmed === '新品' || trimmed === '暂无' || trimmed === '—' || trimmed === '-';
}

function buildUnknownIfNumeric(trimmed: string): SalesLabel | null {
  const numericMatch = trimmed.match(/([\d.]+)\s*(万|亿)?/);
  if (numericMatch === null) return null;
  const count = convertWithUnit(numericMatch[0].replace(/件/, '').trim());
  if (count === null) return null;
  return {
    raw: trimmed,
    kind: 'unknown',
    count,
    isLowerBound: trimmed.includes('+'),
  };
}

function buildUnknownSalesLabel(trimmed: string): SalesLabel {
  const count = parseNumberPart(trimmed.replace(/^总售|^已售/, ''));
  return {
    raw: trimmed,
    kind: 'unknown',
    count,
    isLowerBound: trimmed.includes('+'),
  };
}
