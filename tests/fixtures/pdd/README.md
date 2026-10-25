# PDD fixtures

Only sanitized, authenticated recon captures belong in `sanitized/`. Raw responses belong in ignored `raw/` and must never be committed.

The implementation sandbox had no authenticated live access, so no response fixture has been fabricated. Follow `docs/01-pdd-recon.md`; after capture, document each committed fixture there and add `sanitized/fixture-manifest.json` mapping search and goods IDs to files for the E2E harness.
