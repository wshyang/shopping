import type { StorageArea } from '../storage/storage-area';

export type CacheEntry = {
  reviewCount: number;
  fetchedAt: string;
};

export type ReviewCache = {
  get(goodsId: string, ttlHours: number): Promise<CacheEntry | null>;
  set(goodsId: string, reviewCount: number): Promise<CacheEntry>;
};

type Now = () => Date;

export function createReviewCache(storage: StorageArea, now: Now = () => new Date()): ReviewCache {
  return {
    async get(goodsId, ttlHours) {
      const values = await storage.get(getCacheKey(goodsId));
      const entry = values[getCacheKey(goodsId)];
      return isFreshCacheEntry(entry, ttlHours, now()) ? entry : null;
    },
    async set(goodsId, reviewCount) {
      const entry = { reviewCount, fetchedAt: now().toISOString() };
      await storage.set({ [getCacheKey(goodsId)]: entry });
      return entry;
    },
  };
}

function getCacheKey(goodsId: string): string {
  return `rc:${goodsId}`;
}

function isFreshCacheEntry(
  value: unknown,
  ttlHours: number,
  currentTime: Date,
): value is CacheEntry {
  if (!isCacheEntry(value)) return false;
  const fetchedAt = Date.parse(value.fetchedAt);
  const age = currentTime.getTime() - fetchedAt;
  return age >= 0 && age <= ttlHours * 60 * 60 * 1000;
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<CacheEntry>;
  return (
    typeof candidate.reviewCount === 'number' &&
    Number.isSafeInteger(candidate.reviewCount) &&
    candidate.reviewCount >= 0 &&
    typeof candidate.fetchedAt === 'string' &&
    Number.isFinite(Date.parse(candidate.fetchedAt))
  );
}
