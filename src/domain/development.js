// Developmental components are an observation register, not an age estimator.
// The catalogue deliberately avoids asserting an ossification age or diagnosis.
const LONG_BONES = new Set(['humerus', 'radius', 'ulna', 'femur', 'tibia', 'fibula']);
const COMPONENTS = Object.freeze({
  shaft: { es: 'Diáfisis', en: 'Shaft' },
  proximal_epiphysis: { es: 'Epífisis proximal', en: 'Proximal epiphysis' },
  distal_epiphysis: { es: 'Epífisis distal', en: 'Distal epiphysis' },
  sternal_epiphysis: { es: 'Epífisis esternal', en: 'Sternal epiphysis' },
  centrum: { es: 'Cuerpo vertebral', en: 'Vertebral centrum' },
  neural_arch: { es: 'Arco neural', en: 'Neural arch' },
  ilium: { es: 'Ilion', en: 'Ilium' },
  ischium: { es: 'Isquion', en: 'Ischium' },
  pubis: { es: 'Pubis', en: 'Pubis' },
  frontal: { es: 'Frontal', en: 'Frontal' },
  parietal: { es: 'Parietal', en: 'Parietal' },
  occipital: { es: 'Occipital', en: 'Occipital' }
});
const OSSIFICATION_REFERENCES = Object.freeze({
  distal_humerus: [
    { es: 'Capitulum', en: 'Capitulum', appearance: '0–1 años', fusion: '10–15 años', source: 'PMC5782864' },
    { es: 'Epicóndilo medial', en: 'Medial epicondyle', appearance: '2–8 años', fusion: '13–17 años', source: 'PMC5782864' },
    { es: 'Tróclea', en: 'Trochlea', appearance: '5–11 años', fusion: '10–18 años', source: 'PMC5782864' },
    { es: 'Epicóndilo lateral', en: 'Lateral epicondyle', appearance: '8–13 años', fusion: '12–16 años', source: 'PMC5782864' }
  ],
  proximal_radius: [{ es: 'Cabeza del radio', en: 'Radial head', appearance: '2–6 años', fusion: '12–16 años', source: 'PMC5782864' }],
  proximal_ulna: [{ es: 'Olécranon', en: 'Olecranon', appearance: '6–11 años', fusion: '13–16 años', source: 'PMC5782864' }],
  capitate: [{ es: 'Grande', en: 'Capitate', appearance: '2.º–4.º mes', fusion: '—', source: 'PMC4266871' }],
  hamate: [{ es: 'Ganchoso', en: 'Hamate', appearance: '2.º–4.º mes', fusion: '—', source: 'PMC4266871' }],
  pisiform: [{ es: 'Pisiforme', en: 'Pisiform', appearance: '9–12 años', fusion: '—', source: 'PMC4266871' }]
});
const STATUSES = new Set(['present', 'absent', 'fragmentary', 'indeterminate', 'not_observable', 'not_recorded']);
const FUSION = new Set(['not_recorded', 'unfused', 'partial', 'fused', 'not_observable']);
const text = value => String(value ?? '').trim();

export function developmentComponentsForBone(bone = {}) {
  const id = text(bone.id), base = id.replace(/^(left|right)_/, '');
  if (LONG_BONES.has(base)) return ['shaft', 'proximal_epiphysis', 'distal_epiphysis'];
  if (base === 'clavicle') return ['shaft', 'sternal_epiphysis'];
  if (/^(c[1-7]|t(?:[1-9]|1[0-2])|l[1-5]|sacrum|coccyx)$/.test(base)) return ['centrum', 'neural_arch'];
  if (base === 'coxal') return ['ilium', 'ischium', 'pubis'];
  if (base === 'skull') return ['frontal', 'parietal', 'occipital'];
  return [];
}

export function ossificationReferencesForBone(bone = {}) {
  const base = text(bone.id).replace(/^(left|right)_/, '');
  if (base === 'humerus') return OSSIFICATION_REFERENCES.distal_humerus;
  if (base === 'radius') return OSSIFICATION_REFERENCES.proximal_radius;
  if (base === 'ulna') return OSSIFICATION_REFERENCES.proximal_ulna;
  return OSSIFICATION_REFERENCES[base] || [];
}

export function normalizeDevelopmentRecords(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [boneId, records] of Object.entries(value)) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) continue;
    const normalized = {};
    for (const [componentId, record] of Object.entries(records)) {
      if (!COMPONENTS[componentId] || !record || typeof record !== 'object' || Array.isArray(record)) continue;
      const status = STATUSES.has(record.status) ? record.status : 'not_recorded';
      const fusion = FUSION.has(record.fusion) ? record.fusion : 'not_recorded';
      const completeness = Number(record.completeness);
      const next = { status, fusion, observation: text(record.observation) };
      if (Number.isFinite(completeness)) next.completeness = Math.max(0, Math.min(100, completeness));
      if (next.status !== 'not_recorded' || next.fusion !== 'not_recorded' || next.observation || next.completeness != null) normalized[componentId] = next;
    }
    if (Object.keys(normalized).length) result[boneId] = normalized;
  }
  return result;
}

export function developmentComponentLabel(id, language = 'es') { return COMPONENTS[id]?.[language === 'en' ? 'en' : 'es'] || id; }
export const developmentStatusValues = Object.freeze([...STATUSES]);
export const developmentFusionValues = Object.freeze([...FUSION]);
