# shopper · 商品评价助手

A local Chromium MV3 extension for comparing Pinduoduo mobile-search review
counts. No server, analytics, database or credential storage.

**Experimental, awaiting live recon.** Implemented defensively without access
to PDD. Its current markup may not match the provisional adapters. Unknown
counts display `?`; they are not sales counts or guessed zeros. See
[recon handoff](docs/01-pdd-recon.md) before relying on results.

## Build and use

Use Node 24 (Node 22 supported), npm:

```sh
npm ci
npm run build
```

In `chrome://extensions`, enable Developer mode → Load unpacked → select
`.output/chrome-mv3`. Open a logged-in mobile PDD search page, choose a small
cap, and press **开始**. The popup configures limits for the next page load.
**暂停** stops new launches; already-running requests may finish. On verification,
complete it normally in a product tab, then explicitly **继续**. Never bypass
platform controls. Automated access may violate platform terms or flag accounts;
use personally, sparingly, and at your own discretion.

Panel supports sorting/filtering, click-to-card, reset and exports of the current
view. Shop-group counts are not treated as product sales. `?` means unsupported
markup, missing count or request failure; hover for a short reason. PDD cards
are never reordered. Cache is local count/timestamp only; settings sync through
the browser. Remove the extension to remove its stored data.

`npm run dev` starts WXT's extension development workflow (not a web server).
`npm run zip` creates an install package under `.output/`; WXT packages only its
built extension, not repository files or `.auth/`.

## Validation

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:e2e
npm run zip
```

Playwright video defaults on; `PW_VIDEO=off` disables it. Tests use isolated
profiles. Unit/DOM tests and the browser harness explicitly use synthetic cases,
not fake "recorded" PDD responses. Recorded replay and live smoke are still open.

## Development discipline

Read [CLAUDE.md](CLAUDE.md), [living spec](docs/00-spec.md),
[decisions](docs/addenda.md), and [architecture](docs/ARCHITECTURE.md).
GREENFIELD.md is the unchanged upstream reference. `*.shiphats` are inert; activate
with `./activate-shiphats.sh` or set `SHIPHATS_CODE_OWNER=@your-group` and use
`--non-interactive`. `--output-dir`, `--keep-inert` and `--force` support dry-run
scratch activation and explicit overwrites. Agency compliance/Nexus settings
require local review; the extension has no container/signing/deployment contract.
