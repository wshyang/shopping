import type { SalesLabel } from '../domain/goods-record';
import { parseSalesLabel } from '../domain/parse-sales-label';

export type CardRef = {
  goodsId: string;
  title: string;
  priceText: string;
  salesLabel: SalesLabel | null;
  url: string;
  position: number;
  element: HTMLElement;
};

const GOODS_LINK_SELECTOR = 'a[href*="goods.html"][href*="goods_id="]';
const PRICE_PATTERN = /[¥￥]\s*\d+(?:\.\d{1,2})?/;
const SALES_PATTERN = /(?:本店已拼|热销|已拼)\s*[\d,，]+(?:\.\d+)?\s*[万亿]?\s*\+?\s*件?/;

export function findCards(root: Document | HTMLElement): CardRef[] {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(GOODS_LINK_SELECTOR));
  const uniqueLinks = getUniqueGoodsLinks(links);
  return uniqueLinks.map(({ link, goodsId }, index) => createCardRef(link, goodsId, index + 1));
}

function getUniqueGoodsLinks(links: readonly HTMLAnchorElement[]) {
  const seen = new Set<string>();
  return links.flatMap((link) => {
    const goodsId = getGoodsId(link);
    if (goodsId === null || seen.has(goodsId)) return [];
    seen.add(goodsId);
    return [{ link, goodsId }];
  });
}

function getGoodsId(link: HTMLAnchorElement): string | null {
  try {
    const href = link.getAttribute('href');
    if (!href) return null;
    const url = new URL(href, 'https://mobile.pinduoduo.com');
    if (url.origin !== 'https://mobile.pinduoduo.com') return null;
    if (!url.pathname.endsWith('/goods.html')) return null;
    const goodsId = url.searchParams.get('goods_id')?.trim();
    return goodsId && /^[A-Za-z0-9_-]+$/.test(goodsId) ? goodsId : null;
  } catch {
    return null;
  }
}

function createCardRef(link: HTMLAnchorElement, goodsId: string, position: number): CardRef {
  const element = findCardElement(link, goodsId);
  const text = getVisibleText(element);
  return {
    goodsId,
    title: findTitle(link, element, goodsId),
    priceText: PRICE_PATTERN.exec(text)?.[0]?.replace(/\s/g, '') ?? '',
    salesLabel: findSalesLabel(text),
    url: getCanonicalGoodsUrl(goodsId),
    position,
    element,
  };
}

function findCardElement(link: HTMLAnchorElement, goodsId: string): HTMLElement {
  const semantic = link.closest<HTMLElement>('li, article, [role="listitem"]');
  if (semantic) return semantic;

  let candidate: HTMLElement = link;
  let current = link.parentElement;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (!containsOnlyGoods(current, goodsId)) break;
    candidate = current;
    current = current.parentElement;
  }
  return candidate;
}

function containsOnlyGoods(element: HTMLElement, goodsId: string): boolean {
  const links = Array.from(element.querySelectorAll<HTMLAnchorElement>(GOODS_LINK_SELECTOR));
  const ids = links.map(getGoodsId).filter((id): id is string => id !== null);
  return ids.length > 0 && ids.every((id) => id === goodsId) && element.textContent.length < 2_000;
}

function findTitle(link: HTMLAnchorElement, card: HTMLElement, goodsId: string): string {
  const candidates = [
    link.getAttribute('aria-label'),
    link.getAttribute('title'),
    link.querySelector<HTMLImageElement>('img[alt]')?.alt,
    card.querySelector<HTMLElement>('[data-testid*="title"], [class*="title"]')?.textContent,
  ];
  const title = candidates.find((value) => value?.trim());
  return title?.trim().slice(0, 300) ?? `商品 ${goodsId}`;
}

function findSalesLabel(text: string): SalesLabel | null {
  const raw = SALES_PATTERN.exec(text)?.[0];
  return raw ? parseSalesLabel(raw) : null;
}

function getVisibleText(element: HTMLElement): string {
  return (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
}

function getCanonicalGoodsUrl(goodsId: string): string {
  const url = new URL('/goods.html', 'https://mobile.pinduoduo.com');
  url.searchParams.set('goods_id', goodsId);
  return url.toString();
}
