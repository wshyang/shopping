import { goodsUrl, type FetchOutcome } from "../domain/goods-record";
import { parseReviewCount } from "../domain/parse-review-count";
import { isBlocked } from "./risk-detect";
function isRedirect(response: Response): boolean {
  return (
    response.type === "opaqueredirect" ||
    (response.status >= 300 && response.status < 400)
  );
}
export async function fetchReviewCount(
  goodsId: string,
  signal: AbortSignal,
): Promise<FetchOutcome> {
  const base = {
    reviewCount: null,
    fetchedAt: null,
    source: "network" as const,
  };
  try {
    if (!/^\d+$/.test(goodsId)) throw new Error("Invalid goods ID");
    const response = await fetch(goodsUrl(goodsId), {
      credentials: "include",
      redirect: "manual",
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    });
    if (isRedirect(response))
      return {
        ...base,
        status: "blocked",
        errorMessage: "页面要求跳转，请打开商品页核对后手动继续",
      };
    const body = await response.text();
    if (isBlocked({ status: response.status, url: response.url, body }))
      return {
        ...base,
        status: "blocked",
        errorMessage: "请在拼多多完成验证后手动继续",
      };
    if (!response.ok)
      return {
        ...base,
        status: response.status >= 500 ? "error" : "not_found",
        errorMessage: `HTTP ${response.status}`,
      };
    const reviewCount = parseReviewCount(body);
    return {
      ...base,
      reviewCount,
      status: reviewCount === null ? "not_found" : "ok",
      errorMessage:
        reviewCount === null ? "未能读取评价数量，请打开商品页核对" : null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { ...base, status: "error", errorMessage: "请求失败或超时" };
  }
}
