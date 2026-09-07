const LONG_BONE_TYPES = new Set(['long_bone']);

const LONG_BONE_OPTIONS = [
  ['whole', 'Completo'],
  ['epiphysis_proximal', 'Epífisis proximal'],
  ['shaft_proximal', 'Diáfisis proximal'],
  ['shaft_mid', 'Diáfisis media'],
  ['shaft_distal', 'Diáfisis distal'],
  ['epiphysis_distal', 'Epífisis distal'],
  ['indeterminate', 'Indeterminada']
];

const RIB_OPTIONS = [
  ['whole', 'Completa'],
  ['vertebral_end', 'Extremo vertebral'],
  ['shaft', 'Cuerpo'],
  ['sternal_end', 'Extremo esternal'],
  ['indeterminate', 'Indeterminada']
];

const GENERAL_OPTIONS = [
  ['whole', 'Completo'],
  ['partial', 'Parcial'],
  ['indeterminate', 'Indeterminada']
];

export function portionOptionsForBone(bone = {}) {
  if (LONG_BONE_TYPES.has(bone.type)) return LONG_BONE_OPTIONS;
  if (bone.type === 'rib') return RIB_OPTIONS;
  return GENERAL_OPTIONS;
}

export function portionLabel(value) {
  return [...LONG_BONE_OPTIONS, ...RIB_OPTIONS, ...GENERAL_OPTIONS].find(([key]) => key === value)?.[1] || value || '—';
}
