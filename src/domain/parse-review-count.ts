/**
 * Extract review count from a goods page HTML string.
 * Tries structured window.rawData paths first, then text fallback.
 * Defensive: tries multiple candidate paths until recon narrows to one.
 */

const RAW_DATA_SCRIPT_RE = /window\.rawData\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/;
const RAW_DATA_ASSIGN_RE = /window\.rawData\s*=\s*(\{.*?\})\s*;?(?:\n|<\/script>)/s;

const CANDIDATE_JSON_PATHS: string[][] = [
  ['data', 'goods', 'reviewNum'],
  ['data', 'goods', 'reviewCount'],
  ['store', 'goods', 'reviewCount'],
  ['store', 'goodsData', 'reviewNum'],
  ['initDataObj', 'goods', 'commentsCount'],
  ['initDataObj', 'goods', 'reviewCount'],
  ['result', 'goods', 'comments', 'count'],
  ['goods', 'reviewCount'],
  ['goods', 'commentNum'],
  ['goodsData', 'reviewCount'],
];

const REVIEW_TEXT_RE =
  /商品评价\s*[（(]\s*([\d,，.\s]+(?:万\+?|\+)?)\s*[)）]/;

const ZERO_REVIEW_RE = /暂无评价/;

function extractRawDataJson(html: string): unknown | null {
  const match = html.match(RAW_DATA_SCRIPT_RE) ?? html.match(RAW_DATA_ASSIGN_RE);
  if (match === null) return null;
  return safeJsonParse(match[1]);
}

function safeJsonParse(literal: string): unknown | null {
  try {
    return JSON.parse(literal) as unknown;
  } catch {
    return null;
  }
}

function walkPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function tryStructuredPaths(html: string): number | null {
  const root = extractRawDataJson(html);
  if (root === null) return null;
  for (const path of CANDIDATE_JSON_PATHS) {
    const value = walkPath(root, path);
    const numeric = coerceToNumber(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function coerceToNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') return parseReviewNumberText(value);
  return null;
}

function tryTextFallback(html: string): number | null {
  const stripped = html.replace(/<[^>]*>/g, ' ');
  const match = stripped.match(REVIEW_TEXT_RE);
  if (match === null) return null;
  return parseReviewNumberText(match[1]);
}

function isZeroReview(html: string): boolean {
  return ZERO_REVIEW_RE.test(html);
}

function parseReviewNumberText(raw: string): number | null {
  const trimmed = raw.replace(/[,\，\s]/g, '').trim();
  if (trimmed === '') return null;
  const plusStripped = trimmed.replace(/\+$/, '').replace(/＋$/, '');

  if (plusStripped.endsWith('万')) {
    const numeric = parseFloat(plusStripped.slice(0, -1));
    if (Number.isNaN(numeric)) return null;
    return Math.round(numeric * 10_000);
  }

  if (plusStripped.endsWith('亿')) {
    const numeric = parseFloat(plusStripped.slice(0, -1));
    if (Number.isNaN(numeric)) return null;
    return Math.round(numeric * 100_000_000);
  }

  const numeric = parseFloat(plusStripped);
  if (Number.isNaN(numeric)) return null;
  return Math.round(numeric);
}

export type ParseResult = {
  count: number | null;
  source: 'rawData' | 'text' | 'zero' | null;
};

export function parseReviewCount(html: string): ParseResult {
  const structured = tryStructuredPaths(html);
  if (structured !== null) return { count: structured, source: 'rawData' };

  const textCount = tryTextFallback(html);
  if (textCount !== null) return { count: textCount, source: 'text' };

  if (isZeroReview(html)) return { count: 0, source: 'zero' };

  return { count: null, source: null };
}

/** Convenience: returns number | null for callers that don't need source. */
export function extractReviewCount(html: string): number | null {
  return parseReviewCount(html).count;
}
