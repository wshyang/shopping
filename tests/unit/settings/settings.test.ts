import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from '../../../src/settings/settings';
import { createMemoryStorage } from '../support/memory-storage';

describe('settings', () => {
  it('loads defaults when storage is empty', async () => {
    await expect(loadSettings(createMemoryStorage())).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('normalizes malformed and out-of-range values', () => {
    expect(
      normalizeSettings({
        maxItems: 900,
        concurrency: 7,
        delayMs: { min: 3000, max: 20 },
        cacheTtlHours: 0,
        autoStart: 'yes',
      }),
    ).toEqual({
      maxItems: 300,
      concurrency: 1,
      delayMs: { min: 3000, max: 3000 },
      cacheTtlHours: 1,
      autoStart: false,
    });
  });

  it('saves only normalized settings', async () => {
    const storage = createMemoryStorage();
    const saved = await saveSettings(storage, { ...DEFAULT_SETTINGS, maxItems: -2 });
    expect(saved.maxItems).toBe(1);
    await expect(loadSettings(storage)).resolves.toEqual(saved);
  });
});
