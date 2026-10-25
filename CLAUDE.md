# CLAUDE.md — shopper

> Living index for AI agents. Each `##` maps to a focused section file when the project grows past ~400 LOC per domain.
> Stack: **WXT + TypeScript (strict) + Vitest + Playwright + pnpm/npm**. No backend, no database — browser extension only (A-001, A-002).

## 1. Source of truth + addenda discipline

- **Living functional spec:** `docs/00-spec.md` (product contract).
- **Recon findings:** `docs/01-pdd-recon.md` (selectors, `window.rawData` JSON path, block markers, fixtures manifest) — produced in Phase 0 (ARCHITECTURE §4).
- **Addenda register:** `docs/addenda.md` — sequentially numbered `A-001`… Each entry records: what was decided, why, which spec section it relates to, practical impact.
- Rule: every decision that fills a gap, adds an object/field/tool, or deviates from the base spec gets an addendum **in the same change that makes the decision** — never as follow-up. Base spec section numbers stay stable; addenda append forever.

## 2. Tests first, real data, no repo mocks

- **No backend / no DB.** Tests run against **real recorded fixtures** (sanitized PDD HTML/JSON) served via `context.route` — not hand-written mocks (A-003). Live smoke test (`LIVE=1`) hits real PDD with `.auth/storage-state.json`.
- Every feature needs **positive + negative/edge tests** in the same change: happy path plus “not_found”, “blocked”, empty, zero-review, malformed cases.
- Layout: `tests/unit/` (domain, queue, cache, export, hooks), `tests/e2e/` (Playwright on fixtures), `tests/live/` (opt-in), `tests/fixtures/pdd/` (sanitized).
- Coverage ≥ 80% lines/functions/branches/statements.

## 3. Test infrastructure

- **Playwright video on by default**; off with `PW_VIDEO=off` (see `playwright.config.ts`).
- **Isolation:** fresh browser profile per e2e run; unique per-run fixture data is not needed (extension is stateless per tab) but fixtures use realistic product titles/prices.
- **Deterministic fixtures:** real recorded responses sanitized via `scripts/recon/sanitize.mjs` (strips cookies, tokens, user IDs, phone numbers). A unit test asserts fixtures contain no `PDDAccessToken`, `pdd_user_id`, or phone-like strings.

## 4. Database / ORM — not applicable

No database (A-002). Persistent state is `chrome.storage.local` (review cache, TTL) and `chrome.storage.sync` (settings). Cache validity is TTL-checked on read; see `src/cache/review-cache.ts`.

## 5. Schema evolution — not applicable

No DB migrations. Cache schema version is a single key `shopper:cacheVersion` in `chrome.storage.local`; bump + migrate-on-read if shape changes. Export CSV/JSON columns are versioned in `docs/00-spec.md`.

## 6. Code conventions

- **`data-testid` on every interactive element:** `{component-kebab}__{element-role}` (see ARCHITECTURE §11 for the full contract). Repeated rows share one testid; scope by anchor text.
- **Typed wire contract:** `GoodsRecord`, `SalesLabel`, `FetchStatus`, `Settings`, `CacheEntry` are defined once in `src/domain/goods-record.ts` and imported on both sides — a field rename is a compile error.
- **User-facing copy is Chinese-first** with English tooltip; no internal slugs/design notes in shipped copy. External contract keys (PDD's `goods_id`, `anti_content`) keep PDD's exact spelling.
- **Shadow DOM** for all injected UI so PDD CSS can't break us and we can't break PDD.

## 7. Function design + module structure

Adopted from GREENFIELD §7 — enforced in review, not by linter alone:

- **≤ 20 lines target, 50 lines hard limit** per function body. If you need a comment to explain a block, extract it.
- **Guard clauses over nesting**, max 3 levels. Early return at top.
- **≤ 3 parameters**; beyond 3 use a Parameter Object (typed interface). No boolean flags — split into two named functions.
- **Never mutate in place** — return new objects (`{ ...old, field: value }`). Separate Query from Modifier.
- **Naming:** booleans `is/has/should/can`, functions `verb+noun`, no abbreviations in domain code.
- **Render vs decide:** component renders, hook decides (GREENFIELD §7 Frontend). `use-review-panel.ts` owns state/derivations/fetch; `review-panel.ts` / `review-badge.ts` only render the view model and wire events. Hook returns plain object; component destructures. Check: `grep -c "lib/api\|fetching\|cache" src/ui/*.ts` must be `0`. Hooks live in `src/ui/` beside tests; they never import from `components/`.
- **JSX/presentation interior:** between `return (` and `)` only markup + precomputed bindings + wiring. No `.filter/.reduce/.sort/.find` in JSX — compute above. No inline `new Date()/.toFixed()/JSON.parse` — use formatter helpers. No `.filter().length` + `.filter().map()` double derivation — compute once.
- **Grouped by domain feature:** `domain/`, `discovery/`, `fetching/`, `cache/`, `export/`, `ui/`, `settings/` — not `controllers/`, `models/`, `services/`.
- **Files ≤ 400 LOC typical, 800 LOC hard limit.** God module → per-domain split + barrel (`export * from './sub/index.ts'`), zero call-site churn.
- No circular deps between peer-domain files; one concern per file.

## 8. Validate honestly

- **Static-check fallback when toolchain is unavailable in sandbox:** run per-file `tsc --noEmit` syntax checks, execute pure modules via `npx tsx`/`vitest`, `grep` structural invariants (data-testid, no forbidden imports). State exactly which layers ran; never claim “tests pass” unless `typecheck`, `lint`, `test`, `test:e2e` all ran against real fixtures/browsers.
- Real gate before merge: `npm run typecheck && npm run lint && npm run test && npm run test:e2e` (and `wxt build` smoke). Append validation caveat to commits made under constrained tooling.

## 9. Local dev + env

- One command: `npm i && npm run dev` (WXT dev server, HMR). No separate DB or backend.
- No `.env` secrets for v1. If added later: committed `.env.example` template, uncommitted `.env`, distinct `.env.test` — never shared DB between dev/test.
- Toolchain pinned in `package.json` `engines` (Node 24) and lockfile (`package-lock.json`).

## 10. Deployment + CI/CD

- **No container** (A-001) — extension ships as a zip (`npm run zip` → `.output/*.zip`). No `Dockerfile` port contract.
- **SHIP-HATS kept inert** (A-004): `.gitlab-ci.yml.shiphats`, `.gitlab/ci/*.gitlab-ci.yml.shiphats`, `sonar-project.properties.shiphats`, `.gitlab/CODEOWNERS.shiphats`, `.gitlab/merge_request_templates/Default.md.shiphats`. Placeholders are `@@SHIPHATS_<NAME>@@`, never secrets. Activation via `activate-shiphats.sh` (Bash 3.2, no associative arrays, empty-array-safe `${a[@]+…}` expansion). Pipeline covers typecheck, lint, format, unit + e2e (with video), build-zip; scans/signing/provenance left to compliance framework or GitLab native scanners.

## 11. Checklist (decided day one)

1. Spec + addenda — `docs/00-spec.md`, `docs/addenda.md` ✅
2. Tests first, real fixtures, no repo mocks ✅
3. ORM / casing — N/A (A-002)
4. Soft-delete / UUIDv7 / real actor rows — N/A (A-001/A-002)
5. Migrations — N/A (A-002)
6. `data-testid` + typed wire contracts ✅
7. Test layout + video on ✅
8. Realistic fixtures ✅
9. Honest validation ✅
10. One-command dev env ✅
11. Function design rules ✅
12. Container contract — N/A (A-001)
13. SHIP-HATS inert + Bash 3.2 scripts ✅

## 12. Where to look

| Concern | File(s) |
|---|---|
| Product decisions | `docs/00-spec.md`, `docs/addenda.md` |
| PDD selectors / rawData path / block markers | `docs/01-pdd-recon.md` |
| Wire types | `src/domain/goods-record.ts` |
| Parsers | `src/domain/parse-*.ts` |
| Queue + risk | `src/fetching/*` |
| Panel state | `src/ui/use-review-panel.ts` |
| Content composition | `entrypoints/content.ts` |
| SHIP-HATS activation | `activate-shiphats.sh` |
