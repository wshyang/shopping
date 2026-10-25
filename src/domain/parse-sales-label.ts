import type { SalesKind, SalesLabel } from './goods-record';
import { parseLocalizedCount } from './parse-count';

const PREFIX_KINDS: Readonly<Record<string, SalesKind>> = {
  热销: 'hot_sales',
  本店已拼: 'shop_group',
  已拼: 'group',
};

const SALES_PATTERN = /^(热销|本店已拼|已拼)\s*([\d,，]+(?:\.\d+)?\s*[万亿]?)\s*(\+)?\s*件?$/;

export function parseSalesLabel(raw: string): SalesLabel | null {
  const trimmed = raw.trim();
  const match = SALES_PATTERN.exec(trimmed);
  if (!match) return null;

  const prefix = match[1];
  const numberText = match[2];
  if (prefix === undefined || numberText === undefined) return null;

  const kind = PREFIX_KINDS[prefix];
  const count = parseLocalizedCount(numberText);
  if (!kind || count === null) return null;
  return { raw: trimmed, kind, count, isLowerBound: match[3] === '+' };
}
