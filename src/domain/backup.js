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
      status: state.status,
      preservation: state.preservation,
      completeness: state.completeness,
      fragments: state.fragments,
      weights: state.weights,
      portions: state.portions,
      individuals: state.individuals,
      taphonomy: state.taphonomy,
      pathology: state.pathology,
      notes: state.notes,
      indeterminateFragments: state.indeterminateFragments,
      locked: state.locked,
      hidden: state.hidden,
      opacity: state.opacity,
      opacityScope: state.opacityScope,
      wireframe: state.wireframe,
      xray: state.xray,
      labelMode: state.labelMode,
      tableTransforms: state.tableTransforms,
      lightIntensity: state.lightIntensity,
      changeLog: state.changeLog,
      dental: state.dental,
      deciduousDental: state.deciduousDental,
      dentitionType: state.dentitionType,
      measurements: state.measurements,
      landmarks: state.landmarks,
      photos: state.photos,
      photoScope: state.photoScope || 'bone',
      photoTargetId: state.photoTargetId || '',
      language: state.language || 'es',
      filters: state.filters || { status: 'all', region: 'all', side: 'all', taphonomy: 'all', pathology: 'all' },
      report: state.report
    })
  };
}

export function validateBackup(value) {
  if (!value || value.format !== 'osteo3d-project-backup') throw new Error('El archivo no es una copia de Osteo3D.');
  if (value.version !== BACKUP_VERSION) throw new Error(`Versión de copia no compatible: ${value.version}.`);
  if (!value.project || typeof value.project !== 'object') throw new Error('La copia no contiene un proyecto válido.');
  if (value.project.status && typeof value.project.status !== 'object') throw new Error('El inventario no tiene un formato válido.');
  return value.project;
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('El CSV no contiene registros.');
  const parseLine = line => {
    const values = [];
    let value = '', quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { values.push(value); value = ''; }
      else value += char;
    }
    values.push(value);
    return values;
  };
  const headers = parseLine(lines[0]).map(header => header.trim());
  return lines.slice(1).map(line => Object.fromEntries(parseLine(line).map((value, index) => [headers[index], value])));
}

export function applyInventoryRows(project, rows, bones) {
  const known = new Set(bones.map(bone => bone.id));
  const accepted = rows.filter(row => known.has(String(row.Bone_ID || '').trim()));
  const status = { ...(project.status || {}) };
  const preservation = { ...(project.preservation || {}) };
  const completeness = { ...(project.completeness || {}) };
  const fragments = { ...(project.fragments || {}) };
  const weights = { ...(project.weights || {}) };
  const portions = { ...(project.portions || {}) };
  const individuals = { ...(project.individuals || {}) };
  const taphonomy = { ...(project.taphonomy || {}) };
  const pathology = { ...(project.pathology || {}) };
  accepted.forEach(row => {
    const boneId = String(row.Bone_ID).trim();
    const importedStatus = row.Presence || row.Status || 'not_recorded';
    const importedPreservation = row.Preservation || 'not_evaluated';
    const importedCompleteness = Number(row.Percentage ?? row.Completeness ?? 100);
    const importedFragments = Number(row.Fragments ?? 0);
    const importedWeight = Number(row.Weight_g ?? row.Weight ?? '');
    status[boneId] = ['present', 'absent', 'fragmentary', 'indeterminate', 'not_observable', 'not_recorded'].includes(importedStatus) ? importedStatus : 'not_recorded';
    preservation[boneId] = ['not_evaluated', 'excellent', 'good', 'regular', 'poor', 'very_poor'].includes(importedPreservation) ? importedPreservation : 'not_evaluated';
    completeness[boneId] = Number.isFinite(importedCompleteness) ? Math.max(0, Math.min(100, importedCompleteness)) : 100;
    fragments[boneId] = Number.isFinite(importedFragments) ? Math.max(0, Math.floor(importedFragments)) : 0;
    if (Number.isFinite(importedWeight) && importedWeight >= 0) weights[boneId] = importedWeight;
    if (row.Portion) portions[boneId] = String(row.Portion).trim();
    if (row.Individual_ID || row.Individual) individuals[boneId] = String(row.Individual_ID || row.Individual).trim();
    if (row.Taphonomy) taphonomy[boneId] = String(row.Taphonomy).split(';').map(value => value.trim()).filter(Boolean);
    if (row.Pathology) pathology[boneId] = String(row.Pathology).split(';').map(value => value.trim()).filter(Boolean);
  });
  return { ...project, status, preservation, completeness, fragments, weights, portions, individuals, taphonomy, pathology, importedRows: accepted.length, rejectedRows: rows.length - accepted.length };
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
