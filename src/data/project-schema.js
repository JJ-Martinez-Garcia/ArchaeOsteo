// Single source of truth for persisted project fields. Keep this list aligned
// with public/schemas/osteo3d-project-v3.schema.json.
export const PROJECT_FIELDS = new Set([
  'id', 'projectName', 'schemaVersion', 'profile', 'selected', 'skeletonFilter', 'regionFilter', 'explosion', 'tableMode',
  'orthographic', 'isolate', 'status', 'preservation', 'completeness', 'fragments', 'weights', 'weightUnits', 'portions',
  'portionRecords', 'developmentRecords', 'hierarchyRefs', 'individuals', 'specimens', 'specimenRecords', 'ue', 'taphonomy',
  'pathology', 'taphonomyDetails', 'pathologyDetails', 'notes', 'indeterminateFragments', 'locked', 'hidden', 'opacity',
  'opacityScope', 'wireframe', 'xray', 'labelMode', 'colorByRegion', 'comparisonProfile', 'renderQuality', 'customModels',
  'geometryMode', 'analysisReview', 'tableTransforms', 'lightIntensity', 'ambientLightIntensity', 'lightingAzimuth',
  'lightingElevation', 'lightingMode', 'cameraView', 'changeLog', 'dental', 'deciduousDental', 'dentitionType', 'dental3d',
  'measurements', 'landmarks', 'calibrations', 'landmarkModelRefs', 'photos', 'photoScope', 'photoTargetId', 'language',
  'filters', 'report', 'hierarchy', 'updatedAt'
]);
