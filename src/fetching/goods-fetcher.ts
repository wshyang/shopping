import type { FetchOutcome } from '../domain/goods-record.js';
import { parseReviewCount } from '../domain/parse-review-count.js';
import { isBlocked } from './risk-detect.js';

export type FetcherStrategy = 'fetch' | 'iframe';

export type GoodsFetcherOptions = {
  strategy?: FetcherStrategy;
  fetchImpl?: typeof fetch;
};

function buildGoodsUrl(goodsId: string): string {
  return `https://mobile.pinduoduo.com/goods.html?goods_id=${encodeURIComponent(goodsId)}`;
}

function toOutcomeFromHtml(html: string, url: string, status: number): FetchOutcome {
  const blocked = isBlocked({ url, status, body: html });
  if (blocked) {
    return { status: 'blocked', reviewCount: null, errorMessage: 'blocked — verification required' };
  }

  const parsed = parseReviewCount(html);
  if (parsed.count !== null) {
    return { status: 'ok', reviewCount: parsed.count, errorMessage: null };
  }

  return { status: 'not_found', reviewCount: null, errorMessage: 'review marker missing' };
}

async function fetchViaFetch(
  goodsId: string,
  fetchImpl: typeof fetch,
): Promise<FetchOutcome> {
  const url = buildGoodsUrl(goodsId);
  let response: Response;
  try {
    response = await fetchImpl(url, { credentials: 'include' });
  } catch (error) {
    return { status: 'error', reviewCount: null, errorMessage: getErrorMessage(error) };
  }

  const body = await response.text();
  const blocked = isBlocked({ url: response.url, status: response.status, body });
  if (blocked) {
    return { status: 'blocked', reviewCount: null, errorMessage: 'blocked — verification required' };
  }

  if (!response.ok) {
    return { status: 'error', reviewCount: null, errorMessage: `HTTP ${response.status}` };
  }

  return toOutcomeFromHtml(body, response.url, response.status);
}

function fetchViaIframe(goodsId: string): Promise<FetchOutcome> {
  return createIframeFetch(goodsId);
}

function createIframeFetch(goodsId: string): Promise<FetchOutcome> {
  const url = buildGoodsUrl(goodsId);
  return new Promise((resolve) => {
    const iframe = createHiddenIframe(url);
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanupIframe(iframe);
      resolve({ status: 'error', reviewCount: null, errorMessage: 'iframe timeout' });
    }, 15_000);

    iframe.onload = () => {
      if (settled) return;
      const result = readIframeContent(iframe);
      settled = true;
      window.clearTimeout(timeout);
      cleanupIframe(iframe);
      resolve(result);
    };

    iframe.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      cleanupIframe(iframe);
      resolve({ status: 'error', reviewCount: null, errorMessage: 'iframe load error' });
    };

    document.body.appendChild(iframe);
  });
}

function createHiddenIframe(url: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.display = 'none';
  iframe.style.width = '0';
  iframe.style.height = '0';
  return iframe;
}

function readIframeContent(iframe: HTMLIFrameElement): FetchOutcome {
  try {
    const doc = iframe.contentDocument;
    if (doc === null) {
      return { status: 'error', reviewCount: null, errorMessage: 'iframe access denied' };
    }
    const html = doc.documentElement.outerHTML;
    const currentUrl = iframe.contentWindow?.location.href ?? iframe.src;
    return toOutcomeFromHtml(html, currentUrl, 200);
  } catch (error) {
    return { status: 'error', reviewCount: null, errorMessage: getErrorMessage(error) };
  }
}

function cleanupIframe(iframe: HTMLIFrameElement): void {
  iframe.remove();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createGoodsFetcher(options: GoodsFetcherOptions = {}): {
  fetchReviewCount: (goodsId: string) => Promise<FetchOutcome>;
} {
  const strategy = options.strategy ?? 'fetch';
  const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);

  return {
    fetchReviewCount: (goodsId: string) => dispatchFetch(goodsId, strategy, fetchImpl),
  };
}

function dispatchFetch(goodsId: string, strategy: FetcherStrategy, fetchImpl: typeof fetch): Promise<FetchOutcome> {
  if (strategy === 'iframe') return fetchViaIframe(goodsId);
  return fetchViaFetch(goodsId, fetchImpl);
}
