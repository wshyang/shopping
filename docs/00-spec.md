# shopper — Living Functional Specification v0.1

Status: Draft (2026-10-24). Source of truth for product behaviour. All gaps/deviations are recorded in `addenda.md` as A-XXX.

## 1. Overview

A Manifest V3 browser extension that, on `https://mobile.pinduoduo.com/search_result.html?search_key=…`, collects the **review count** (`商品评价(N)`) for each visible product card and surfaces it:

- inline badge on each card,
- sortable/filterable floating panel,
- CSV (BOM, Excel-safe Chinese) and JSON export.

No server, no database, no account. Runs in the user's own logged-in Chromium session (A-001, A-002).

## 2. Actors

- **User** — logged into PDD on `mobile.pinduoduo.com`, browses search results, controls the extension via the panel and popup.
- No system actors stored as rows (extension-local only).

## 3. Supported pages

- **v1 only covers** `https://mobile.pinduoduo.com/search_result.html*` (mobile web). Desktop `yangkeduo.com` is out of scope (see ARCHITECTURE §19).

## 4. Discovery — finding product cards

- On content-script mount, scan `document` for product cards and emit `CardRef[]`.
- Observe `document` with `MutationObserver` for infinite-scroll inserts; emit new `CardRef` events.
- If no cards match the recon selectors on a search page, panel shows: `Couldn't read this page's layout. PDD may have changed it.` (ARCHITECTURE §13).
- Card identity is `goods_id` extracted from `href` (`goods.html?goods_id=`) or `data-*` fallback (exact selector in `docs/01-pdd-recon.md` R1).

```ts
type CardRef = { goodsId: string; element: Element; position: number };
```

## 5. Fetching — obtaining review counts

### 5.1 Record lifecycle

Each `CardRef` maps to a `GoodsRecord` (typed wire contract, ARCHITECTURE §6). Lifecycle:

```
discovered → pending → { ok | not_found | blocked | error | skipped_cap }
```

- `ok`: numeric `reviewCount` (including 0 for “暂无评价” / no number) + `fetchedAt` + `source`.
- `not_found`: parser found no review marker (`errorMessage: "review marker missing"`).
- `blocked`: risk-detect tripped (`errorMessage: "blocked — verification required"`).
- `error`: network/5xx after one retry (`errorMessage` = failure reason).
- `skipped_cap`: past `maxItems` cap (`reviewCount: null`).

Every record ends in exactly one terminal `FetchStatus`; nothing is dropped silently.

### 5.2 Fetch strategy

Determined by recon (A-006). Interface is strategy-agnostic:

```ts
type FetchOutcome = { status: 'ok' | 'not_found' | 'blocked' | 'error'; reviewCount: number | null; errorMessage: string | null; raw?: string };
function fetchReviewCount(goodsId: string): Promise<FetchOutcome>
```

- Preferred A: `fetch(goodsUrl, { credentials: 'include' })` from content script → parse HTML string.
- Fallback B: hidden same-origin `<iframe>` → wait for `商品评价` node → read → remove.
- Optional C: reviews XHR if unsigned. Only if recon finds one.

Strategy lives in `src/fetching/goods-fetcher.ts` behind one interface; switching touches one file.

### 5.3 Throttling, queue, and risk control

- **Queue:** FIFO in search-result order, deduplicated by `goodsId`, capped at `maxItems` (default 60, range 1–300). Past-cap rows are `skipped_cap`, shown greyed out, re-eligible if cap is raised.
- **Pacing:** `concurrency` workers (default 1, allowed 1|2). Between requests each worker waits uniform random `delayMs.min…max` (default 800–1500 ms).
- **Cache first:** `chrome.storage.local` entry `rc:${goodsId}` with `fetchedAt`; hit within `cacheTtlHours` (default 24) skips network (`source: 'cache'`).
- **Retry:** `error` (network/5xx) retries once after 5 s. `blocked` never retries.
- **Risk detection** (`src/fetching/risk-detect.ts`): response counts as `blocked` if it redirects to login/verify/captcha URL, returns 403/429, or contains a recon marker (R7). First `blocked` **pauses the queue globally**: panel shows `PDD asked for verification. Complete it in a tab, then press Resume.` No auto-resume.
- **Stopping:** queue stops on tab unload; nothing runs in background.

### 5.4 State machine (panel)

```
 idle ──Start──► running ──(drained)──► done
   ▲               │  ▲                  │
   │            Pause  Resume          Start (re-run)
   │               ▼  │                  │
   └──Reset──── paused ◄──(blocked)─────┘
```

Derived view model (in `use-review-panel.ts`): progress `n/total`, per-status counts, sorted/filtered rows, `canExport = rows.some(r => r.status === 'ok')`.

## 6. Parsing rules

### 6.1 Sales label → `SalesLabel | null`

Grammar (ARCHITECTURE §7.1). Variants from recon R8:

```
label := prefix number unit? "+"? "件"?
prefix := "热销" → hot_sales | "本店已拼" → shop_group | "已拼" → group
number := \d+(\.\d+)?   unit := "万" ×1e4 | "亿" ×1e8
```

| Input | kind | count | isLowerBound |
|---|---|---|---|
| 热销3.5万+件 | hot_sales | 35000 | true |
| 本店已拼8318 | shop_group | 8318 | false |
| 已拼10万+件 | group | 100000 | true |
| 热销1.2亿+件 | hot_sales | 120000000 | true |
| 新品 / empty | null | — | — |

Uses `Math.round(n * unit)` for integer arithmetic.

### 6.2 Review count → `number | null`

Tried in order, first match wins (ARCHITECTURE §7.2):

1. **Structured:** JSON from `window.rawData` embedded in goods HTML (`<script>window.rawData=…</script>`), read at recon path (R3). `JSON.parse` on extracted literal, never `eval`.
2. **Text fallback:** `/商品评价\s*[（(]\s*([\d,，.]+\\s*万?\+?)\s*[)）]/` on HTML, normalised with same 万 rule (`1.2万+` → 12000).
3. Neither → `not_found`. No guessing. `暂无评价` or marker with no number → `0` with `ok`.

## 7. UI

### 7.1 Badge (per card, Shadow DOM)

Pill below sales label:

- `评价 22,999` (ok), `评价 …` (pending), `评价 ?` (not_found/error, tooltip = reason), `⛔` (blocked).
- Colour bucket by review count: <100, <1k, <10k, ≥10k (implementation chooses distinct CSS classes; exact colours in `review-badge.ts`).
- Uses `textContent` only; never `innerHTML` with fetched data (XSS, ARCHITECTURE §14).

### 7.2 Panel (floating, collapsible, bottom-right, Shadow DOM)

- Controls: Start / Pause / Resume / Reset; max items; min-reviews filter; sort { reviews ↓, sales ↓, position ↑, reviews÷sales ↓ }.
- List: rank, title (truncated), price, sales label, reviews, status. Click row → scroll to card + highlight; PDD DOM never reordered.
- Footer: status counts, Export CSV, Export JSON.

`data-testid` contract (`{component}__{role}`): `review-panel__start-button`, `review-panel__pause-button`, `review-panel__resume-button`, `review-panel__reset-button`, `review-panel__max-items-input`, `review-panel__min-reviews-input`, `review-panel__sort-select`, `review-panel__row` (repeated), `review-panel__export-csv-button`, `review-panel__export-json-button`, `review-panel__status-summary`, `review-badge__count` (repeated).

All copy Chinese-first with English tooltip. No internal design notes in shipped copy.

### 7.3 Popup (settings)

Form for `maxItems`, `concurrency`, `delayMs`, `cacheTtlHours`, `autoStart`. Persists to `chrome.storage.sync`. Changes apply on next run (not mid-queue unless Reset).

## 8. Export

- **CSV:** UTF-8 with BOM, RFC 4180 quoting, CRLF. Columns: `position,goods_id,title,price,sales_label,sales_count,sales_is_lower_bound,review_count,status,fetched_at,url`. Filename `pdd-<search_key>-<YYMMDD-HHMMSS>.csv` in Asia/Singapore time. Via `Blob + <a download>` (only DOM side effect in export layer).
- **JSON:** same rows + `{ searchKey, exportedAt, settings }` metadata, pretty-printed. Filename `pdd-<search_key>-<YYMMDD-HHMMSS>.json`.
- Exports contain no session data.

## 9. Settings (typed defaults)

```ts
type Settings = {
  maxItems: number;        // 60, 1–300
  concurrency: 1 | 2;     // 1
  delayMs: { min: number; max: number }; // 800–1500
  cacheTtlHours: number;  // 24
  autoStart: boolean;     // false (user presses Start)
};
```

Stored in `chrome.storage.sync`; cache entries (`rc:${goodsId}` + `shopper:cacheVersion`) in `chrome.storage.local`.

## 10. Error handling

- Every record ends in exactly one terminal `FetchStatus`.
- Parsing failures keep `errorMessage`; logged via `console.warn('[shopper]', goodsId, reason)` and shown in badge tooltip.
- If selectors find no cards, panel shows layout-unrecognised message (never silent failure).

## 11. Security / privacy

- Permissions: `storage` + host `https://mobile.pinduoduo.com/*` only. No `cookies`, `tabs`, `webRequest`, `<all_urls>`.
- Extension never reads/copies/sends cookies; requests inherit tab session via `credentials: 'include'` (fetch) or same-origin iframe.
- No remote calls except `mobile.pinduoduo.com`. No analytics.
- `JSON.parse` only, never `eval`. Fetched HTML parsed as string/regex/DOMParser, never inserted into live DOM. UI uses `textContent`.
- `.auth/` (recon credentials) git-ignored, excluded from zips, absent from fixtures (sanitizer + fixture-leak test).

## 12. Testing

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | domain/*, throttle-queue (fake timers), review-cache (in-memory chrome.storage fake at storage boundary only), to-csv, sort-filter, use-review-panel state machine |
| E2E | Playwright (chromium + unpacked extension) | Full flow on recorded pages via `context.route('https://mobile.pinduoduo.com/**')` |
| Live smoke | Playwright, `LIVE=1` | 5 real items on 洗衣粉 search; asserts numeric counts, no blocks |

E2E specs (one per feature): `badges-appear`, `sort-by-reviews`, `min-reviews-filter`, `cap-respected`, `cache-hit-skips-network`, `blocked-pauses-queue`, `export-csv-content`, `infinite-scroll-picks-up-new-cards`, `layout-unrecognised-message`. Video on by default (`PW_VIDEO=off` to disable).

## 13. Out of scope (v1)

Desktop `yangkeduo.com`, app share links, price history, scheduled/bulk crawling, captcha solving.

## 14. Delivery milestones

M0 Recon → M1 Domain → M2 Fetch → M3 UI → M4 Export + polish (ARCHITECTURE §20).
