# shopper — Architecture

Status: **Draft v0.1 (2026-10-24)**. This is the design before implementation. Everything marked
**[RECON]** is a hypothesis to confirm against a live, logged-in Pinduoduo (PDD) session before
code is written (§4).

## 1. Problem

On the PDD mobile web search results page

```
https://mobile.pinduoduo.com/search_result.html?search_key=<kw>&search_type=goods&...
```

each product card shows only a **sales label**:

- `热销3.5万+件`: rounded sales volume ("3.5万+" = 35,000 or more)
- `本店已拼8318`: a "group-bought" count. **[RECON]** It may count the *shop*, not the item (本店 = "this shop").

The **review count** (`商品评价(22,999)`) appears only on each product's detail page
(`goods.html?goods_id=…`). No search filter or sort uses it. Comparing 60 products by feedback
volume means 60 clicks.

## 2. Goals / non-goals

**Goals**

- G1. On a search results page, collect the review count of every visible result (up to a configurable
  cap) without the user opening each product.
- G2. Show the count inline on every card, and in a sortable, filterable side list.
- G3. Export the collected rows as CSV (Excel-safe Chinese) and JSON.
- G4. Use the user's own logged-in session; never store or send credentials anywhere.
- G5. Be polite to PDD: low concurrency, jitter, a hard cap, pause on any risk-control signal.

**Non-goals**

- No server, database, or account. Everything runs in the user's browser (decisions A-001, A-002).
- No bulk or unattended crawling, no scheduled jobs, no crawling across keywords.
- No getting past captchas or PDD's risk control. When challenged, the tool stops and asks the user.
- No price tracking or history (possible later; YAGNI).

## 3. Chosen shape

A **Manifest V3 browser extension** for Chromium-based browsers (Chrome, Edge, Arc, Brave), built with
**WXT + TypeScript**. A content script runs on the search results page, inside the user's real
session. That is the user's choice, and it carries the least anti-bot risk: requests come from the
same origin, with the same cookies, in the same browser fingerprint as normal browsing.

```
┌────────────────────────── User's Chromium (logged in to PDD) ──────────────────────────┐
│                                                                                         │
│  mobile.pinduoduo.com/search_result.html                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │ PDD page DOM (cards)                                                               │  │
│  │    ▲ badges injected               ▲ MutationObserver (infinite scroll)            │  │
│  │ ┌──┴────────────────────── content script (isolated world) ───────────────────────┐│  │
│  │ │ discovery ─► queue ─► fetcher ─► parser ─► store ─► UI (panel + badges)         ││  │
│  │ │                 ▲         │                   │                                 ││  │
│  │ │            risk-detect ◄──┘                   └─► export (CSV/JSON download)    ││  │
│  │ └─────────────────────────────────────┬───────────────────────────────────────────┘│  │
│  └───────────────────────────────────────┼────────────────────────────────────────────┘  │
│                                          │ chrome.storage.local (cache + settings)        │
│  popup (settings) ───────────────────────┘                                                │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                      │ same-origin requests, credentials: include
                      ▼
            mobile.pinduoduo.com  (goods.html / review API [RECON])
```

There is no background service worker beyond WXT's default: all work happens in the tab, so the
tab's cookies and origin apply naturally. A service worker would need host permissions and
cross-origin cookie handling, which buys nothing here.

## 4. Phase 0: live recon (needed before code)

The page structure and the review-count source are undocumented and change often. Recon turns every
**[RECON]** item into a fact, records it in `docs/01-pdd-recon.md`, and produces sanitized fixtures
for the tests.

### 4.1 Session bootstrap (headed Playwright)

1. `scripts/recon/browser.mjs`: `chromium.launchPersistentContext('.auth/pdd-profile', { headless: false, viewport: 390×844, isMobile: true, userAgent: <iOS Safari UA>, args: ['--remote-debugging-port=9222'] })`,
   then navigate to `https://mobile.pinduoduo.com/login.html`. The browser stays open.
2. The user logs in (phone + SMS) and confirms in chat.
3. `scripts/recon/harvest.mjs` connects with `chromium.connectOverCDP('http://localhost:9222')` and writes:
   - `.auth/storage-state.json`: `context.storageState()` (cookies + localStorage per origin)
   - `.auth/session-storage.json`: `sessionStorage` dumped per open PDD page via `page.evaluate`
4. `.auth/` is **git-ignored, excluded from every zip, never put in fixtures**. These are live
   credentials (decision A-005).

### 4.2 Questions recon must answer

| # | Question | How |
|---|---|---|
| R1 | Card DOM: container selector, where `goods_id` lives (href `goods.html?goods_id=`, `data-*`, React props) | DOM inspection on the sample `洗衣粉` URL |
| R2 | Is the list rendered server-side (`window.rawData`) or loaded by XHR on scroll? Which endpoint, and does it need `anti_content`? | HAR while scrolling 3 pages |
| R3 | Where `商品评价(N)` comes from on the goods page: SSR `window.rawData` JSON path, HTML text, or a separate reviews XHR | HAR + `page.evaluate(() => window.rawData)` on 3 goods pages |
| R4 | Does a same-origin `fetch('/goods.html?goods_id=X', {credentials:'include'})` return HTML that contains the count (strategy A)? | Run from DevTools in the logged-in tab |
| R5 | If not, does a hidden same-origin `<iframe>` render it (strategy B)? | Same |
| R6 | Meaning of `本店已拼` (shop-level or item-level) | Compare with the goods page's own sales figure |
| R7 | Risk-control signal: what a blocked or captcha response looks like (redirect URL, status, body marker) and roughly at what rate it starts | Gentle ramp, stop at first sign |
| R8 | Other label variants (`已拼10万+件`, `总售…`, none) | Sample 3 keywords |

### 4.3 Fixtures produced

`tests/fixtures/pdd/`: `search-xiyifen.html`, `search-list-page2.json` (if XHR), `goods-<n>.html` × 3
(high, low, and zero reviews), `blocked.html` (if seen). A `scripts/recon/sanitize.mjs` pass strips
cookies, tokens, user IDs, addresses, and phone numbers before anything lands in `tests/`. Fixtures are
real recorded responses, not hand-written ones (A-003).

## 5. Components

Modules are grouped by domain (GREENFIELD §7). Functions stay ≤ 50 lines, take ≤ 3 parameters, and
never mutate their inputs. Pure modules have no DOM or `chrome.*` imports, so they can be unit
tested directly.

```
src/
  domain/                      pure, no I/O
    goods-record.ts            types + constructors (§6)
    parse-sales-label.ts       label text → { kind, count, isLowerBound } | null
    parse-review-count.ts      goods HTML / rawData → number | null
    sort-filter.ts             records × view settings → ordered, filtered list
  discovery/
    find-cards.ts              Document → CardRef[]               [RECON R1]
    watch-cards.ts             MutationObserver → new CardRef events (infinite scroll)
  fetching/
    goods-fetcher.ts           goodsId → FetchOutcome; strategy A or B   [RECON R3–R5]
    throttle-queue.ts          concurrency, jitter, cap, pause/resume, dedupe
    risk-detect.ts             response → isBlocked                [RECON R7]
  cache/
    review-cache.ts            chrome.storage.local wrapper with TTL
  export/
    to-csv.ts                  records → UTF-8 BOM CSV string
    to-json.ts                 records → pretty JSON string
    download.ts                Blob + <a download> (the only DOM side effect here)
  ui/
    use-review-panel.ts        "hook": state machine + derived view model; no DOM
    review-panel.ts            renders panel in Shadow DOM; wiring only
    review-badge.ts            renders per-card badge in Shadow DOM
  settings/
    settings.ts                typed defaults + load/save (chrome.storage.sync)
entrypoints/
  content.ts                   matches mobile.pinduoduo.com/search_result.html*; composes the above
  popup/                       settings form (maxItems, concurrency, delay, TTL)
```

**Render vs decide (GREENFIELD §7).** `use-review-panel.ts` owns all state, derivations, sorting,
and filtering. `review-panel.ts` / `review-badge.ts` only render the view model they are given and wire
events back. UI files never import `fetching/` or `cache/`; a grep check enforces this.

**Shadow DOM.** All injected UI lives in Shadow roots, so PDD CSS can't break it and our CSS can't
break PDD.

## 6. Data model (typed wire contract)

```ts
type SalesLabel = {
  raw: string;                    // "热销3.5万+件"
  kind: 'hot_sales' | 'shop_group' | 'group' | 'unknown';
  count: number | null;           // 35000
  isLowerBound: boolean;          // true when "+" present
};

type FetchStatus = 'pending' | 'ok' | 'not_found' | 'blocked' | 'error' | 'skipped_cap';

type GoodsRecord = {
  goodsId: string;                // primary key
  title: string;
  priceText: string;              // as displayed, e.g. "¥19.9"
  salesLabel: SalesLabel | null;
  reviewCount: number | null;     // 22999
  url: string;                    // canonical goods.html?goods_id=...
  position: number;               // 1-based rank in the search results
  status: FetchStatus;
  errorMessage: string | null;
  fetchedAt: string | null;       // ISO 8601 UTC, e.g. "2026-10-24T03:15:00.000Z"
  source: 'cache' | 'network' | null;
};

type CacheEntry = { reviewCount: number; fetchedAt: string };     // key: `rc:${goodsId}`

type Settings = {
  maxItems: number;               // default 60, range 1–300
  concurrency: 1 | 2;             // default 1
  delayMs: { min: number; max: number };   // default 800–1500
  cacheTtlHours: number;          // default 24
  autoStart: boolean;             // default false: the user presses Start
};
```

`GoodsRecord` lives only in memory, per tab. Only `CacheEntry` and `Settings` are persisted.

## 7. Parsing rules

### 7.1 Sales label (`parse-sales-label.ts`)

Grammar (regex-based; **[RECON R8]** adds variants):

```
label   := prefix number unit? "+"? "件"?
prefix  := "热销" → hot_sales | "本店已拼" → shop_group | "已拼" → group
number  := \d+(\.\d+)?
unit    := "万" (×10^4) | "亿" (×10^8)
```

| Input | Output |
|---|---|
| `热销3.5万+件` | hot_sales, 35000, lower bound |
| `本店已拼8318` | shop_group, 8318, exact |
| `已拼10万+件` | group, 100000, lower bound |
| `热销1.2亿+件` | hot_sales, 120000000, lower bound |
| `新品` / empty | `null` |

Use integer arithmetic (`Math.round(n * unit)`) to avoid float artifacts.

### 7.2 Review count (`parse-review-count.ts`)

Tried in order, first match wins:

1. **Structured:** the `window.rawData` JSON embedded in the goods HTML (`<script>window.rawData=…</script>`), read at
   the path recon finds **[RECON R3]**. Parse with `JSON.parse` on the extracted literal; never `eval`.
2. **Text fallback:** `/商品评价\s*[（(]\s*([\d,，.]+\s*万?\+?)\s*[)）]/` on the HTML, normalised with
   the same 万 rule (e.g. `商品评价(1.2万+)` → 12000).
3. Neither matches → `not_found`. Never guess.

A goods page with `商品评价` and no number, or `暂无评价`, gives `0` (status `ok`).

## 8. Fetch strategy

| Strategy | Mechanism | Pros | Cons | Picked when |
|---|---|---|---|---|
| **A** | `fetch(goodsUrl, { credentials: 'include' })` from the content script, then parse the HTML string | Cheapest, no rendering, easy to throttle | Fails if the count is rendered client-side only, or the HTML needs `anti_content` | R4 = yes (**preferred**) |
| **B** | Hidden same-origin `<iframe src=goodsUrl>`, wait for the `商品评价` node, read it, remove the iframe | Works with client-rendered pages | Heavier (scripts, images); slower; more like real traffic | R4 = no, R5 = yes |
| C | A reviews API endpoint found in the HAR | Smallest payload | Likely signed (`anti_content`); brittle | Only if unsigned **[RECON]** |

`goods-fetcher.ts` exposes a single `fetchReviewCount(goodsId): Promise<FetchOutcome>` behind a
strategy interface, so changing strategy after recon touches one file. The decision is recorded in
**A-006**.

## 9. Throttling and risk control

- **Queue.** FIFO in search-result order (visible results first), deduplicated by `goodsId`, capped
  at `maxItems`. Items past the cap get `skipped_cap`, are shown greyed out, and can be raised later.
- **Pacing.** `concurrency` workers (default 1). Each waits a uniform random `delayMs.min…max` between
  requests. No retries for `blocked`. `error` (network or 5xx) gets **one** retry after 5 s.
- **Cache first.** A cache hit within TTL skips the network (`source: 'cache'`).
- **Risk detection** (`risk-detect.ts`): a response counts as blocked if it redirects to a
  login, verify, or captcha URL, returns HTTP 403/429, or contains a recon-identified marker **[RECON R7]**. On
  the first block, the queue **pauses globally**. The panel shows "PDD asked for verification. Complete it
  in a tab, then press Resume." No automatic resume.
- **Stopping.** The queue stops when the tab unloads. Nothing runs in the background.

## 10. State machine (panel)

```
 idle ──Start──► running ──(queue drained)──► done
   ▲               │  ▲                         │
   │            Pause  Resume                 Start (re-run uncached / raised cap)
   │               ▼  │                         │
   └──Reset──── paused ◄──(risk detected)───────┘
```

Derived view model (computed in `use-review-panel.ts`): progress `n/total`, counts per status, the
sorted and filtered rows, and whether export is allowed (at least one `ok` row).

## 11. UI

**Badge (per card).** Pill below the sales label: `评价 22,999` · `评价 …` (pending) · `评价 ?`
(not_found/error, tooltip has the reason) · `⛔` (blocked). Colour scale by review-count bucket
(<100, <1k, <10k, ≥10k) for quick scanning.

**Panel (floating, collapsible, bottom-right).**

- Controls: Start / Pause / Resume / Reset; max items; min-reviews filter; sort by
  {reviews ↓, sales ↓, position ↑, reviews ÷ sales ↓ (feedback ratio)}.
- List: rank, title (truncated), price, sales label, reviews, status. Clicking a row scrolls to the card
  and highlights it. PDD's own DOM is **never reordered**.
- Footer: status counts, `Export CSV`, `Export JSON`.

**`data-testid` contract** (`{component}__{role}`):
`review-panel__start-button`, `review-panel__pause-button`, `review-panel__resume-button`,
`review-panel__reset-button`, `review-panel__max-items-input`, `review-panel__min-reviews-input`,
`review-panel__sort-select`, `review-panel__row` (repeated), `review-panel__export-csv-button`,
`review-panel__export-json-button`, `review-panel__status-summary`, `review-badge__count` (repeated).

All copy is Chinese-first with English in a tooltip. No internal design notes in user copy (GREENFIELD §6).

## 12. Export format

CSV: UTF-8 **with BOM** (so Excel shows Chinese correctly), RFC 4180 quoting, CRLF line endings. Columns:

```
position,goods_id,title,price,sales_label,sales_count,sales_is_lower_bound,review_count,status,fetched_at,url
```

The filename is `pdd-<search_key>-<YYMMDD-HHMMSS>.csv`, in Asia/Singapore local time. JSON has the same rows
plus `{ searchKey, exportedAt, settings }` metadata. Exports contain no session data.

## 13. Error handling

- Every record ends in exactly one terminal `FetchStatus`. Nothing is dropped silently.
- Parsing failures keep a short `errorMessage` (e.g. `"rawData path missing"`). They are logged with
  `console.warn('[shopper]', goodsId, reason)` and shown in the badge tooltip.
- If the selectors find no cards on a search page, the panel shows "Couldn't read this page's layout.
  PDD may have changed it." It never fails silently, and the user knows to re-run recon.

## 14. Security and privacy

- Permissions: only `storage`, and host permission for `https://mobile.pinduoduo.com/*`. No
  `cookies`, `tabs`, `webRequest`, or `<all_urls>`.
- The extension never reads, copies, or sends cookies; requests just inherit the tab's session.
- No remote calls except to `mobile.pinduoduo.com`. No analytics.
- `JSON.parse` only, never `eval`. Fetched HTML is parsed as a string with regex/`DOMParser` and never
  inserted into the live DOM. The UI uses `textContent`, never `innerHTML` with fetched data (XSS).
- Recon credentials (`.auth/`) stay local: git-ignored, excluded from zips, and absent from fixtures (sanitizer + a
  test asserting fixtures have no `PDDAccessToken`, `pdd_user_id`, or phone-like strings).
- **Platform terms.** Automated fetching may break PDD's terms of service, and heavy use can get the
  account flagged. The design limits this with user-initiated runs only, a low default rate, a hard cap, and stopping
  at the first challenge. Personal use only.

## 15. Testing (GREENFIELD §2–3)

| Layer | Tool | Scope | Data |
|---|---|---|---|
| Unit | Vitest | `domain/*`, `throttle-queue` (fake timers), `review-cache` (in-memory `chrome.storage` fake at the storage boundary only), `to-csv`, `sort-filter`, `use-review-panel` state machine | Real recorded fixtures + table cases |
| E2E | Playwright, Chromium with the unpacked built extension (`launchPersistentContext` + `--load-extension`) | Full flow on recorded pages served via `context.route('https://mobile.pinduoduo.com/**')` | Sanitized fixtures (A-003) |
| Live smoke | Playwright, opt-in `LIVE=1` | 5 real items on the `洗衣粉` search; asserts numeric counts and no blocks | `.auth/storage-state.json` |

E2E cases (one spec per feature):
`badges-appear`, `sort-by-reviews`, `min-reviews-filter`, `cap-respected`, `cache-hit-skips-network`,
`blocked-pauses-queue`, `export-csv-content`, `infinite-scroll-picks-up-new-cards`, `layout-unrecognised-message`.

- Tests come first, red then green, per module. Coverage ≥ 80 %.
- Playwright **video on by default**, turned off with `PW_VIDEO=off`.
- `route` serves recorded responses: they are captured data, not invented mocks. The only real
  external dependency is PDD itself, which the live smoke test covers.

## 16. Repository layout and tooling

```
shopper/
  CLAUDE.md                  GREENFIELD adopted, placeholders filled (§17)
  GREENFIELD.md              upstream template (unchanged reference)
  docs/
    ARCHITECTURE.md          this file
    00-spec.md               living functional spec
    01-pdd-recon.md          recon findings (selectors, JSON paths, block markers)
    addenda.md               A-001…
  scripts/recon/             browser.mjs, harvest.mjs, capture.mjs, sanitize.mjs
  src/ …                     §5
  entrypoints/ …
  tests/{unit,e2e,live,fixtures/pdd}/
  wxt.config.ts  vitest.config.ts  playwright.config.ts  tsconfig.json
  .gitignore                 .auth/ node_modules/ .output/ test-results/ playwright-report/
  .gitlab-ci.yml.shiphats … + activate-shiphats.sh   (inert, A-004)
```

Toolchain: Node 24, npm, TypeScript strict, WXT, Vitest, Playwright, ESLint + Prettier.
Scripts: `dev`, `build`, `zip`, `typecheck`, `lint`, `test`, `test:e2e`, `test:live`, `recon:browser`, `recon:harvest`.

## 17. GREENFIELD conformance

| § | Rule | Applies? | How |
|---|---|---|---|
| 1 | Living spec + addenda | Yes | `docs/00-spec.md`, `docs/addenda.md` |
| 2 | Tests first, no mocks where it counts | Yes, adapted | No backend or DB. Real recorded fixtures; live smoke test. Session-scoping negative tests don't apply (no auth surface of our own) |
| 3 | Video on, isolation, realistic fixtures | Yes | `PW_VIDEO=off` switch; fresh profile per e2e run; real product data |
| 4–5 | ORM, soft delete, migrations | **No** (A-002) | No DB |
| 6 | `data-testid`, typed contracts, user-facing copy | Yes | §11, §6 |
| 7 | Function/module design, render vs decide | Yes | §5 |
| 8 | Honest validation | Yes | Commits state which layers ran |
| 9 | One-command dev env | Yes | `npm i && npm run dev` |
| 10.1 | Container contract | **No** (A-001) | Extension: nothing to serve |
| 10.3–10.4 | SHIP-HATS inert, Bash 3.2 scripts | Yes, reduced (A-004) | Lint, typecheck, test, e2e, build-zip jobs; no Kaniko |

## 18. Addenda (initial)

- **A-001 Extension instead of server.** User choice. Runs in the user's session; no container or port contract. GREENFIELD §10.1–10.2 don't apply.
- **A-002 No database.** User choice. A cache in `chrome.storage.local` (TTL 24 h) and CSV/JSON export replace persistence. §4–5 don't apply.
- **A-003 Fixture-backed e2e.** PDD can't be a test dependency (rate limits, auth, churn). Sanitized recorded responses are served via `route`, plus an opt-in live smoke test.
- **A-004 Reduced SHIP-HATS.** Inert pipeline without image build or signing; there is no image to ship.
- **A-005 Recon credential handling.** `.auth/` stays local, fixtures are sanitized, and a test enforces it.
- **A-006 Fetch strategy and throttle defaults.** *Pending recon* (§4.2 R3–R5, R7).

## 19. Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| PDD changes DOM, JSON paths, or labels | Badges stop | Selectors and paths in one module each; "layout unrecognised" message; re-run recon scripts |
| Goods HTML needs `anti_content` (strategy A fails) | Slower strategy B | Strategy interface (§8) |
| Risk control at low rates | Few items per run | Cache + cap + pause/resume; the user picks small caps |
| `本店已拼` is shop-level (R6) | Misleading "sales" sort | Label `kind` kept, and shown as "shop-level" in the UI and export |
| Mobile-site-only selectors | Desktop `yangkeduo.com` not covered | Out of scope v1; content script match limited to mobile host |

Open questions for the user (after recon):

1. Also support the PDD desktop site / app share links?
2. Is a "reviews ÷ sales" ratio sort useful, or just noise?
3. Should the cache TTL be longer (review counts change slowly)?

## 20. Delivery milestones

1. **M0 Recon:** session bootstrap, R1–R8 answered, fixtures + `01-pdd-recon.md`, A-006 decided.
2. **M1 Domain:** parsers + sort/filter with unit tests (fixture-driven).
3. **M2 Fetch:** fetcher, queue, cache, and risk detection, unit-tested.
4. **M3 UI:** panel and badges, plus e2e on fixtures.
5. **M4 Export + polish:** CSV/JSON, settings popup, live smoke test, packaged extension zip.
