# shopper coding discipline

`GREENFIELD.md` is the unchanged reference; `docs/ARCHITECTURE.md` is the design.
The current implementation contract is `docs/00-spec.md`. Record every new
choice/deviation in sequential `docs/addenda.md` entries in the same change.
Never claim recon evidence or live validation that was not actually obtained.

## Design and boundaries

- Strict TypeScript, WXT MV3, Chromium; no backend/database/container (A-001/002).
- Group by domain; pure domain modules have no DOM/storage imports.
- ≤50 lines per function (target 20), ≤3 arguments, guard clauses, ≤3 nesting
  levels, ≤800 lines per file. No boolean flag arguments or input mutation.
- UI renders model and wires events only; no fetching/cache imports. Put
  decisions in `use-review-panel.ts` or composition, not presentation.
- Shadow DOM for all injected UI; no fetched HTML inserted in the live page.
- Keep `GoodsRecord` as the shared wire contract. Interactive elements use
  `{component}__{role}` test IDs. Chinese-first, user-facing copy.

## Testing and validation

- Write failing tests before new behavior. Unit tests are in `tests/unit`;
  browser tests in `tests/e2e`; real captured data only in `tests/fixtures/pdd`.
- Synthetic table cases and integration harnesses must be explicitly labeled.
  They cannot substitute for recorded-response acceptance or live smoke.
- Mock only I/O boundaries. Exercise real domain/queue/UI composition.
- Coverage gates ≥80% lines/statements/functions/branches. Playwright video
  defaults on (`PW_VIDEO=off` is the only off switch); fresh browser profiles.
- Run typecheck, lint, formatting, unit coverage, build and zip. Run browser
  tests where a browser is installed. Report blocked layers honestly.

## Privacy and safety

- `.auth/` is local-only, ignored, never packaged. No credential logging,
  fixture tokens, phone numbers, names or addresses. Sanitizer output needs
  manual review; automated scrubbing cannot guarantee anonymity.
- Manual start only, cap ≤300, concurrency ≤2, delay ≥800ms. Pause on challenge,
  never bypass it. No guessed counts, signed API scraping or auto retries of blocks.
- GREENFIELD database, ORM, migrations, auth-route matrix and container rules
  are inapplicable. Reduced inert SHIP-HATS pipeline applies (A-004).
- Root shell scripts stay Bash 3.2 compatible; keep pipeline/local gates aligned.
