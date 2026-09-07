/**
 * Transparent osteoarchaeological summaries.
 * These functions deliberately expose their inputs and method instead of
 * hiding scientific assumptions inside the UI.
 */
export function inventoryRows(bones, state) {
  return bones.map(bone => ({
    boneId: bone.id,
    name: bone.es,
    region: bone.region,
    side: bone.side,
    status: state.status?.[bone.id] || 'not_recorded',
    fragments: Math.max(0, Number(state.fragments?.[bone.id] || 0)),
    weight: Number.isFinite(Number(state.weights?.[bone.id])) ? Math.max(0, Number(state.weights[bone.id])) : null,
    portion: state.portions?.[bone.id] || 'whole',
    individual: state.individuals?.[bone.id] || state.report?.individual || 'IND-LOCAL',
    taphonomy: state.taphonomy?.[bone.id] || [],
    pathology: state.pathology?.[bone.id] || [],
    completeness: state.completeness?.[bone.id] ?? 100
  }));
}

export function calculateNisp(rows) {
  const identified = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const byRegion = Object.fromEntries([...new Set(rows.map(row => row.region))].map(region => [
    region,
    identified.filter(row => row.region === region).length
  ]));
  const bySide = Object.fromEntries([...new Set(rows.map(row => row.side))].map(side => [
    side,
    identified.filter(row => row.side === side).length
  ]));
  return {
    value: identified.length,
    byRegion,
    bySide,
    method: 'Cuenta de registros identificados con estado presente o fragmentario; no equivale a huesos completos.'
  };
}

export function calculateMne(rows) {
  const identified = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const groups = new Map();
  for (const row of identified) {
    const key = `${row.boneId}|${row.side}|${row.portion}`;
    const observed = Math.max(1, row.fragments || 1);
    groups.set(key, Math.max(groups.get(key) || 0, observed));
  }
  return {
    value: [...groups.values()].reduce((sum, value) => sum + value, 0),
    groups: Object.fromEntries(groups),
    method: 'Máximo de fragmentos observados por elemento, lateralidad y porción; requiere revisión manual cuando haya solapamiento anatómico.'
  };
}

export function calculateMni(rows) {
  const identified = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const groups = new Map();
  for (const row of identified) {
    const key = `${row.boneId}|${row.side}`;
    const individuals = Math.max(1, Number(row.fragments || 1));
    groups.set(key, Math.max(groups.get(key) || 0, individuals));
  }
  const value = identified.length ? Math.max(1, ...groups.values()) : 0;
  return {
    value,
    groups: Object.fromEntries(groups),
    method: 'Máximo número de unidades incompatibles registradas por elemento y lateralidad; es un cribado transparente, no una inferencia automática definitiva.'
  };
}

export function calculateIndividualQuantification(rows) {
  const identified = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const groups = new Map();
  for (const row of identified) {
    const individual = row.individual || 'IND-LOCAL';
    const entry = groups.get(individual) || { individual, nisp: 0, fragments: 0, elements: new Set(), regions: new Set() };
    entry.nisp += 1;
    entry.fragments += Math.max(1, row.fragments || 1);
    entry.elements.add(row.boneId);
    entry.regions.add(row.region);
    groups.set(individual, entry);
  }
  const groupedRows = [...groups.values()].map(entry => ({
    individual: entry.individual,
    nisp: entry.nisp,
    fragments: entry.fragments,
    elements: [...entry.elements],
    regions: [...entry.regions]
  }));
  return {
    value: groupedRows.length,
    rows: groupedRows,
    method: 'Agrupa los registros identificados por el ID de individuo explícito; no resuelve por sí solo duplicación ni asociación estratigráfica.'
  };
}

export function calculateOsteoAnalysis(bones, state) {
  const rows = inventoryRows(bones, state);
  return { nisp: calculateNisp(rows), mne: calculateMne(rows), mni: calculateMni(rows), individuals: calculateIndividualQuantification(rows), rows };
}
