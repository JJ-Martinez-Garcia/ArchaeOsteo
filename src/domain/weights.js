export const WEIGHT_UNITS = new Set(['g', 'kg']);

export function normalizeWeightUnit(value) {
  return WEIGHT_UNITS.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'g';
}

export function weightToGrams(value, unit = 'g') {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number * (normalizeWeightUnit(unit) === 'kg' ? 1000 : 1);
}
