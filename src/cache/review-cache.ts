export type CacheEntry = { reviewCount: number; fetchedAt: string };
export interface Storage {
  get(key: string): Promise<Record<string, unknown>>;
  set(value: Record<string, unknown>): Promise<void>;
}
export class ReviewCache {
  constructor(
    private storage: Storage,
    private ttlHours: number,
  ) {}
  async get(id: string): Promise<CacheEntry | null> {
    try {
      const entry = (await this.storage.get(`rc:${id}`))[`rc:${id}`] as
        | CacheEntry
        | undefined;
      if (
        !entry ||
        !Number.isSafeInteger(entry.reviewCount) ||
        entry.reviewCount < 0
      )
        return null;
      const age = Date.now() - Date.parse(entry.fetchedAt);
      return age >= 0 && age < this.ttlHours * 3600000 ? entry : null;
    } catch {
      return null;
    }
  }
  async set(id: string, entry: CacheEntry): Promise<void> {
    try {
      await this.storage.set({ [`rc:${id}`]: entry });
    } catch {
      console.warn("[shopper] 无法保存缓存");
    }
  }
}
