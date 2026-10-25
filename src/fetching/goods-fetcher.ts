import type { FetchOutcome } from '../domain/goods-record';
import { parseReviewCount } from '../domain/parse-review-count';
import { detectRiskControl } from './risk-detect';

export type FetchResult = {
  outcome: FetchOutcome;
  shouldRetry: boolean;
};

export interface GoodsFetcher {
  fetchReviewCount(goodsId: string): Promise<FetchResult>;
}

type FetcherOptions = {
  fetchImplementation?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
};

export function createHtmlGoodsFetcher(options: FetcherOptions = {}): GoodsFetcher {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 15_000;

  return {
    async fetchReviewCount(goodsId) {
      try {
        return await requestGoodsPage({ goodsId, fetchImplementation, now, timeoutMs });
      } catch (error) {
        return errorResult(getErrorMessage(error), now, true);
      }
    },
  };
}

type RequestOptions = Required<
  Pick<FetcherOptions, 'fetchImplementation' | 'now' | 'timeoutMs'>
> & {
  goodsId: string;
};

async function requestGoodsPage(options: RequestOptions): Promise<FetchResult> {
  const response = await options.fetchImplementation(getGoodsUrl(options.goodsId), {
    credentials: 'include',
    redirect: 'follow',
    signal: AbortSignal.timeout(options.timeoutMs),
  });
  const body = await response.text();
  const evidence = {
    status: response.status,
    url: response.url,
    redirected: response.redirected,
    body,
  };

  if (detectRiskControl(evidence)) return blockedResult(options.now);
  if (!response.ok)
    return errorResult(`HTTP ${response.status}`, options.now, response.status >= 500);
  return parsedResult(body, options.now);
}

function parsedResult(body: string, now: () => Date): FetchResult {
  const reviewCount = parseReviewCount(body);
  if (reviewCount === null) {
    return createResult({
      status: 'not_found',
      reviewCount: null,
      errorMessage: '未找到评价数；页面结构可能已变化',
      now,
      shouldRetry: false,
    });
  }
  return createResult({ status: 'ok', reviewCount, errorMessage: null, now, shouldRetry: false });
}

function blockedResult(now: () => Date): FetchResult {
  return createResult({
    status: 'blocked',
    reviewCount: null,
    errorMessage: '拼多多要求登录或安全验证',
    now,
    shouldRetry: false,
  });
}

function errorResult(message: string, now: () => Date, shouldRetry: boolean): FetchResult {
  return createResult({
    status: 'error',
    reviewCount: null,
    errorMessage: message,
    now,
    shouldRetry,
  });
}

type ResultOptions = {
  status: FetchOutcome['status'];
  reviewCount: number | null;
  errorMessage: string | null;
  now: () => Date;
  shouldRetry: boolean;
};

function createResult(options: ResultOptions): FetchResult {
  const { status, reviewCount, errorMessage, now, shouldRetry } = options;
  return {
    outcome: {
      status,
      reviewCount,
      errorMessage,
      fetchedAt: now().toISOString(),
      source: 'network',
    },
    shouldRetry,
  };
}

function getGoodsUrl(goodsId: string): string {
  const url = new URL('/goods.html', 'https://mobile.pinduoduo.com');
  url.searchParams.set('goods_id', goodsId);
  return url.toString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return '请求超时';
  if (error instanceof Error) return error.message.slice(0, 160);
  return '网络请求失败';
}
