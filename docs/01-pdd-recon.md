# PDD Recon Findings

Status: **Template — to be filled after live recon (Phase 0, ARCHITECTURE §4).** Until then every field is `[RECON]` and the implementation falls back to defensive defaults documented below. This file becomes the source for selectors, JSON paths, and block markers; code must read from no other place.

> How to run recon: `npm run recon:browser` → user logs in → `npm run recon:harvest` → `npm run recon:capture` → `npm run recon:sanitize`. See `scripts/recon/*.mjs`.

## R1 — Card DOM

| Field | Value | Notes |
|---|---|---|
| Container selector | `[RECON]` | Candidate: `div[data-goods-id]`, `a[href*="goods.html?goods_id="]`, `div[class*="goods-item"]`. Defensive: try all three (see `src/discovery/find-cards.ts`). |
| `goods_id` location | `[RECON]` | Candidate: `href` param `goods_id=`, `data-goods-id`, React prop via `__reactProps$` |
| Position anchor | DOM order | 1-based rank = order in `findCards()` result |
| Infinite scroll | `[RECON]` | MutationObserver on `document.body` subtree; defensive fallback also polls `setInterval` 1 s for 5 s after scroll |

## R2 — Search list source

| Field | Value |
|---|---|
| SSR vs XHR | `[RECON]` |
| XHR endpoint (if any) | `[RECON]` |
| Needs `anti_content` | `[RECON]` |
| HAR fixture | `tests/fixtures/pdd/search-xiyifen.html` + `search-list-page2.json` (if XHR) |

## R3 — Review count source on goods page

| Field | Value |
|---|---|
| `window.rawData` JSON path to review count | `[RECON]` |
| Example rawData path | `[RECON]` e.g. `store.goodsData.reviewCount` or `initDataObj.reviews.total` — defensive parser tries multiple candidate paths |
| Fallback text marker | `商品评价( N )` / `商品评价（N）` — text fallback always available |
| Zero-review marker | `暂无评价` → 0 |

Candidate `rawData` paths tried by `parse-review-count.ts` (defensive, before recon narrows to one):
- `data.goods.reviewNum`
- `store.goods.reviewCount`
- `initDataObj.goods.commentsCount`
- `result.goods.comments.count`

## R4 — Strategy A viability

| Field | Value |
|---|---|
| `fetch(goodsUrl, {credentials:'include'})` returns HTML with count | `[RECON]` |
| Requires `anti_content` | `[RECON]` |

If R4 = yes, `goods-fetcher.ts` uses strategy A (preferred). Otherwise B.

## R5 — Strategy B viability

| Field | Value |
|---|---|
| Hidden iframe renders count | `[RECON]` |

If R4 = no and R5 = yes, use strategy B.

## R6 — Meaning of 本店已拼

| Field | Value |
|---|---|
| Shop-level or item-level | `[RECON]` |
| UI label | Defensive: show as `本店已拼` verbatim; `kind: 'shop_group'` kept distinct so sort/filter can treat it separately. If shop-level, panel tooltip: `本店销量（非单品）` |

## R7 — Risk-control signal

| Field | Value |
|---|---|
| Block redirect URLs | `[RECON]` — candidates: `login.html`, `captcha`, `verify`, `risk`, `anti_spider` |
| Block status codes | 403, 429 (always treated as blocked) |
| Block body markers | `[RECON]` — candidates: `风控`, `验证`, `频繁`, `captcha`, `人机验证` |
| Approx rate that triggers | `[RECON]` |

Defensive defaults in `risk-detect.ts` (used until recon narrows):
- Redirect URL contains `login`, `captcha`, `verify`, `risk`, `anti_spider`.
- Status 403 or 429.
- Body contains `风控` / `人机验证` / `captcha` (case-insensitive).

## R8 — Other sales-label variants

| Variant | Counted in parser | Notes |
|---|---|---|
| `热销3.5万+件` | yes | hot_sales |
| `本店已拼8318` | yes | shop_group |
| `已拼10万+件` | yes | group |
| `总售…` | defensive: `unknown` prefix | Recon to confirm |
| No label / `新品` | null | |

## Fixtures produced

After recon, sanitized fixtures land in `tests/fixtures/pdd/`:
- `search-xiyifen.html`
- `search-list-page2.json` (if XHR)
- `goods-high.html` (high reviews), `goods-low.html` (low), `goods-zero.html` (zero/暂无评价)
- `blocked.html` (if seen)

Sanitizer: `scripts/recon/sanitize.mjs` strips cookies, tokens, `pdd_user_id`, addresses, phone numbers. Fixture-leak test asserts absence of `PDDAccessToken`, `pdd_user_id`, phone-like `\b1[3-9]\d{9}\b`.

## A-006 decision (pending recon)

Fetch strategy + throttle defaults chosen after R3–R5, R7 answered. Recorded as addendum A-006.
