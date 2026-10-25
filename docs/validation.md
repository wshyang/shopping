# Validation record — 2026-10-24

Sandbox runtime: Node 22.22.3 / npm 10.9.8; configured CI runtime: Node 24.

- Unit/DOM integration: passed, real modules with synthetic table/DOM inputs,
  fake timers and fakes only at fetch/browser-storage boundaries.
- Coverage gates: ≥80% lines/statements/functions/branches, applied to `src/**`.
  Popup/entrypoint glue and recon scripts are not included in this metric.
- TypeScript strict, ESLint design/boundary checks, Prettier: passed.
  Function-length rule is waived for test callbacks only, not production code.
- WXT Chromium MV3 build and extension zip: passed. Permissions inspected.
- SHIP-HATS scratch activation/idempotence/validation tests: passed on sandbox Bash.
- `npm run test:e2e`: attempted, **blocked** before test execution because
  Playwright Chromium executable is absent. Browser download hosts are outside
  this sandbox's outbound allowlist. Synthetic browser harness remains unverified.
- Live PDD, recorded-response acceptance, R1–R8, five-item smoke: **not run**.
- Bash 3.2 runtime, ShellCheck and GitLab schema validation: **not run**.

No claim is made that the live PDD layout, fetch strategy, review paths or
challenge signatures work. Resolve `docs/01-pdd-recon.md` before release.
