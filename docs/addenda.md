# Decisions register

A-001 through A-005 adopt architecture §18 unchanged: extension/no server;
no database; recorded-response acceptance plus opt-in live smoke; reduced inert
SHIP-HATS; private local recon credentials.

## A-006 — Provisional fetch strategy (2026-10-24)

Use fetch strategy A with 800–1500ms jitter, concurrency 1, cap 60. R3–R5/R7
remain unverified, so this is provisional, not a recon finding. No iframe or
undocumented API fallback. Missing markup returns not_found. Redirects to login,
verify/captcha/challenge, unexpected origins, HTTP 401/403/429 and conservative
visible Chinese challenge markers pause the queue. Confirm signatures locally.

## A-007 — Blind implementation and honest test scope

User explicitly authorized implementation without live site access, overriding
the architecture §4 prerequisite. R1–R8 are open and no fixtures are fabricated.
Use clearly labeled synthetic grammar/DOM boundary tests now; recorded-response
acceptance and live smoke remain release gates. Bare `商品评价` is unknown rather
than zero: client-rendered HTML may omit its count. Explicit `暂无评价` remains zero.
This intentionally tightens architecture §7.2 to avoid false zero counts.

## A-008 — Safety and export details

Manual-start enforced even for corrupted/legacy autoStart settings. Delays clamp
to ≥800ms; TTL 1–168 hours. CSV neutralizes spreadsheet formulas. Shop-level
sales excluded from ratio/sales sorts until R6 is known. Cap counts search-result
positions including cached/completed rows, preventing reruns from silently
expanding beyond the configured result window. Raising cap requires Start;
settings changes in popup require reload. Exports use the current visible view.

## A-009 — Reduced delivery infrastructure

Adopt concise project-specific CLAUDE.md rather than duplicating irrelevant
backend template sections. No DB, migrations or container deliverable applies.
Carry inactive GitLab test/build-zip pipeline and CODEOWNERS plus Bash 3.2-style
activation; GitHub checks mirror local gates. No signing/deployment image exists.
Activation supports scratch output, validates owners/placeholders and renders all
files before writing. Real Bash 3.2 and GitLab schema validation are not available
in the sandbox and remain infrastructure follow-up checks.

## A-010 — Fail closed on HTTP redirects

Goods fetch uses `redirect: manual`: opaque or explicit redirects pause as
blocked rather than following an unknown origin. This intentionally treats even
benign product redirects conservatively. Users open the product page normally
and Resume after checking. Malformed card URLs are ignored without aborting
collection. Neither behavior requires guessing live PDD internals.
