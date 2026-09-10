/**
 * Transparent osteoarchaeological summaries.
 * These functions deliberately expose their inputs and method instead of
 * hiding scientific assumptions inside the UI.
 */
import { weightToGrams } from './weights.js';
export function inventoryRows(bones, state) {
  return bones.map(bone => {
    const weightUnit = state.weightUnits?.[bone.id] === 'kg' ? 'kg' : 'g';
    const refs = state.hierarchyRefs?.[bone.id] || {};
    const hierarchyName = (level, id) => state.hierarchy?.[level]?.find(entity => entity.id === id)?.name || id;
    const individual = refs.individualId ? hierarchyName('individuals', refs.individualId) : state.individuals?.[bone.id] || state.report?.individual || 'IND-LOCAL';
    const context = refs.contextId ? hierarchyName('contexts', refs.contextId) : state.ue?.[bone.id] || state.report?.context || 'Sin contexto';
    return {
    boneId: bone.id,
    name: bone.es,
    region: bone.region,
    side: bone.side,
    status: state.status?.[bone.id] || 'not_recorded',
    fragments: state.fragments?.[bone.id] == null || !Number.isFinite(Number(state.fragments[bone.id])) ? null : Math.max(0, Number(state.fragments[bone.id])),
    weight: Number.isFinite(Number(state.weights?.[bone.id])) ? Math.max(0, Number(state.weights[bone.id])) : null,
    weightUnit,
    weightGrams: weightToGrams(state.weights?.[bone.id], weightUnit),
    portion: state.portions?.[bone.id] || 'whole',
    individual,
    specimenId: state.specimens?.[bone.id] || '',
    context,
    taphonomy: state.taphonomy?.[bone.id] || [],
    pathology: state.pathology?.[bone.id] || [],
    completeness: state.completeness?.[bone.id] == null || !Number.isFinite(Number(state.completeness[bone.id])) ? null : Number(state.completeness[bone.id])
    };
  });
}

export function calculateNisp(rows) {
  const identified = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const nispKey = row => row.specimenId ? `${row.specimenId}|${row.boneId}` : `record:${row.boneId}`;
  const count = subset => new Set(subset.map(nispKey)).size;
  const byRegion = Object.fromEntries([...new Set(rows.map(row => row.region))].map(region => [
    region,
    count(identified.filter(row => row.region === region))
  ]));
  const bySide = Object.fromEntries([...new Set(rows.map(row => row.side))].map(side => [
    side,
    count(identified.filter(row => row.side === side))
  ]));
  const byIndividual = Object.fromEntries([...new Set(identified.map(row => row.individual))].map(individual => [individual, count(identified.filter(row => row.individual === individual))]));
  const byContext = Object.fromEntries([...new Set(identified.map(row => row.context))].map(context => [context, count(identified.filter(row => row.context === context))]));
  return {
    value: count(identified),
    byRegion,
    bySide,
    byIndividual,
    byContext,
    method: 'Cuenta registros identificados con estado presente o fragmentario. Cuando existe Specimen_ID, agrupa el mismo espécimen por elemento; sin ese ID mantiene el recuento provisional de registros. No equivale a huesos completos.'
  };
}

export function calculateMne(rows) {
  const identified = rows.filter(row => row.boneId !== 'vertebrae' && !row.boneId.includes('indeterminate') && ['present', 'fragmentary'].includes(row.status));
  const groups = new Map();
  for (const row of identified) {
    const key = `${row.boneId}|${row.side}`;
    const people=groups.get(key)||new Set();
    if(row.individual && row.individual !== 'IND-LOCAL')people.add(row.individual);
    groups.set(key,people);
  }
  return {
    value: [...groups.values()].reduce((sum, people) => sum + Math.max(1,people.size), 0),
    groups: Object.fromEntries([...groups].map(([key,people])=>[key,Math.max(1,people.size)])),
    provisional: true,
    method: 'Mínimo provisional por elemento determinado y lado, según individuos asignados. Nunca convierte fragmentos en huesos. Excluye categorías agregadas/indeterminadas; no suma porciones ni contextos. Requiere análisis de solapamiento, remontaje y revisión especializada.'
  };
}

export function calculateMni(rows) {
  const identified = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const groups = new Map();
  for (const row of identified) {
    const key = `${row.boneId}|${row.side}`;
    const entry = groups.get(key) || { explicit: new Set(), fallback: 0 };
    const individual = String(row.individual || '').trim();
    if (individual && individual !== 'IND-LOCAL') entry.explicit.add(individual);
    else entry.fallback = 1;
    groups.set(key, entry);
  }
  const value = identified.length ? Math.max(...[...groups.values()].map(entry => entry.explicit.size || entry.fallback || 1)) : 0;
  return {
    value,
    groups: Object.fromEntries([...groups.entries()].map(([key, entry]) => [key, entry.explicit.size || entry.fallback || 1])),
    provisional: true,
    method: 'Mínimo provisional: máximo de individuos explícitos por combinación de elemento y lado. Sin asignación, solo indica al menos uno si hay restos identificados. Los fragmentos no incrementan el MNI. No estima duplicación anatómica, edad ni sexo; revisar las asociaciones de individuos.'
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
  const result={ nisp: calculateNisp(rows), mne: calculateMne(rows), mni: calculateMni(rows), individuals: calculateIndividualQuantification(rows), rows };
  const identifiedRows = rows.filter(row => ['present', 'fragmentary'].includes(row.status));
  const specimenRows = new Map();
  for (const row of identifiedRows) {
    if (!row.specimenId) continue;
    const entry = specimenRows.get(row.specimenId) || { individuals: new Set(), contexts: new Set() };
    if (row.individual && row.individual !== 'IND-LOCAL') entry.individuals.add(row.individual);
    if (row.context && row.context !== 'Sin contexto') entry.contexts.add(row.context);
    specimenRows.set(row.specimenId, entry);
  }
  result.specimenCoverage = {
    identified: identifiedRows.length,
    withSpecimenId: identifiedRows.filter(row => row.specimenId).length,
    withoutSpecimenId: identifiedRows.filter(row => !row.specimenId).length,
    uniqueSpecimenIds: specimenRows.size,
    conflicts: [...specimenRows].filter(([, entry]) => entry.individuals.size > 1 || entry.contexts.size > 1).map(([specimenId, entry]) => ({ specimenId, individuals: [...entry.individuals], contexts: [...entry.contexts] }))
  };
  const signature=JSON.stringify(rows);
  for(const key of ['nisp','mne','mni']){
    const review=state.analysisReview?.[key];
    result[key].automaticValue=result[key].value;
    result[key].provisional=true;
    if(review&&Number.isInteger(review.value)&&review.value>=0&&String(review.reason||'').trim()&&review.signature===signature){
      result[key].reviewStatus='current';
      result[key].value=review.value;result[key].provisional=false;
      result[key].method=`Revisión manual: ${review.reason}. Valor automático previo: ${result[key].automaticValue}. ${result[key].method}`;
      result[key].review={reason:review.reason,updatedAt:review.updatedAt};
    }else if(review){result[key].reviewStatus='stale';result[key].method+=' Revisión manual pendiente de actualizar: el inventario o la justificación ha cambiado.';}
    else result[key].reviewStatus='none';
  }
  return result;
}
