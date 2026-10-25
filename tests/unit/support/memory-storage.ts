import type { StorageArea } from '../../../src/storage/storage-area';

export function createMemoryStorage(initial: Record<string, unknown> = {}): StorageArea {
  let values = { ...initial };
  return {
    async get(key: string) {
      return { [key]: values[key] };
    },
    async set(items: Record<string, unknown>) {
      values = { ...values, ...items };
    },
  };
}
