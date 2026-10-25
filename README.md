# 拼多多评价助手 (shopper)

A privacy-first Chromium extension that adds product review counts to Pinduoduo mobile search results, with a sortable/filterable side list and CSV/JSON export.

> **Current validation boundary:** implementation and offline unit coverage are complete, but PDD's live DOM, structured-data path, and challenge markers are undocumented. This sandbox had no authenticated PDD access. See [`docs/01-pdd-recon.md`](docs/01-pdd-recon.md); do not treat the provisional fetch strategy as live-validated until M0 recon is recorded.

## Safety model

- Runs only on `https://mobile.pinduoduo.com/search_result.html*`.
- Uses the user's own browser session; never reads or exports cookies.
- No server, analytics, account, database, scheduled crawling, or captcha bypass.
- Defaults to one request at a time, 800–1500 ms jitter, a 60-item cap, and manual start.
- Pauses on the first login, captcha, verification, HTTP 403, or HTTP 429 signal.
- Stores only settings (`storage.sync`) and review-count cache entries (`storage.local`).

Automated requests may violate PDD's terms or trigger account controls. Use personally and conservatively.

## Develop

Requirements: Node 24 recommended (Node 22.22 is supported), npm 10+, and a Chromium browser for Playwright/recon.

```sh
npm ci
npm run dev
```

WXT prints the development-extension path. Load that unpacked directory from `chrome://extensions` with Developer mode enabled, then open a mobile PDD search page.

Production build and archive:

```sh
npm run build
npm run zip
```

Outputs are under ignored `.output/`.

## Validate

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright video is on by default; use `PW_VIDEO=off` only when explicitly needed. Until authenticated recon captures are available, the nine fixture-backed E2E acceptance cases report explicit skips rather than running against fabricated pages. The live smoke remains opt-in and capped:

```sh
npm run recon:browser   # log in manually; keep this terminal open
npm run recon:harvest   # another terminal
# Follow docs/01-pdd-recon.md for capture and sanitization.
npm run test:live
```

Never commit `.auth/` or `tests/fixtures/pdd/raw/`.

## Settings

The popup configures:

- maximum items: 1–300 (default 60)
- concurrency: 1 or 2 (default 1)
- delay range: 100–60,000 ms (default 800–1500)
- cache TTL: 1–720 hours (default 24)
- autostart (default off)

On the search page, the floating panel also controls the current cap, review filter, and sort. A cap change takes effect on the next Start; it is disabled while a run is active.

## Design and decisions

- Product contract: [`docs/00-spec.md`](docs/00-spec.md)
- Architecture and plan: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Sequential decisions: [`docs/addenda.md`](docs/addenda.md)
- Project engineering rules: [`CLAUDE.md`](CLAUDE.md)
- Upstream discipline template: [`GREENFIELD.md`](GREENFIELD.md)

## SHIP-HATS handoff

The reduced extension pipeline is inert (`*.shiphats`). Render it only when moving the repository to the target GitLab environment:

```sh
./activate-shiphats.sh
```

Use `--non-interactive` with documented `SHIPHATS_*` environment values for automation. The script never asks for credentials; configure masked scanner tokens and the WOG Pipeline Execution Policy in GitLab after activation.
