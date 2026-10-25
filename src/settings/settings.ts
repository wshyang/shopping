export type Settings = {
  maxItems: number;
  concurrency: 1 | 2;
  delayMs: { min: number; max: number };
  cacheTtlHours: number;
  autoStart: boolean;
};
export const defaults: Settings = {
  maxItems: 60,
  concurrency: 1,
  delayMs: { min: 800, max: 1500 },
  cacheTtlHours: 24,
  autoStart: false,
};
function bounded(
  value: unknown,
  fallback: number,
  range: [number, number],
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(range[1], Math.max(range[0], Math.round(value)))
    : fallback;
}
export function validateSettings(input: unknown): Settings {
  const value = (
    input && typeof input === "object" ? input : {}
  ) as Partial<Settings>;
  const min = bounded(value.delayMs?.min, 800, [800, 60000]);
  return {
    maxItems: bounded(value.maxItems, 60, [1, 300]),
    concurrency: value.concurrency === 2 ? 2 : 1,
    delayMs: {
      min,
      max: bounded(value.delayMs?.max, Math.max(min, 1500), [min, 60000]),
    },
    cacheTtlHours: bounded(value.cacheTtlHours, 24, [1, 168]),
    autoStart: false,
  };
}
export async function loadSettings(): Promise<Settings> {
  try {
    return validateSettings(
      (await browser.storage.sync.get("settings")).settings,
    );
  } catch {
    return validateSettings(defaults);
  }
}
export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.sync.set({ settings: validateSettings(settings) });
}
