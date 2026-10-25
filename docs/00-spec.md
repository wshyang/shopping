# Current functional specification

Architecture §§1–3 and §§5–14 define the product and wire contract. This file
records the delivered scope; `addenda.md` records intentional deviations.

## Implemented

WXT/strict TypeScript Manifest V3 extension, restricted to PDD mobile search.
Explicit same-origin `goods.html?goods_id=<digits>` anchors are discovered,
deduplicated and watched as the DOM grows. Every card gets an isolated badge;
a floating collapsible panel displays records without reordering the site.
No detected cards produces a visible layout error. Title/price extraction is
best-effort and unconfirmed, not a claim about today's PDD layout.

Users explicitly Start, Pause, Resume or Reset. Requests inherit the session,
are paced with jitter, capped by search position (default 60, maximum 300),
and limited to one or two in flight. New cards join a user-started run.
Network/5xx failures retry once after 5 seconds; blocks never retry automatically.
Pause stops launches, not requests already in flight. Reset cancels requests and
ignores stale results. Verification blocks pause globally and require Resume.
Raising the cap applies on the next Start (or Resume after a block).

Only exact review-label text or explicit `暂无评价` is parsed; absent/ambiguous
counts are unknown, never inferred from sales. Structured JSON paths remain
disabled until recon. Successful counts (including zero) cache for 24h. Only
counts/timestamps and validated settings persist. Storage failures do not abort
a run. No data leaves the browser except same-origin product requests.

Sort by reviews, non-shop sales, rank or reviews/sales; filter minimum reviews.
Shop-group labels retain their identity and are excluded from sales and ratio
scores. Ratio uses displayed rounded sales and is indicative, not statistical.
Rows scroll/highlight their card. CSV/JSON export the current filtered/sorted
view, including statuses; enabled once any success exists. CSV has UTF-8 BOM,
CRLF, quoting and formula neutralization. Filenames use Singapore time. JSON
adds settings, keyword and UTC timestamp. Popup settings apply on page reload.

## Release gate still open

No authenticated live recon was possible. R1–R8 remain unresolved. No recorded
fixtures exist. Browser tests currently use a clearly labeled synthetic contract,
not A-003 acceptance evidence. Do not call this live-ready until recorded replay
and a five-item live smoke pass on the user's local logged-in Chromium.
