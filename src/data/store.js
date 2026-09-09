import { deriveHierarchy } from '../domain/hierarchy.js';

const DB_NAME = 'osteo3d';
export const PROJECT_SCHEMA_VERSION = 3;
const DB_VERSION = 3;
const STORE = 'projects';
const PROFILE_IDS = new Set(['adult_male', 'adult_female', 'infant', 'neonate']);
const DENTAL_STATUSES = new Set(['present', 'absent_am', 'absent_pm', 'unerupted', 'developing', 'caries', 'wear', 'fragmented', 'pathology', 'not_observable']);
const STATUS_VALUES = new Set(['present', 'absent', 'fragmentary', 'indeterminate', 'not_observable', 'not_recorded']);
const PRESERVATION_VALUES = new Set(['not_evaluated', 'excellent', 'good', 'regular', 'poor', 'very_poor', 'very_fragmented', 'not_evaluable']);
const REGION_VALUES = new Set(['all', 'Cráneo', 'Columna', 'Tórax', 'Cintura escapular', 'Extremidad superior', 'Extremidad inferior', 'Manos', 'Pies', 'Pelvis']);

function objectEntries(value) { return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []; }
function normalizeEnumMap(value, allowed) { return Object.fromEntries(objectEntries(value).filter(([, item]) => allowed.has(item))); }
function normalizeNumberMap(value, { min = 0, max = Number.POSITIVE_INFINITY, integer = false, rejectBelowMin = false } = {}) { return Object.fromEntries(objectEntries(value).filter(([, item]) => (typeof item === 'number' || typeof item === 'string') && String(item).trim() !== '').map(([key, item]) => [key, Number(item)]).filter(([, item]) => Number.isFinite(item) && (!rejectBelowMin || item >= min)).map(([key, item]) => [key, Math.max(min, Math.min(max, integer ? Math.floor(item) : item))])); }
function normalizeStringMap(value) { return Object.fromEntries(objectEntries(value).map(([key, item]) => [key, String(item ?? '').trim()]).filter(([, item]) => item)); }
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
    side: ['all', 'left', 'right', 'Izquierda', 'Derecha', '—'].includes(source.side) ? source.side : 'all',
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

export function normalizeProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) return null;
  const report = { individual: 'IND-LOCAL', burial: '', grave: '', tomb: '', ue: '', sector: '', grid: '', site: '', campaign: '', date: '', context: '', chronology: '', investigator: '', observations: '', sources: '', method: '', limits: '', ...(project.report && typeof project.report === 'object' ? project.report : {}) };
  return {
    ...project,
    id: project.id || 'default',
    projectName: project.projectName || 'Proyecto sin título',
    schemaVersion: PROJECT_SCHEMA_VERSION,
    profile: PROFILE_IDS.has(project.profile) ? project.profile : 'adult_male',
    selected: project.selected || 'skull',
    status: normalizeEnumMap(project.status, STATUS_VALUES),
    preservation: normalizeEnumMap(project.preservation, PRESERVATION_VALUES),
    completeness: normalizeNumberMap(project.completeness, { min: 0, max: 100 }),
    fragments: normalizeNumberMap(project.fragments, { min: 0, integer: true }),
    weights: normalizeNumberMap(project.weights, { rejectBelowMin: true }),
    weightUnits: Object.fromEntries(objectEntries(project.weightUnits).filter(([, unit]) => ['g', 'kg'].includes(String(unit).toLowerCase())).map(([key, unit]) => [key, String(unit).toLowerCase()])),
    portions: project.portions || {},
    portionRecords: project.portionRecords || {},
    individuals: normalizeStringMap(project.individuals),
    ue: normalizeStringMap(project.ue),
    taphonomy: Object.fromEntries(objectEntries(project.taphonomy).map(([key, item]) => [key, Array.isArray(item) ? item.map(value => String(value ?? '').trim()).filter(Boolean) : []]).filter(([, item]) => item.length)),
    pathology: Object.fromEntries(objectEntries(project.pathology).map(([key, item]) => [key, Array.isArray(item) ? item.map(value => String(value ?? '').trim()).filter(Boolean) : []]).filter(([, item]) => item.length)),
    taphonomyDetails: project.taphonomyDetails || {},
    pathologyDetails: project.pathologyDetails || {},
    notes: normalizeStringMap(project.notes),
    indeterminateFragments: Array.isArray(project.indeterminateFragments) ? project.indeterminateFragments : [],
    locked: Object.fromEntries(objectEntries(project.locked).filter(([, item]) => Boolean(item)).map(([key]) => [key, true])),
    hidden: Object.fromEntries(objectEntries(project.hidden).filter(([, item]) => Boolean(item)).map(([key]) => [key, true])),
    opacity: project.opacity || {},
    opacityScope: ['bone', 'region', 'skeleton'].includes(project.opacityScope) ? project.opacityScope : 'bone',
    skeletonFilter: ['all', 'axial', 'appendicular'].includes(project.skeletonFilter) ? project.skeletonFilter : 'all',
    regionFilter: typeof project.regionFilter === 'string' ? project.regionFilter : 'all',
    explosion: Math.max(0, Math.min(100, Number(project.explosion) || 0)),
    tableMode: Boolean(project.tableMode),
    orthographic: Boolean(project.orthographic),
    isolate: Boolean(project.isolate),
    explosionAnimating: false,
    wireframe: Boolean(project.wireframe),
    xray: Boolean(project.xray),
    labelMode: ['selected', 'region', 'all', 'none'].includes(project.labelMode) ? project.labelMode : 'selected',
    colorByRegion: project.colorByRegion !== false,
    comparisonProfile: project.comparisonProfile || '',
    customModels: normalizeCustomModels(project.customModels),
    tableTransforms: project.tableTransforms || {},
    lightIntensity: Number.isFinite(project.lightIntensity) ? project.lightIntensity : 1,
    ambientLightIntensity: Number.isFinite(project.ambientLightIntensity) ? project.ambientLightIntensity : 1,
    lightingAzimuth: Number.isFinite(project.lightingAzimuth) ? project.lightingAzimuth : 30,
    lightingElevation: Number.isFinite(project.lightingElevation) ? project.lightingElevation : 55,
    lightingMode: ['neutral', 'laboratory', 'high_contrast'].includes(project.lightingMode) ? project.lightingMode : 'neutral',
    changeLog: Array.isArray(project.changeLog) ? project.changeLog : [],
    dental: normalizeDental(project.dental),
    deciduousDental: normalizeDental(project.deciduousDental),
    dentitionType: ['permanent', 'deciduous'].includes(project.dentitionType) ? project.dentitionType : 'permanent',
    measurements: project.measurements || {},
    landmarks: project.landmarks || {},
    calibrations: project.calibrations || {},
    landmarkModelRefs: project.landmarkModelRefs || {},
    photos: normalizePhotos(project.photos),
    language: ['es', 'en'].includes(project.language) ? project.language : 'es',
    filters: normalizeFilters(project.filters),
    report,
    hierarchy: deriveHierarchy({ ...project, report })
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
