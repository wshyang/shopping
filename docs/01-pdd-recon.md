# PDD authenticated recon record

Status: **Not run — authenticated live access unavailable in the implementation sandbox (2026-10-24).**

This file deliberately contains no invented selectors, response paths, or rate thresholds. Run the scripts from a trusted local workstation, sanitize captures, and replace each `Pending` result with dated evidence before describing live behavior as validated.

## Procedure

1. Run `npm run recon:browser`, log in manually, and leave the browser open.
2. Open the sample `洗衣粉` search, scroll gently through three result pages, and inspect requests/DOM.
3. Run `npm run recon:harvest` to save local credential state under `.auth/`.
4. Run `npm run recon:capture -- --output tests/fixtures/pdd/raw/<name>` only for the minimum responses needed.
5. Run `npm run recon:sanitize -- --input tests/fixtures/pdd/raw --output tests/fixtures/pdd/sanitized`.
6. Review the diff manually, run the fixture credential test, then commit only sanitized files.
7. Run the fixture E2E suite. Run `npm run test:live` separately with a cap of five.

## Findings register

| ID  | Question                                      | Result                                                                                                              | Evidence                                     |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| R1  | Card container and goods ID source            | Pending. Implementation requires a `goods.html?goods_id=` link and uses semantic ancestor fallbacks.                | Capture DOM excerpt from three cards.        |
| R2  | Initial/list pagination source and signing    | Pending.                                                                                                            | Record HAR request name and required fields. |
| R3  | Review-count source and exact structured path | Pending. Parser currently accepts an explicit review-key allowlist plus labelled text.                              | Three product captures: high, low, zero.     |
| R4  | Same-origin credentialed HTML contains count  | Pending; implemented as the provisional strategy.                                                                   | DevTools fetch result and fixture.           |
| R5  | Hidden same-origin iframe works if R4 fails   | Pending; not implemented because it is heavier.                                                                     | Manual experiment only if R4 fails.          |
| R6  | Meaning of `本店已拼`                         | Pending; kept distinctly typed as `shop_group`.                                                                     | Compare several cards/details.               |
| R7  | Actual challenge markers and safe pacing      | Pending. Generic status/URL/Chinese markers pause conservatively. Do not intentionally provoke repeated challenges. | First naturally observed block only.         |
| R8  | Additional sales-label variants               | Pending.                                                                                                            | Samples from three keywords.                 |

## Required fixture inventory

- `search-xiyifen.html`
- `search-list-page2.json`, only if applicable
- three `goods-*.html` responses covering high, low, and zero reviews
- `blocked.html`, only if naturally observed

Every fixture needs a short provenance comment here: capture date, page role, sanitizer version/commit, and fields intentionally retained. Never include a URL query token, cookie, access token, user ID, address, phone number, or account-specific recommendation payload.

## Provisional implementation seams to confirm

- `src/discovery/find-cards.ts`: link and card selection.
- `src/domain/parse-review-count.ts`: assignment extraction and key paths.
- `src/fetching/risk-detect.ts`: URL/body block markers.
- `src/fetching/goods-fetcher.ts`: HTML fetch versus replacement strategy.
- `src/domain/parse-sales-label.ts`: label grammar.

After recon, update this record and A-006 in `addenda.md` in the same change as fixtures/code/tests.
