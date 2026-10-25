export type CardRef = {
  goodsId: string;
  element: Element;
  position: number;
};

/**
 * Defensive multi-selector discovery — tries several patterns
 * because recon selectors are still [RECON] (ARCHITECTURE §4).
 * Returns cards in DOM order, deduplicated by goodsId.
 */
const SELECTORS: string[] = [
  'a[href*="goods.html?goods_id="]',
  'a[href*="goods_id="]',
  '[data-goods-id]',
  '[data-goodsId]',
  'div[class*="goods-item"]',
  'div[class*="search-item"]',
];

const GOODS_ID_PARAM_RE = /goods_id=(\d+)/;
const GOODS_ID_DATA_RE = /^\d+$/;

function extractGoodsId(element: Element): string | null {
  const hrefId = extractFromHref(element);
  if (hrefId !== null) return hrefId;

  const dataId = extractFromDataAttribute(element);
  if (dataId !== null) return dataId;

  const nestedId = extractFromNestedLink(element);
  if (nestedId !== null) return nestedId;

  return null;
}

function extractFromHref(element: Element): string | null {
  if (!(element instanceof HTMLAnchorElement)) return null;
  const match = element.href.match(GOODS_ID_PARAM_RE);
  return match ? match[1] : null;
}

function extractFromDataAttribute(element: Element): string | null {
  const candidates = [
    element.getAttribute('data-goods-id'),
    element.getAttribute('data-goodsId'),
    element.getAttribute('data-goods-id-str'),
  ];
  for (const candidate of candidates) {
    if (candidate !== null && GOODS_ID_DATA_RE.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

function extractFromNestedLink(element: Element): string | null {
  const link = element.querySelector('a[href*="goods_id="]');
  if (link === null) return null;
  const href = (link as HTMLAnchorElement).href;
  const match = href.match(GOODS_ID_PARAM_RE);
  return match ? match[1] : null;
}

function collectCandidates(root: Document | Element): Element[] {
  const seen = new Set<Element>();
  const results: Element[] = [];
  for (const selector of SELECTORS) {
    const nodes = root.querySelectorAll(selector);
    for (const node of nodes) {
      if (!seen.has(node)) {
        seen.add(node);
        results.push(node);
      }
    }
  }
  return results;
}

function deduplicateByGoodsId(refs: CardRef[]): CardRef[] {
  const seen = new Set<string>();
  const deduped: CardRef[] = [];
  for (const ref of refs) {
    if (!seen.has(ref.goodsId)) {
      seen.add(ref.goodsId);
      deduped.push(ref);
    }
  }
  return deduped;
}

export function findCards(root: Document | Element = document): CardRef[] {
  const candidates = collectCandidates(root);
  const refs = buildCardRefs(candidates);
  return deduplicateByGoodsId(refs);
}

function buildCardRefs(elements: Element[]): CardRef[] {
  const refs: CardRef[] = [];
  let position = 1;
  for (const element of elements) {
    const goodsId = extractGoodsId(element);
    if (goodsId === null) continue;
    refs.push({ goodsId, element, position });
    position += 1;
  }
  return refs;
}
