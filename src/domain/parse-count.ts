const UNIT_MULTIPLIERS: Readonly<Record<string, number>> = {
  '': 1,
  万: 10_000,
  亿: 100_000_000,
};

export function parseLocalizedCount(raw: string): number | null {
  const normalized = raw.replace(/[，,\s+]/g, '');
  const match = /^(\d+(?:\.\d+)?)([万亿]?)$/.exec(normalized);
  if (!match) return null;

  const numberText = match[1];
  const unit = match[2];
  if (numberText === undefined || unit === undefined) return null;

  const value = Number.parseFloat(numberText);
  const multiplier = UNIT_MULTIPLIERS[unit];
  if (!Number.isFinite(value) || multiplier === undefined) return null;
  return Math.round(value * multiplier);
}
