import { describe, it, expect } from 'vitest';
import { createReviewCache, type StorageLike } from '../../src/cache/review-cache.js';

function createFakeStorage(): StorageLike & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    async get(keys) {
      if (typeof keys === 'string') return { [keys]: data[keys] };
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        for (const key of keys) result[key] = data[key];
        return result;
      }
      // null means get all
      return { ...data };
    },
    async set(items) { Object.assign(data, items); },
    async remove(keys) {
      const list = typeof keys === 'string' ? [keys] : keys;
      for (const key of list) delete data[key];
    },
  };
}

describe('createReviewCache', () => {
  it('stores and retrieves within TTL', async () => {
    const storage = createFakeStorage();
    const cache = createReviewCache(storage, 24);
    const now = new Date().toISOString();
    await cache.set('123', { reviewCount: 100, fetchedAt: now });
    const entry = await cache.get('123');
    expect(entry?.reviewCount).toBe(100);
  });

  it('returns null after TTL expired', async () => {
    const storage = createFakeStorage();
    const cache = createReviewCache(storage, 0.0001); // ~0.36 seconds
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
    await cache.set('123', { reviewCount: 100, fetchedAt: old });
    const entry = await cache.get('123');
    expect(entry).toBeNull();
  });

  it('returns null for missing key', async () => {
    const storage = createFakeStorage();
    const cache = createReviewCache(storage, 24);
    expect(await cache.get('missing')).toBeNull();
  });
});
