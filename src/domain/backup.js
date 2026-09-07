const BACKUP_VERSION = 1;

export function createBackup(state) {
  return {
    format: 'osteo3d-project-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: structuredClone({
      profile: state.profile,
      status: state.status,
      preservation: state.preservation,
      completeness: state.completeness,
      fragments: state.fragments,
      portions: state.portions,
      individuals: state.individuals,
      taphonomy: state.taphonomy,
      pathology: state.pathology,
      notes: state.notes,
      locked: state.locked,
      dental: state.dental,
      deciduousDental: state.deciduousDental,
      dentitionType: state.dentitionType,
      measurements: state.measurements,
      landmarks: state.landmarks,
      photos: state.photos,
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
  const accepted = rows.filter(row => known.has(row.Bone_ID));
  const status = { ...(project.status || {}) };
  const preservation = { ...(project.preservation || {}) };
  const completeness = { ...(project.completeness || {}) };
  const fragments = { ...(project.fragments || {}) };
  const portions = { ...(project.portions || {}) };
  const individuals = { ...(project.individuals || {}) };
  const taphonomy = { ...(project.taphonomy || {}) };
  const pathology = { ...(project.pathology || {}) };
  accepted.forEach(row => {
    status[row.Bone_ID] = row.Presence || row.Status || 'not_recorded';
    preservation[row.Bone_ID] = row.Preservation || 'not_evaluated';
    completeness[row.Bone_ID] = Math.max(0, Math.min(100, Number(row.Percentage || row.Completeness || 100)));
    fragments[row.Bone_ID] = Math.max(0, Number(row.Fragments || 0));
    if (row.Portion) portions[row.Bone_ID] = row.Portion;
    if (row.Individual_ID || row.Individual) individuals[row.Bone_ID] = row.Individual_ID || row.Individual;
    if (row.Taphonomy) taphonomy[row.Bone_ID] = String(row.Taphonomy).split(';').map(value => value.trim()).filter(Boolean);
    if (row.Pathology) pathology[row.Bone_ID] = String(row.Pathology).split(';').map(value => value.trim()).filter(Boolean);
  });
  return { ...project, status, preservation, completeness, fragments, portions, individuals, taphonomy, pathology, importedRows: accepted.length };
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
