export const INVENTORY_SNAPSHOT_FIELDS = ['status', 'preservation', 'completeness', 'fragments', 'weights', 'weightUnits', 'portions', 'portionRecords', 'developmentRecords', 'hierarchyRefs', 'individuals', 'specimens', 'specimenRecords', 'ue', 'taphonomy', 'pathology', 'taphonomyDetails', 'pathologyDetails', 'notes', 'locked', 'dental', 'deciduousDental', 'dental3d', 'report', 'hierarchy', 'analysisReview', 'measurements', 'landmarks', 'calibrations', 'landmarkModelRefs', 'photos', 'indeterminateFragments', 'hidden', 'opacity', 'opacityScope', 'tableTransforms', 'skeletonFilter', 'regionFilter', 'filters', 'tableMode', 'orthographic', 'wireframe', 'xray', 'labelMode', 'colorByRegion', 'isolate', 'explosion', 'lightIntensity', 'ambientLightIntensity', 'lightingAzimuth', 'lightingElevation', 'lightingMode', 'renderQuality', 'cameraView'];

const SNAPSHOT_DEFAULTS = { indeterminateFragments: [], hidden: {}, opacity: {}, opacityScope: 'bone', tableTransforms: {}, skeletonFilter: 'all', regionFilter: 'all', filters: { status: 'all', region: 'all', side: 'all', taphonomy: 'all', pathology: 'all', preservation: 'all', type: 'all' }, tableMode: false, orthographic: false, wireframe: false, xray: false, labelMode: 'selected', colorByRegion: true, isolate: false, explosion: 0, lightIntensity: 1, ambientLightIntensity: 1, lightingAzimuth: 30, lightingElevation: 55, lightingMode: 'neutral', cameraView: null };

export function takeInventorySnapshot(state) {
  return structuredClone(Object.fromEntries(INVENTORY_SNAPSHOT_FIELDS.map(field => [field, state[field] ?? SNAPSHOT_DEFAULTS[field] ?? {}])));
}

export function applyInventorySnapshot(state, snapshot) {
  Object.assign(state, takeInventorySnapshot(snapshot));
}
