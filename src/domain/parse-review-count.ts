import { parseLocalizedCount } from './parse-count';

const REVIEW_KEYS = [
  'reviewCount',
  'review_count',
  'reviewNum',
  'review_num',
  'goodsReviewCount',
  'goods_review_count',
  'commentsNumber',
  'comments_number',
] as const;

const REVIEW_TEXT_PATTERN = /商品评价\s*[（(]\s*([\d,，]+(?:\.\d+)?\s*[万亿]?\+?)\s*[)）]/;
const ZERO_REVIEW_PATTERN = /(?:商品评价[^\d]{0,20}暂无评价|暂无评价)/;

export function parseReviewCount(html: string): number | null {
  const structured = parseStructuredReviewCount(html);
  if (structured !== null) return structured;

  const visibleText = normalizeHtmlText(html);
  const match = REVIEW_TEXT_PATTERN.exec(visibleText);
  if (match?.[1]) return parseLocalizedCount(match[1]);
  return ZERO_REVIEW_PATTERN.test(visibleText) ? 0 : null;
}

function parseStructuredReviewCount(html: string): number | null {
  const literal = extractRawDataLiteral(html);
  if (literal === null) return null;

  try {
    return findReviewCount(JSON.parse(literal) as unknown);
  } catch {
    return null;
  }
}

function extractRawDataLiteral(html: string): string | null {
  const assignment = /(?:window\.)?rawData\s*=\s*/g.exec(html);
  if (!assignment) return null;

  const start = assignment.index + assignment[0].length;
  const opening = html[start];
  if (opening !== '{' && opening !== '[') return null;
  return scanJsonLiteral(html, start, opening === '{' ? '}' : ']');
}

function scanJsonLiteral(source: string, start: number, closing: '}' | ']'): string | null {
  let depth = 0;
  let isInString = false;
  let isEscaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === undefined) break;
    ({ isInString, isEscaped } = updateStringState(character, isInString, isEscaped));
    if (isInString || character === '"') continue;
    if (character === source[start]) depth += 1;
    if (character === closing) depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

function updateStringState(character: string, isInString: boolean, isEscaped: boolean) {
  if (!isInString) return { isInString: character === '"', isEscaped: false };
  if (isEscaped) return { isInString: true, isEscaped: false };
  if (character === '\\') return { isInString: true, isEscaped: true };
  return { isInString: character !== '"', isEscaped: false };
}

function findReviewCount(value: unknown): number | null {
  if (!isRecord(value) && !Array.isArray(value)) return null;
  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();
    const found = findReviewCountAtNode(current);
    if (found !== null) return found;
    if (Array.isArray(current)) queue.push(...(current as unknown[]));
    else if (isRecord(current)) queue.push(...Object.values(current));
  }
  return null;
}

function findReviewCountAtNode(value: unknown): number | null {
  if (!isRecord(value)) return null;
  for (const key of REVIEW_KEYS) {
    const count = normalizeStructuredCount(value[key]);
    if (count !== null) return count;
  }
  return null;
}

function normalizeStructuredCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value !== 'string') return null;
  return parseLocalizedCount(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHtmlText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ');
}
