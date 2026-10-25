import type { StorageArea } from './storage-area';

type BrowserStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

export function adaptBrowserStorage(area: BrowserStorageArea): StorageArea {
  return {
    get: (key) => area.get(key),
    set: (items) => area.set(items),
  };
}
