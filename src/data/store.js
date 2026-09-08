const DB_NAME = 'osteo3d';
export const PROJECT_SCHEMA_VERSION = 2;
const DB_VERSION = 2;
const STORE = 'projects';
const PROFILE_IDS = new Set(['adult_male', 'adult_female', 'infant', 'neonate']);
const DENTAL_STATUSES = new Set(['present', 'absent_am', 'absent_pm', 'unerupted', 'developing', 'caries', 'wear', 'fragmented', 'pathology', 'not_observable']);

function normalizeDental(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, status]) => DENTAL_STATUSES.has(status)));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readFallbackProject() {
  try {
    return normalizeProject(JSON.parse(localStorage.getItem('osteo3d-mvp') || 'null'));
  } catch {
    return null;
  }
}

export function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;
  return {
    ...project,
    id: project.id || 'default',
    projectName: project.projectName || 'Proyecto sin título',
    schemaVersion: PROJECT_SCHEMA_VERSION,
    profile: PROFILE_IDS.has(project.profile) ? project.profile : 'adult_male',
    selected: project.selected || 'skull',
    status: project.status || {},
    preservation: project.preservation || {},
    completeness: project.completeness || {},
    fragments: project.fragments || {},
    weights: project.weights || {},
    portions: project.portions || {},
    individuals: project.individuals || {},
    ue: project.ue || {},
    taphonomy: project.taphonomy || {},
    pathology: project.pathology || {},
    notes: project.notes || {},
    indeterminateFragments: Array.isArray(project.indeterminateFragments) ? project.indeterminateFragments : [],
    locked: project.locked || {},
    hidden: project.hidden || {},
    opacity: project.opacity || {},
    opacityScope: ['bone', 'region', 'skeleton'].includes(project.opacityScope) ? project.opacityScope : 'bone',
    wireframe: Boolean(project.wireframe),
    xray: Boolean(project.xray),
    labelMode: ['selected', 'region', 'all', 'none'].includes(project.labelMode) ? project.labelMode : 'selected',
    colorByRegion: project.colorByRegion !== false,
    comparisonProfile: project.comparisonProfile || '',
    tableTransforms: project.tableTransforms || {},
    lightIntensity: Number.isFinite(project.lightIntensity) ? project.lightIntensity : 1,
    changeLog: Array.isArray(project.changeLog) ? project.changeLog : [],
    dental: normalizeDental(project.dental),
    deciduousDental: normalizeDental(project.deciduousDental),
    dentitionType: ['permanent', 'deciduous'].includes(project.dentitionType) ? project.dentitionType : 'permanent',
    measurements: project.measurements || {},
    landmarks: project.landmarks || {},
    photos: project.photos || {},
    language: ['es', 'en'].includes(project.language) ? project.language : 'es',
    filters: { status: 'all', region: 'all', side: 'all', taphonomy: 'all', pathology: 'all', ...(project.filters && typeof project.filters === 'object' ? project.filters : {}) },
    report: { individual: 'IND-LOCAL', site: '', context: '', investigator: '', ...(project.report && typeof project.report === 'object' ? project.report : {}) }
  };
}

export async function saveProject(project) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(normalizeProject(project));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadProject(id) {
  try {
    const db = await openDatabase();
    const result = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return normalizeProject(result) || readFallbackProject();
  } catch {
    return readFallbackProject();
  }
}

export async function listProjects() {
  try {
    const db = await openDatabase();
    const result = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const projects = result.map(normalizeProject).filter(Boolean).sort((a, b) => String(a.projectName || a.id).localeCompare(String(b.projectName || b.id), 'es'));
    return projects.length ? projects : (readFallbackProject() ? [readFallbackProject()] : []);
  } catch {
    const fallback = readFallbackProject();
    return fallback ? [fallback] : [];
  }
}
