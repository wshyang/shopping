# shopper — living functional specification

Status: **v0.1, implementation baseline (2026-10-24)**

This is the product contract. Design rationale and implementation shape live in `ARCHITECTURE.md`; deviations and gap decisions live in `addenda.md`.

## Product promise

On `https://mobile.pinduoduo.com/search_result.html`, a logged-in user can ask the extension to collect product review counts for the currently discovered results. The extension shows those counts beside cards and in a floating list, supports filtering/sorting, and exports the current data. It uses only the user's browser session and PDD's origin.

## Required behavior

1. The extension discovers each unique `goods_id` represented by the current search-results DOM and continues watching infinite-scroll additions.
2. It never starts network collection until the user presses Start unless `autoStart` was explicitly enabled in settings.
3. It checks a time-limited local cache, then fetches same-origin product HTML with credentials included. Review-count parsing uses structured page data first and conservative visible-text fallbacks second. Unknown data is reported as unknown; it is never guessed.
4. Work is FIFO, deduplicated, limited to the configured cap, and paced with jitter. Default settings are 60 items, one concurrent request, 800–1500 ms delay, 24-hour cache, and autostart off.
5. A transient network/server failure receives at most one retry after five seconds. A login, verification, captcha, HTTP 403, or HTTP 429 signal pauses the whole run immediately and requires manual resume.
6. Every discovered record remains represented with one of: `pending`, `ok`, `not_found`, `blocked`, `error`, or `skipped_cap`.
7. Every card gets an isolated review badge. A fixed, collapsible panel provides Start, Pause, Resume, Reset, max-items, minimum-reviews, sorting, result navigation, status summary, and CSV/JSON export.
8. Clicking a panel row scrolls to and briefly highlights the original card. The extension never reorders PDD's DOM.
9. CSV is RFC 4180 with CRLF and a UTF-8 BOM. JSON includes the same rows and export metadata. Neither format contains session data.
10. Settings persist in `chrome.storage.sync`; cache entries persist in `chrome.storage.local`; per-tab goods records remain in memory.

## Privacy and safety constraints

- No server, analytics, remote code, database, scheduled runs, keyword crawling, captcha bypass, cookie permission, or cookie extraction.
- The only host permission is `https://mobile.pinduoduo.com/*`; the only extension permission is `storage`.
- Fetched HTML is never inserted into the page. User-visible content is assigned through `textContent`.
- Live credentials and raw captures stay in ignored `.auth/` or `tests/fixtures/pdd/raw/` locations.
- Personal use only. The UI warns that automated requests may trigger PDD controls and stops rather than evades them.

## Supported environment

Chromium-based browsers with Manifest V3 (Chrome, Edge, Arc, Brave), on PDD's mobile search-results URL. Desktop PDD and native-app pages are out of scope for v0.1.

## Acceptance evidence

- Unit coverage at least 80% for lines/functions/statements and 75% branches.
- Fixture-backed Playwright flows for badges, sorting, filtering, cap, cache, block pause, export, infinite scroll, and unrecognised layout.
- Opt-in live smoke of at most five products after recon.
- Full TypeScript strict check, ESLint, Prettier, WXT production build.

The fixture-backed and live criteria remain pending until authenticated recon supplies sanitized real responses. Their absence must be reported, never hidden with fabricated fixtures.
