import { describe, expect, it, vi } from 'vitest';
import { createReviewCache } from '../../../src/cache/review-cache';
import { createMemoryStorage } from '../support/memory-storage';

describe('review cache', () => {
  it('round-trips zero and positive counts', async () => {
    const now = vi.fn(() => new Date('2026-10-24T00:00:00.000Z'));
    const cache = createReviewCache(createMemoryStorage(), now);
    await cache.set('one', 0);
    await expect(cache.get('one', 24)).resolves.toEqual({
      reviewCount: 0,
      fetchedAt: '2026-10-24T00:00:00.000Z',
    });
  });

  it('returns null for expired or malformed values', async () => {
    const storage = createMemoryStorage({
      'rc:old': { reviewCount: 4, fetchedAt: '2026-10-20T00:00:00.000Z' },
      'rc:bad': { reviewCount: -1, fetchedAt: 'nope' },
    });
    const cache = createReviewCache(storage, () => new Date('2026-10-24T00:00:00.000Z'));
    await expect(cache.get('old', 24)).resolves.toBeNull();
    await expect(cache.get('bad', 24)).resolves.toBeNull();
    await expect(cache.get('missing', 24)).resolves.toBeNull();
  });
});
