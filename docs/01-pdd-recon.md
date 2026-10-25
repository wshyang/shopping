# PDD recon status — 2026-10-24

**Not performed.** The sandbox cannot reach a live authenticated PDD site.
No selectors, response samples, JSON paths or risk markers are presented as facts.
R1–R8 from architecture §4.2 are all **OPEN**.

## Isolated provisional adapters

- `src/discovery/find-cards.ts`: explicit same-origin goods anchors only. Sites
  using click handlers/private React props show layout-unrecognised instead.
- `src/domain/parse-review-count.ts`: text grammar only. Script/style/comment
  contents ignored; no rawData path guessed. Bare label is unknown (A-007).
- `src/fetching/risk-detect.ts`: conservative status/URL/text heuristics, not
  confirmed PDD challenge signatures. No active probing/rate ramp performed.
- `src/fetching/goods-fetcher.ts`: fetch-only; no hidden rendering or signed API.

## Local recon handoff

1. Install Node 24, `npm ci`, `npx playwright install chromium` on a local machine
   with a display. Run `npm run recon:browser`. Login only in that local browser.
   Do not expose debugger port 9222; it permits session access.
2. Optional `npm run recon:harvest` saves private state under `.auth/` (mode 0600).
   Never send credentials, profiles, HARs or raw HTML in chat/PRs.
3. Browse the search page and three goods pages manually; inspect R1–R8 locally.
   `npm run recon:capture` saves DOM snapshots under `.auth/captures/`. It does not
   capture network responses/HAR automatically; use local DevTools for R2/R3.
4. `npm run recon:sanitize -- .auth/captures/page-0.html .auth/candidate.html`
   removes scripts, attributes/URLs and common sensitive markers. It is only an
   initial pass, not a privacy guarantee. Review all text for identities/addresses.
   Capture/review rawData separately only if a justified allowlist can be defined.
5. Copy manually reviewed fixtures to `tests/fixtures/pdd`; document provenance,
   selectors, confirmed paths, marker meaning and transformations here. Adapt
   isolated modules and add replay specs for all nine architecture §15 cases.
6. Load `.output/chrome-mv3` unpacked in local Chromium. With a fresh 5-item cap,
   compare counts to manually opened goods pages. Confirm no automatic requests
   before Start; test Pause/Reset/cache/export. Stop immediately if challenged.
   Record browser version, date, number checked, blocks and unresolved questions.

No automated live-smoke command is supplied yet: selectors/count expectations
cannot honestly be asserted before recon. The manual five-item smoke above is
required before release; add a guarded LIVE=1 script after facts are established.
