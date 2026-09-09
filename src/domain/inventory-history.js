export const INVENTORY_SNAPSHOT_FIELDS = ['status', 'preservation', 'completeness', 'fragments', 'weights', 'weightUnits', 'portions', 'portionRecords', 'individuals', 'ue', 'taphonomy', 'pathology', 'taphonomyDetails', 'pathologyDetails', 'notes', 'locked', 'dental', 'deciduousDental', 'report', 'measurements', 'landmarks', 'calibrations', 'landmarkModelRefs', 'photos', 'indeterminateFragments'];

export function takeInventorySnapshot(state) {
  return structuredClone(Object.fromEntries(INVENTORY_SNAPSHOT_FIELDS.map(field => [field, state[field] ?? (field === 'indeterminateFragments' ? [] : {})])));
}

export function applyInventorySnapshot(state, snapshot) {
  Object.assign(state, takeInventorySnapshot(snapshot));
}
