import type { StorageArea } from '../storage/storage-area';

export type Settings = {
  maxItems: number;
  concurrency: 1 | 2;
  delayMs: { min: number; max: number };
  cacheTtlHours: number;
  autoStart: boolean;
};

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  maxItems: 60,
  concurrency: 1,
  delayMs: Object.freeze({ min: 800, max: 1500 }),
  cacheTtlHours: 24,
  autoStart: false,
});

const SETTINGS_KEY = 'settings';

export async function loadSettings(storage: StorageArea): Promise<Settings> {
  const stored = await storage.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(storage: StorageArea, value: unknown): Promise<Settings> {
  const settings = normalizeSettings(value);
  await storage.set({ [SETTINGS_KEY]: settings });
  return settings;
}

export function normalizeSettings(value: unknown): Settings {
  const candidate = isRecord(value) ? value : {};
  const delay = isRecord(candidate.delayMs) ? candidate.delayMs : {};
  const min = clampInteger({
    value: delay.min,
    fallback: DEFAULT_SETTINGS.delayMs.min,
    minimum: 100,
    maximum: 30_000,
  });
  const max = clampInteger({
    value: delay.max,
    fallback: DEFAULT_SETTINGS.delayMs.max,
    minimum: min,
    maximum: 60_000,
  });

  return {
    maxItems: clampInteger({
      value: candidate.maxItems,
      fallback: DEFAULT_SETTINGS.maxItems,
      minimum: 1,
      maximum: 300,
    }),
    concurrency: candidate.concurrency === 2 ? 2 : 1,
    delayMs: { min, max },
    cacheTtlHours: clampInteger({
      value: candidate.cacheTtlHours,
      fallback: DEFAULT_SETTINGS.cacheTtlHours,
      minimum: 1,
      maximum: 720,
    }),
    autoStart: candidate.autoStart === true,
  };
}

type NumberRange = { value: unknown; fallback: number; minimum: number; maximum: number };

function clampInteger(range: NumberRange): number {
  if (typeof range.value !== 'number' || !Number.isFinite(range.value)) return range.fallback;
  return Math.min(range.maximum, Math.max(range.minimum, Math.round(range.value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
