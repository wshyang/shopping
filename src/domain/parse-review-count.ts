// Structured JSON paths are intentionally disabled until recon establishes their meaning.
// This pure fallback strips non-visible content; it never executes fetched scripts.
export function parseReviewCount(html: string): number | null {
  const text = html
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ");
  const match =
    /商品评价\s*[（(]\s*((?:\d{1,3}(?:[,，]\d{3})+|\d+)(?:\.\d+)?)\s*(万)?\+?\s*[)）]/.exec(
      text,
    );
  if (!match) return /暂无评价/.test(text) ? 0 : null;
  const count = Math.round(
    Number(match[1]!.replace(/[,，]/g, "")) * (match[2] ? 10000 : 1),
  );
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}
