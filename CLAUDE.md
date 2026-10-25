# shopper — engineering instructions

`docs/00-spec.md` is the product contract. `docs/ARCHITECTURE.md` is the design. Record every new or changed decision in `docs/addenda.md` in the same change; never silently drift the documents from the implementation. `GREENFIELD.md` remains the upstream discipline reference.

## Development order

1. Add or update a failing test.
2. Make the smallest implementation change that passes it.
3. Run the narrow test, then typecheck, lint, all unit tests, and build.
4. State honestly which checks ran. Live PDD behavior is never considered validated without opt-in live recon/smoke output.

Recorded PDD pages are fixtures, not invented mocks. Never commit captures before `scripts/recon/sanitize.mjs` has produced the sanitized output and the fixture credential scan passes. `.auth/` and `tests/fixtures/pdd/raw/` contain credentials and must remain ignored.

## Architecture boundaries

- Group code by domain. Pure modules in `src/domain/` have no DOM, browser, network, or `chrome.*` imports.
- UI modules render supplied view models and wire callbacks only. They never import `fetching/` or `cache/`.
- `src/ui/use-review-panel.ts` owns panel state and all server-data derivations. No filtering, sorting, parsing, date formatting, or domain branching inside rendered markup.
- Typed contracts are defined once and imported by every caller. Do not add hand-written shape mappers.
- Fetched PDD HTML is parsed as data only. Never `eval`, never insert it with `innerHTML`, and never send it off-origin.

## Function and module discipline

- Target function bodies at 20 lines; 50 is the hard limit. Files should stay below 400 lines and must stay below 800.
- Keep nesting to three levels. Prefer guard clauses and named helpers.
- Use at most three parameters; introduce an options object beyond that. Do not use boolean flag arguments.
- A function either returns a value or performs a side effect, not both.
- Do not mutate inputs. Encapsulate necessary runtime state behind controller/queue methods and publish immutable snapshots.
- Use intent-revealing names: verb+noun functions and `is`/`has`/`should`/`can` booleans.
- Avoid circular peer dependencies and speculative abstractions.

## Browser-extension contract

- Manifest V3, WXT, TypeScript strict, Chromium.
- Permissions stay minimal: `storage` and `https://mobile.pinduoduo.com/*`. Any new permission requires an addendum.
- Every interactive control has stable `data-testid="{component}__{role}"`; repeated rows/badges share a test ID and tests scope from visible text.
- All injected elements are inside Shadow DOM. Use `textContent` and DOM constructors, not user-data HTML.
- Network requests are same-origin and use `credentials: 'include'`. Never access or log cookies.
- Default to one worker, 800–1500 ms jitter, 60 items, user-initiated runs, one retry for transient errors, and global pause on the first challenge.
- Soft failures are visible: every goods record reaches a terminal status or remains explicitly pending; layout drift must show a message.

## Testing and tooling

- Unit: Vitest. Network/storage boundaries may use small fakes; parser and discovery confidence comes from sanitized recorded fixtures once recon is available.
- E2E: Playwright with an unpacked build and sanitized recorded routes. Video is on by default; `PW_VIDEO=off` is the only off-switch.
- Live: opt-in only with `LIVE=1` and local `.auth/`; cap at five. Never run it automatically or in ordinary CI.
- Keep unit, e2e, live, and fixture files in their existing directories.
- Coverage threshold is 80% (75% branches). Never lower it to land a change.
- Root scripts must run on Bash 3.2: no associative arrays, `mapfile`, `${value,,}`, or unsafe empty-array expansion under `set -u`.

## Validation commands

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e     # requires sanitized recon fixtures
npm run test:live    # explicitly opt-in; requires .auth
```

If the sandbox lacks a browser, login, fixtures, or compatible runtime, run the remaining checks and state the exact omitted layer. Never report “tests pass” when only static checks ran.
