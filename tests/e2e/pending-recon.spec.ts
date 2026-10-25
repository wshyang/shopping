import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from '@playwright/test';

const manifestPath = resolve('tests/fixtures/pdd/sanitized/fixture-manifest.json');
const hasRecordedFixtures = await access(manifestPath)
  .then(() => true)
  .catch(() => false);
const reason = 'Authenticated, sanitized PDD fixtures are not available; see docs/01-pdd-recon.md.';

// These names are the acceptance matrix. They remain explicit skips rather than
// tests against invented PDD markup. Recon replaces this file with fixture-backed
// implementations in the same change that commits fixture-manifest.json.
test.describe('recorded PDD extension flows', () => {
  test.skip(!hasRecordedFixtures, reason);

  test('badges appear with parsed review counts', async () => {
    test.fail(
      true,
      'Fixture manifest exists, but recon-backed test implementation has not replaced this guard.',
    );
  });
  test('sort by reviews changes only the side list', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('minimum reviews filters side-list rows', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('configured cap limits goods requests', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('a cache hit skips the second network request', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('a challenge response pauses the queue', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('CSV export contains the collected rows', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('infinite-scroll additions receive badges', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
  test('an unrecognized layout shows a visible message', async () => {
    test.fail(true, 'Pending recon fixture contract.');
  });
});
