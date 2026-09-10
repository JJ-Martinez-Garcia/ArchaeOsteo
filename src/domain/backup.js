import { normalizeProject } from '../data/store.js';
import { normalizeDevelopmentRecords } from './development.js';
import { normalizePortionRecords } from './portion-records.js';
export { parseCsv } from './csv.js';

const BACKUP_VERSION = 1;

export function createBackup(state) {
  return {
    format: 'osteo3d-project-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: structuredClone({
      id: state.projectId || state.id || 'default',
      projectName: state.projectName || 'Proyecto sin título',
      schemaVersion: state.schemaVersion,
      profile: state.profile,
      selected: state.selected,
      skeletonFilter: state.skeletonFilter,
      regionFilter: state.regionFilter,
      explosion: state.explosion,
      tableMode: state.tableMode,
      orthographic: state.orthographic,
      isolate: state.isolate,
      status: state.status,
      preservation: state.preservation,
      completeness: state.completeness,
      fragments: state.fragments,
      weights: state.weights,
      weightUnits: state.weightUnits,
      portions: state.portions,
      portionRecords: state.portionRecords,
      developmentRecords: state.developmentRecords,
      hierarchyRefs: state.hierarchyRefs,
      individuals: state.individuals,
      specimens: state.specimens,
      ue: state.ue,
      taphonomy: state.taphonomy,
      pathology: state.pathology,
      taphonomyDetails: state.taphonomyDetails,
      pathologyDetails: state.pathologyDetails,
      notes: state.notes,
      indeterminateFragments: state.indeterminateFragments,
      locked: state.locked,
      hidden: state.hidden,
      opacity: state.opacity,
      opacityScope: state.opacityScope,
      wireframe: state.wireframe,
      xray: state.xray,
      labelMode: state.labelMode,
      colorByRegion: state.colorByRegion,
      comparisonProfile: state.comparisonProfile || '',
      customModels: state.customModels,
      geometryMode: state.geometryMode || 'auto',
      analysisReview: state.analysisReview || {},
      tableTransforms: state.tableTransforms,
      lightIntensity: state.lightIntensity,
      ambientLightIntensity: state.ambientLightIntensity,
      lightingAzimuth: state.lightingAzimuth,
      lightingElevation: state.lightingElevation,
      lightingMode: state.lightingMode,
      cameraView: state.cameraView || null,
      changeLog: state.changeLog,
      dental: state.dental,
      deciduousDental: state.deciduousDental,
      dentitionType: state.dentitionType,
      measurements: state.measurements,
      landmarks: state.landmarks,
      calibrations: state.calibrations,
      landmarkModelRefs: state.landmarkModelRefs,
      photos: state.photos,
      photoScope: state.photoScope || 'bone',
      photoTargetId: state.photoTargetId || '',
      language: state.language || 'es',
      filters: state.filters || { status: 'all', region: 'all', side: 'all', taphonomy: 'all', pathology: 'all', preservation: 'all', type: 'all' },
      report: state.report,
      hierarchy: state.hierarchy
    })
  };
}

export function validateBackup(value) {
  if (!value || value.format !== 'osteo3d-project-backup') throw new Error('El archivo no es una copia de Osteo3D.');
  if (value.version !== BACKUP_VERSION) throw new Error(`Versión de copia no compatible: ${value.version}.`);
  if (!value.project || typeof value.project !== 'object' || Array.isArray(value.project)) throw new Error('La copia no contiene un proyecto válido.');
  if (value.project.status && (typeof value.project.status !== 'object' || Array.isArray(value.project.status))) throw new Error('El inventario no tiene un formato válido.');
  return normalizeProject(value.project);
}

// A spreadsheet import merges non-empty cells only. Unknown is not zero and
// blank cells do not erase existing observations. JSON restores are separate.
const INVENTORY_FIELDS = {
  status: ['Presence', 'Status'], preservation: ['Preservation'],
  completeness: ['Percentage', 'Completeness'], fragments: ['Fragments'],
  weights: ['Weight_g', 'Weight'], portions: ['Portion'], portionRecords: ['Portion_records', 'PortionRecords'],
  individuals: ['Individual_ID', 'Individual'], specimens: ['Specimen_ID', 'Specimen'], ue: ['UE', 'Context_UE'],
  taphonomy: ['Taphonomy'], pathology: ['Pathology'],
  taphonomyDetails: ['Taphonomy_Detail'], pathologyDetails: ['Pathology_Detail'],
  notes: ['Notes', 'Observations'], developmentRecords: ['Development_records', 'Development'], hierarchyRefs: ['Hierarchy_refs', 'HierarchyRefs']
};
const nonempty = value => value != null && String(value).trim() !== '';
const cell = (row, columns) => columns.map(key => row?.[key]).find(nonempty);

export function applyInventoryRows(project, rows, bones) {
  const known = new Set(bones.map(bone => bone.id));
  const validStatuses = new Set(['present', 'absent', 'fragmentary', 'indeterminate', 'not_observable', 'not_recorded']);
  const validPreservation = new Set(['not_evaluated', 'excellent', 'good', 'regular', 'poor', 'very_poor', 'very_fragmented', 'not_evaluable']);
  const validationErrors = [], accepted = [];
  const seen = new Set();
  const maps = Object.fromEntries(Object.keys(INVENTORY_FIELDS).map(key => [key, { ...(project[key] || {}) }]));
  for (const [index, row] of rows.entries()) {
    const boneId = String(row?.Bone_ID || '').trim(), errors = [], changes = {};
    if (!boneId) errors.push('Bone_ID vacío');
    else if (!known.has(boneId)) errors.push(`Bone_ID desconocido: ${boneId}`);
    else if (seen.has(boneId)) errors.push(`Bone_ID duplicado: ${boneId}`);
    else if (project.locked?.[boneId]) errors.push('Registro bloqueado: desbloquéalo antes de importar cambios');
    if (boneId) seen.add(boneId);
    for (const [field, columns] of Object.entries(INVENTORY_FIELDS)) {
      const raw = cell(row, columns);
      if (!nonempty(raw)) continue;
      let value = String(raw).trim();
      if (field === 'status' && !validStatuses.has(value)) errors.push(`Presence no válido: ${value}`);
      if (field === 'preservation' && !validPreservation.has(value)) errors.push(`Preservation no válida: ${value}`);
      if (['completeness', 'fragments', 'weights'].includes(field)) {
        value = Number(value);
        if (!Number.isFinite(value) || value < 0 || (field === 'completeness' && value > 100) || (field === 'fragments' && !Number.isInteger(value))) errors.push(`${columns[0]} no válido: requiere ${field === 'fragments' ? 'un entero no negativo' : field === 'completeness' ? 'un número entre 0 y 100' : 'un número no negativo'}`);
      }
      if (field === 'taphonomy' || field === 'pathology') value = value.split(';').map(item => item.trim()).filter(Boolean);
      if (field === 'taphonomyDetails' || field === 'pathologyDetails') {
        try {
          value = JSON.parse(value);
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        } catch { errors.push(`${columns[0]} debe contener un objeto JSON válido`); }
      }
      if (field === 'portionRecords' || field === 'developmentRecords') {
        try { value = JSON.parse(value); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
        catch { errors.push(`${columns[0]} debe contener un objeto JSON válido`); }
      }
      if (field === 'hierarchyRefs') {
        try { value = JSON.parse(value); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
        catch { errors.push(`${columns[0]} debe contener un objeto JSON válido`); }
      }
      // Retain line breaks and whitespace within free-text notes.
      if (field === 'notes') value = String(raw);
      changes[field] = value;
    }
    if (errors.length) { validationErrors.push({ row: index + 2, boneId, errors }); continue; }
    for (const [field, value] of Object.entries(changes)) maps[field][boneId] = value;
    accepted.push(row);
  }
  const first = accepted[0] || {};
  const reportFields = { individual: cell(first, ['Individual_ID', 'Individual']), burial: first.Burial, grave: first.Grave, tomb: first.Tomb, ue: first.UE, sector: first.Sector, grid: first.Grid, site: first.Site, campaign: first.Campaign, date: first.Date, context: first.Context, chronology: first.Chronology, observations: first.Observations, sources: first.Sources, method: first.Method, limits: first.Limits };
  const importedReport = Object.fromEntries(Object.entries(reportFields).filter(([, value]) => nonempty(value)).map(([key, value]) => [key, String(value).trim()]));
  maps.developmentRecords = normalizeDevelopmentRecords(maps.developmentRecords);
  maps.portionRecords = normalizePortionRecords(maps.portionRecords);
  return { ...project, ...maps, report: { ...(project.report || {}), ...importedReport }, importedRows: accepted.length, rejectedRows: validationErrors.length, validationErrors };
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body?.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
}

export function downloadBlob(filename, bytes, type = 'application/octet-stream') {
  const blob = new Blob([bytes], { type });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.style.display = 'none'; document.body?.append(link); link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
}

export async function shareJson(filename, value, { title = 'Osteo3D', text = 'Copia de proyecto Osteo3D' } = {}) {
  const file = new File([JSON.stringify(value, null, 2)], filename, { type: 'application/json' });
  if (navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return 'shared';
      }
      await navigator.share({ title, text, url: window.location.href });
      return 'shared-link';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  downloadJson(filename, value);
  return 'downloaded';
}
