# shopper — decision addenda

Addenda are append-only and independent of specification section numbers.

## A-001 — Browser extension, not a server

**Decision.** Build a Manifest V3 Chromium extension. **Why.** It works in the user's existing PDD session with the smallest operational and anti-bot surface. **Related.** Product scope; GREENFIELD §10. **Impact.** There is no server, listening port, container image, or deployment database.

## A-002 — No database

**Decision.** Keep per-tab records in memory and persist only settings/cache through extension storage. **Why.** History and server persistence are non-goals. **Related.** Spec storage behavior; GREENFIELD §§4–5. **Impact.** ORM, migrations, soft deletion, and system actors do not apply.

## A-003 — Recorded fixture boundary

**Decision.** Deterministic end-to-end tests route sanitized, actually recorded PDD responses; a separately opted-in smoke test covers the real site. **Why.** PDD authentication, churn, and rate controls make it unsuitable as a default test dependency. **Related.** Spec acceptance. **Impact.** Hand-authored pages must not be presented as captured fixtures.

## A-004 — Reduced inert SHIP-HATS pipeline

**Decision.** Carry inert lint, typecheck, unit, e2e, build, and zip jobs, but no Kaniko/signing jobs. **Why.** The deliverable is an extension archive, not a container. **Related.** GREENFIELD §10. **Impact.** Files use `.shiphats` suffixes until explicitly activated.

## A-005 — Recon credential handling

**Decision.** Persistent profiles and storage-state files stay under ignored `.auth/`; raw captures stay in an ignored fixture subdirectory. **Why.** They contain live credentials and personal data. **Related.** Spec privacy constraints. **Impact.** Sanitization and a credential scan are mandatory before a captured response is committed.

## A-006 — Fetch strategy pending authenticated recon

**Decision.** Implement conservative same-origin HTML fetch behind a strategy interface, but mark its selectors, structured keys, and risk markers as unconfirmed. Do not silently switch to hidden iframes or signed APIs. **Why.** This environment has no authenticated PDD session, and invented facts would be less safe than an explicit seam. **Related.** Architecture R3–R7. **Impact.** `docs/01-pdd-recon.md` must be completed before calling live behavior validated. If HTML lacks review data, recon chooses and records another strategy here.

## A-007 — Node compatibility window

**Decision.** Target Node 24 while allowing maintained Node 22.22 through `<25` for local checks. **Why.** The implementation sandbox provides Node 22, while architecture selected Node 24. **Related.** Architecture §16; GREENFIELD §9. **Impact.** CI should use Node 24; contributors on the final Node 22 release can still run the toolchain until the next reviewed toolchain update.

## A-008 — Defensive blind parsing

**Decision.** Before recon, structured parsing recognizes only an explicit allowlist of review-related keys and text parsing requires the `商品评价` label. Discovery relies on `goods.html?goods_id=` links rather than unstable CSS class names. **Why.** False counts are worse than visible `not_found` results. **Related.** Architecture R1, R3, and §13. **Impact.** Recon narrows and fixture-locks these fallbacks; it does not replace them with unverified broad matching.

## A-009 — Spreadsheet-safe CSV text

**Decision.** Prefix text cells beginning with a spreadsheet formula sigil with an apostrophe before RFC 4180 escaping. **Why.** Product titles are external data; opening an export must not execute a formula. **Related.** Spec export/privacy constraints. **Impact.** A title that literally starts with `=`, `+`, `-`, `@`, tab, or carriage return displays with spreadsheet text semantics.

## A-010 — Offline implementation before authenticated recon

**Decision.** Implement deterministic domain, queue, cache, UI, export, recon tooling, and the provisional HTML-fetch seam before authenticated M0 recon; keep recorded-fixture E2E and live smoke explicitly gated. **Why.** The implementation environment cannot open a logged-in PDD session, and the user requested defensive blind implementation rather than blocking delivery. **Related.** Architecture §4 and milestones. **Impact.** No selector, raw-data key, or risk marker is described as confirmed. E2E cases skip while the sanitized fixture manifest is absent and intentionally fail as a guard if fixtures are added without replacing the pending-recon spec.

## A-011 — Bare review labels are unknown, not zero

**Decision.** Before recon, only an explicit numeric zero or `暂无评价` parses as zero; a bare `商品评价` label returns `not_found`. **Why.** The label may be a client-rendered section heading whose positive count is loaded separately, so zero would be an unsafe guess. **Related.** Architecture §7.2 and R3. **Impact.** Recon fixtures may establish a narrower zero marker, but must not turn every missing number into a silently false zero.
