import { DEFAULT_SETTINGS, type Settings } from '../domain/goods-record.js';

const SETTINGS_KEY = 'shopper:settings';

export type StorageSyncLike = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

function getChromeSyncStorage(): StorageSyncLike | null {
  const maybeChrome = (globalThis as unknown as { chrome?: { storage?: { sync?: StorageSyncLike } } }).chrome;
  if (maybeChrome?.storage?.sync !== undefined) return maybeChrome.storage.sync;
  return null;
}

function isValidSettings(value: unknown): value is Settings {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.maxItems === 'number' &&
    (obj.concurrency === 1 || obj.concurrency === 2) &&
    typeof obj.delayMs === 'object' &&
    obj.delayMs !== null &&
    typeof (obj.delayMs as Record<string, unknown>).min === 'number' &&
    typeof (obj.delayMs as Record<string, unknown>).max === 'number' &&
    typeof obj.cacheTtlHours === 'number' &&
    typeof obj.autoStart === 'boolean'
  );
}

function normalizeSettings(raw: unknown): Settings {
  if (!isValidSettings(raw)) return { ...DEFAULT_SETTINGS };
  return {
    maxItems: clampNumber(raw.maxItems, 1, 300, DEFAULT_SETTINGS.maxItems),
    concurrency: raw.concurrency,
    delayMs: {
      min: clampNumber(raw.delayMs.min, 100, 5000, DEFAULT_SETTINGS.delayMs.min),
      max: clampNumber(raw.delayMs.max, 100, 5000, DEFAULT_SETTINGS.delayMs.max),
    },
    cacheTtlHours: clampNumber(raw.cacheTtlHours, 1, 720, DEFAULT_SETTINGS.cacheTtlHours),
    autoStart: raw.autoStart,
  };
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function createSettingsStore(storage?: StorageSyncLike): {
  load: () => Promise<Settings>;
  save: (settings: Settings) => Promise<void>;
} {
  const store = storage ?? getChromeSyncStorage();

  return {
    load: () => loadSettings(store),
    save: (settings) => saveSettings(store, settings),
  };
}

async function loadSettings(store: StorageSyncLike | null): Promise<Settings> {
  if (store === null) return { ...DEFAULT_SETTINGS };
  const result = await store.get(SETTINGS_KEY);
  const raw = result[SETTINGS_KEY];
  if (raw === undefined) return { ...DEFAULT_SETTINGS };
  return normalizeSettings(raw);
}

async function saveSettings(store: StorageSyncLike | null, settings: Settings): Promise<void> {
  if (store === null) return;
  const normalized = normalizeSettings(settings);
  await store.set({ [SETTINGS_KEY]: normalized });
}
