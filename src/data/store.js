import { deriveHierarchy } from '../domain/hierarchy.js';
import { normalizeDevelopmentRecords } from '../domain/development.js';
import { PROJECT_FIELDS } from './project-schema.js';

const DB_NAME = 'osteo3d';
export const PROJECT_SCHEMA_VERSION = 3;
const DB_VERSION = 3;
const STORE = 'projects';
const PROFILE_IDS = new Set(['adult_male', 'adult_female', 'infant', 'neonate']);
const DENTAL_STATUSES = new Set(['present', 'absent_am', 'absent_pm', 'unerupted', 'developing', 'caries', 'wear', 'fragmented', 'pathology', 'not_observable']);
const STATUS_VALUES = new Set(['present', 'absent', 'fragmentary', 'indeterminate', 'not_observable', 'not_recorded']);
const PRESERVATION_VALUES = new Set(['not_evaluated', 'excellent', 'good', 'regular', 'poor', 'very_poor', 'very_fragmented', 'not_evaluable']);
const REGION_VALUES = new Set(['all', 'Cráneo', 'Columna', 'Tórax', 'Cintura escapular', 'Extremidad superior', 'Extremidad inferior', 'Manos', 'Pies', 'Pelvis']);
const REPORT_FIELDS = ['individual', 'burial', 'grave', 'tomb', 'ue', 'sector', 'grid', 'site', 'campaign', 'date', 'context', 'chronology', 'investigator', 'observations', 'sources', 'method', 'limits'];

function objectEntries(value) { return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []; }
const HIERARCHY_REF_FIELDS = ['siteId', 'campaignId', 'sectorId', 'contextId', 'individualId'];
function normalizeHierarchyRefs(value, hierarchy = null) {
  const expectedLevels = { siteId: 'sites', campaignId: 'campaigns', sectorId: 'sectors', contextId: 'contexts', individualId: 'individuals' };
  const known = hierarchy ? new Set(Object.values(hierarchy).flatMap(entities => (entities || []).map(entity => entity.id))) : null;
  return Object.fromEntries(objectEntries(value).map(([boneId, refs]) => {
    const normalized = Object.fromEntries(HIERARCHY_REF_FIELDS.map(field => [field, String(refs?.[field] || '').trim()]).filter(([field, item]) => item && (!known || (known.has(item) && item.startsWith(`${expectedLevels[field].replace(/s$/, '')}:`)))));
    return [String(boneId), normalized];
  }).filter(([, refs]) => Object.keys(refs).length));
}
function normalizeEnumMap(value, allowed) { return Object.fromEntries(objectEntries(value).filter(([, item]) => allowed.has(item))); }
function normalizeNumberMap(value, { min = 0, max = Number.POSITIVE_INFINITY, integer = false, rejectBelowMin = false } = {}) { return Object.fromEntries(objectEntries(value).filter(([, item]) => (typeof item === 'number' || typeof item === 'string') && String(item).trim() !== '').map(([key, item]) => [key, Number(item)]).filter(([, item]) => Number.isFinite(item) && (!rejectBelowMin || item >= min)).map(([key, item]) => [key, Math.max(min, Math.min(max, integer ? Math.floor(item) : item))])); }
function normalizeStringMap(value) { return Object.fromEntries(objectEntries(value).map(([key, item]) => [key, String(item ?? '').trim()]).filter(([, item]) => item)); }
function normalizeSpecimenRecords(value) {
  return Object.fromEntries(objectEntries(value).map(([id, item]) => {
    const source = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
    const specimenId = String(source.id || id).trim();
    return [specimenId, { id: specimenId, label: String(source.label || '').trim(), individualId: String(source.individualId || '').trim(), context: String(source.context || '').trim(), notes: String(source.notes || '').trim() }];
  }).filter(([id]) => id));
}
function normalizeReport(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(REPORT_FIELDS.map(key => [key, String(source[key] ?? (key === 'individual' ? 'IND-LOCAL' : '')).trim()]));
}
function normalizeCustomModels(value) {
  const profiles = objectEntries(value).map(([profileId, models]) => {
    const normalized = Object.fromEntries(objectEntries(models).map(([boneId, model]) => {
    const source = model && typeof model === 'object' && !Array.isArray(model) ? model : {};
    const format = ['glb', 'gltf', 'obj', 'stl'].includes(String(source.format || '').toLowerCase()) ? String(source.format).toLowerCase() : '';
    return [boneId, { fileName: String(source.fileName || `${boneId}.${format || 'glb'}`).trim(), format: format || 'glb', cached: source.cached !== false, updatedAt: String(source.updatedAt || '') }];
    }).filter(([, model]) => model.fileName));
    return [profileId, normalized];
  }).filter(([, models]) => Object.keys(models).length);
  return Object.fromEntries(profiles);
}
function normalizeFilters(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    status: STATUS_VALUES.has(source.status) ? source.status : 'all',
    region: REGION_VALUES.has(source.region) ? source.region : 'all',
    side: ['all', 'left', 'right', 'indeterminate', 'not_applicable', 'Izquierda', 'Derecha', 'Indeterminada', 'No aplicable', '—'].includes(source.side) ? source.side : 'all',
    taphonomy: ['all', 'with', 'without'].includes(source.taphonomy) ? source.taphonomy : 'all',
    pathology: ['all', 'with', 'without'].includes(source.pathology) ? source.pathology : 'all',
    preservation: PRESERVATION_VALUES.has(source.preservation) ? source.preservation : 'all',
    type: typeof source.type === 'string' && source.type.trim() ? source.type.trim() : 'all'
  };
}

function normalizeDental(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, status]) => DENTAL_STATUSES.has(status)));
}

function normalizePhotos(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const imagePattern = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i;
  return Object.fromEntries(Object.entries(value).map(([scope, photos]) => [scope, Array.isArray(photos) ? photos.filter(photo => imagePattern.test(String(photo?.dataUrl || ''))).map(photo => ({
    name: String(photo.name || 'Fotografía'),
    type: String(photo.type || 'image/jpeg'),
    dataUrl: String(photo.dataUrl),
    width: Number.isFinite(Number(photo.width)) ? Number(photo.width) : undefined,
    height: Number.isFinite(Number(photo.height)) ? Number(photo.height) : undefined
  })) : []]));
}

export function normalizeIndeterminateFragments(value) {
  if (!Array.isArray(value)) return [];
  const nonNegative = raw => { const number = Number(raw); return Number.isFinite(number) && number >= 0 ? number : null; };
  return value.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => ({
    type: String(item.type || '').trim(),
    size: String(item.size || '').trim(),
    quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 1 ? Math.floor(Number(item.quantity)) : 1,
    weight: nonNegative(item.weight),
    weightUnit: String(item.weightUnit).toLowerCase() === 'kg' ? 'kg' : 'g',
    length: nonNegative(item.length),
    width: nonNegative(item.width),
    thickness: nonNegative(item.thickness),
    individual: String(item.individual || '').trim(),
    context: String(item.context || '').trim(),
    observations: String(item.observations || '').trim(),
    createdAt: String(item.createdAt || '').trim()
  }));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    const fail = error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
    const timer = setTimeout(() => fail(new Error('IndexedDB no responde')), 15000);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true; clearTimeout(timer);
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error('IndexedDB bloqueado por otra pestaña'));
  });
}

export const fallbackProjectKey = id => `osteo3d-project-fallback:${encodeURIComponent(id)}`;

function readFallbackProjects() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(key => key?.startsWith('osteo3d-project-fallback:'));
    keys.unshift('osteo3d-mvp'); // Recover legacy copies without applying one project's data to another.
    return keys.flatMap(key => {
      try { const project = normalizeProject(JSON.parse(localStorage.getItem(key) || 'null')); return project ? [project] : []; }
      catch { return []; }
    });
  } catch { return []; }
}

function newestProjects(projects) {
  const byId = new Map();
  for (const project of projects) {
    const previous = byId.get(project.id);
    if (!previous || String(project.updatedAt || '') >= String(previous.updatedAt || '')) byId.set(project.id, project);
  }
  return [...byId.values()];
}

function normalizeCameraView(value) {
  if (!value || typeof value !== 'object') return null;
  const target = Array.isArray(value.target) && value.target.length === 3 ? value.target.map(Number) : [0, 0, 0];
  const values = [value.theta, value.phi, value.radius, ...target].map(Number);
  if (!values.every(Number.isFinite)) return null;
  return { theta: values[0], phi: Math.max(0.12, Math.min(Math.PI - 0.12, values[1])), radius: Math.max(0.35, Math.min(40, values[2])), target };
}

export function normalizeProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) return null;
  const cleanProject = Object.fromEntries(Object.entries(project).filter(([key]) => PROJECT_FIELDS.has(key)));
  const report = normalizeReport(cleanProject.report);
  const hierarchy = deriveHierarchy({ ...cleanProject, report });
  const preservation = normalizeEnumMap(cleanProject.preservation, PRESERVATION_VALUES);
  const completeness = normalizeNumberMap(cleanProject.completeness, { min: 0, max: 100 });
  // “No evaluable” means that no conservation percentage can be observed.
  // Remove legacy/inconsistent percentages so “—” remains distinct from 0%.
  Object.keys(preservation).filter(key => preservation[key] === 'not_evaluable').forEach(key => delete completeness[key]);
  return {
    ...cleanProject,
    id: cleanProject.id || 'default',
    projectName: cleanProject.projectName || 'Proyecto sin título',
    schemaVersion: PROJECT_SCHEMA_VERSION,
    profile: PROFILE_IDS.has(cleanProject.profile) ? cleanProject.profile : 'adult_male',
    selected: cleanProject.selected || 'skull',
    status: normalizeEnumMap(cleanProject.status, STATUS_VALUES),
    preservation,
    completeness,
    fragments: normalizeNumberMap(cleanProject.fragments, { min: 0, integer: true }),
    weights: normalizeNumberMap(cleanProject.weights, { rejectBelowMin: true }),
    weightUnits: Object.fromEntries(objectEntries(cleanProject.weightUnits).filter(([, unit]) => ['g', 'kg'].includes(String(unit).toLowerCase())).map(([key, unit]) => [key, String(unit).toLowerCase()])),
    portions: cleanProject.portions || {},
    portionRecords: cleanProject.portionRecords || {},
    developmentRecords: normalizeDevelopmentRecords(cleanProject.developmentRecords),
    hierarchyRefs: normalizeHierarchyRefs(cleanProject.hierarchyRefs, hierarchy),
    individuals: normalizeStringMap(cleanProject.individuals),
    specimens: normalizeStringMap(cleanProject.specimens),
    specimenRecords: normalizeSpecimenRecords(cleanProject.specimenRecords),
    ue: normalizeStringMap(cleanProject.ue),
    taphonomy: Object.fromEntries(objectEntries(cleanProject.taphonomy).map(([key, item]) => [key, Array.isArray(item) ? item.map(value => String(value ?? '').trim()).filter(Boolean) : []]).filter(([, item]) => item.length)),
    pathology: Object.fromEntries(objectEntries(cleanProject.pathology).map(([key, item]) => [key, Array.isArray(item) ? item.map(value => String(value ?? '').trim()).filter(Boolean) : []]).filter(([, item]) => item.length)),
    taphonomyDetails: cleanProject.taphonomyDetails || {},
    pathologyDetails: cleanProject.pathologyDetails || {},
    notes: normalizeStringMap(cleanProject.notes),
    indeterminateFragments: normalizeIndeterminateFragments(cleanProject.indeterminateFragments),
    locked: Object.fromEntries(objectEntries(cleanProject.locked).filter(([, item]) => Boolean(item)).map(([key]) => [key, true])),
    hidden: Object.fromEntries(objectEntries(cleanProject.hidden).filter(([, item]) => Boolean(item)).map(([key]) => [key, true])),
    opacity: cleanProject.opacity || {},
    opacityScope: ['bone', 'region', 'skeleton'].includes(cleanProject.opacityScope) ? cleanProject.opacityScope : 'bone',
    skeletonFilter: ['all', 'axial', 'appendicular'].includes(cleanProject.skeletonFilter) ? cleanProject.skeletonFilter : 'all',
    regionFilter: typeof cleanProject.regionFilter === 'string' ? cleanProject.regionFilter : 'all',
    explosion: Math.max(0, Math.min(100, Number(cleanProject.explosion) || 0)),
    tableMode: Boolean(cleanProject.tableMode),
    orthographic: Boolean(cleanProject.orthographic),
    isolate: Boolean(cleanProject.isolate),
    explosionAnimating: false,
    wireframe: Boolean(cleanProject.wireframe),
    xray: Boolean(cleanProject.xray),
    labelMode: ['selected', 'region', 'all', 'none'].includes(cleanProject.labelMode) ? cleanProject.labelMode : 'selected',
    colorByRegion: cleanProject.colorByRegion !== false,
    comparisonProfile: cleanProject.comparisonProfile || '',
    customModels: normalizeCustomModels(cleanProject.customModels),
    tableTransforms: cleanProject.tableTransforms || {},
    lightIntensity: Number.isFinite(cleanProject.lightIntensity) ? cleanProject.lightIntensity : 1,
    ambientLightIntensity: Number.isFinite(cleanProject.ambientLightIntensity) ? cleanProject.ambientLightIntensity : 1,
    lightingAzimuth: Number.isFinite(cleanProject.lightingAzimuth) ? cleanProject.lightingAzimuth : 30,
    lightingElevation: Number.isFinite(cleanProject.lightingElevation) ? cleanProject.lightingElevation : 55,
    lightingMode: ['neutral', 'laboratory', 'high_contrast'].includes(cleanProject.lightingMode) ? cleanProject.lightingMode : 'neutral',
    cameraView: normalizeCameraView(cleanProject.cameraView),
    changeLog: Array.isArray(cleanProject.changeLog) ? cleanProject.changeLog : [],
    dental: normalizeDental(cleanProject.dental),
    deciduousDental: normalizeDental(cleanProject.deciduousDental),
    dentitionType: ['permanent', 'deciduous'].includes(cleanProject.dentitionType) ? cleanProject.dentitionType : 'permanent',
    measurements: cleanProject.measurements || {},
    landmarks: cleanProject.landmarks || {},
    calibrations: cleanProject.calibrations || {},
    landmarkModelRefs: cleanProject.landmarkModelRefs || {},
    photos: normalizePhotos(cleanProject.photos),
    language: ['es', 'en'].includes(cleanProject.language) ? cleanProject.language : 'es',
    filters: normalizeFilters(cleanProject.filters),
    report,
    hierarchy
  };
}

export async function saveProject(project) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Error de escritura IndexedDB'));
      tx.onabort = () => reject(tx.error || new Error('Transacción IndexedDB cancelada'));
      tx.objectStore(STORE).put(normalizeProject(project));
    });
  } finally { db.close(); }
}

export async function loadProject(id) {
  let result = null, db;
  try {
    db = await openDatabase();
    result = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(id);
      request.onsuccess = () => resolve(normalizeProject(request.result));
      request.onerror = () => reject(request.error);
    });
  } catch {} finally { db?.close(); }
  return newestProjects([...(result ? [result] : []), ...readFallbackProjects().filter(project => project.id === id)])[0] || null;
}

export async function listProjects() {
  let projects = [], db;
  try {
    db = await openDatabase();
    projects = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).map(normalizeProject).filter(Boolean));
      request.onerror = () => reject(request.error);
    });
  } catch {} finally { db?.close(); }
  return newestProjects([...projects, ...readFallbackProjects()]).sort((a, b) => String(a.projectName || a.id).localeCompare(String(b.projectName || b.id), 'es'));
}
