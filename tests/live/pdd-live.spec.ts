import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const isEnabled = process.env.LIVE === '1';
const profilePath = resolve('.auth/pdd-profile');
const hasProfile = await access(profilePath)
  .then(() => true)
  .catch(() => false);

test('collects at most five review counts without a challenge', async () => {
  test.skip(!isEnabled, 'Set LIVE=1 explicitly to run against PDD.');
  test.skip(!hasProfile, 'Run authenticated recon bootstrap first.');
  test.fail(
    true,
    'Live selectors must be confirmed and fixture-locked by M0 recon before this smoke test is enabled.',
  );
  expect(true).toBe(true);
});
