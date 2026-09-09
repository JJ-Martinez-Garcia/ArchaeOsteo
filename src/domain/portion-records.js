const PORTION_STATUS_VALUES = new Set(['present', 'absent', 'fragmentary', 'indeterminate', 'not_observable', 'not_recorded']);

function objectEntries(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
}

function normalizeNumber(value, { min = 0, max = Number.POSITIVE_INFINITY, integer = false } = {}) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, integer ? Math.floor(number) : number));
}

export function normalizePortionRecords(value) {
  return Object.fromEntries(objectEntries(value).map(([boneId, portions]) => {
    const normalized = Object.fromEntries(objectEntries(portions).map(([portionId, record]) => {
      const source = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
      const status = PORTION_STATUS_VALUES.has(source.status) ? source.status : 'not_recorded';
      const next = { status };
      const completeness = normalizeNumber(source.completeness, { max: 100 });
      const fragments = normalizeNumber(source.fragments, { integer: true });
      if (completeness !== null) next.completeness = completeness;
      if (fragments !== null) next.fragments = fragments;
      return [portionId, next];
    }).filter(([, record]) => record.status !== 'not_recorded' || 'completeness' in record || 'fragments' in record));
    return [boneId, normalized];
  }).filter(([, portions]) => Object.keys(portions).length));
}

export function portionRecordCount(value) {
  return Object.values(normalizePortionRecords(value)).reduce((count, portions) => count + Object.keys(portions).length, 0);
}
