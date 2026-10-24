import type { CacheEntry } from '../domain/goods-record.js';

const CACHE_PREFIX = 'rc:';
const CACHE_VERSION_KEY = 'shopper:cacheVersion';
const CURRENT_CACHE_VERSION = 1;

function cacheKey(goodsId: string): string {
  return `${CACHE_PREFIX}${goodsId}`;
}

function isExpired(fetchedAt: string, ttlHours: number): boolean {
  const fetchedTime = Date.parse(fetchedAt);
  if (Number.isNaN(fetchedTime)) return true;
  const ageMs = Date.now() - fetchedTime;
  return ageMs > ttlHours * 3600 * 1000;
}

export type StorageLike = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
};

function getChromeStorage(): StorageLike | null {
  const maybeChrome = (globalThis as unknown as { chrome?: { storage?: { local?: StorageLike } } }).chrome;
  if (maybeChrome?.storage?.local !== undefined) return maybeChrome.storage.local;
  return null;
}

export function createReviewCache(storage?: StorageLike, ttlHours = 24): {
  get: (goodsId: string) => Promise<CacheEntry | null>;
  set: (goodsId: string, entry: CacheEntry) => Promise<void>;
  clear: () => Promise<void>;
} {
  const store = storage ?? getChromeStorage();
  const ttl = ttlHours;

  return {
    get: (goodsId) => getEntry(store, goodsId, ttl),
    set: (goodsId, entry) => setEntry(store, goodsId, entry),
    clear: () => clearEntries(store),
  };
}

async function getEntry(
  store: StorageLike | null,
  goodsId: string,
  ttlHours: number,
): Promise<CacheEntry | null> {
  if (store === null) return null;
  const key = cacheKey(goodsId);
  const result = await store.get(key);
  const entry = result[key] as CacheEntry | undefined;
  if (entry === undefined) return null;
  if (isExpired(entry.fetchedAt, ttlHours)) return null;
  return entry;
}

async function setEntry(
  store: StorageLike | null,
  goodsId: string,
  entry: CacheEntry,
): Promise<void> {
  if (store === null) return;
  const key = cacheKey(goodsId);
  await store.set({ [key]: entry, [CACHE_VERSION_KEY]: CURRENT_CACHE_VERSION });
}

async function clearEntries(store: StorageLike | null): Promise<void> {
  if (store === null) return;
  const all = await store.get(null as unknown as string);
  const keysToRemove = Object.keys(all).filter(
    (key) => key.startsWith(CACHE_PREFIX) || key === CACHE_VERSION_KEY,
  );
  if (keysToRemove.length > 0) await store.remove(keysToRemove);
}
