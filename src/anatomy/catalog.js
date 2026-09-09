export const PROFILE_CATALOG = {
  adult_male: { label: 'Adulto masculino', root: './models/adult_male', status: 'mixed' },
  adult_female: { label: 'Adulto femenino', root: './models/adult_female', status: 'schematic' },
  infant: { label: 'Infante', root: './models/infant', status: 'schematic' },
  neonate: { label: 'Neonato', root: './models/neonate', status: 'schematic' }
};

export function profileCatalog(profileId) {
  return PROFILE_CATALOG[profileId] || PROFILE_CATALOG.adult_male;
}

export function modelPath(profileId, boneId) {
  return `${profileCatalog(profileId).root}/${boneId}.glb`;
}
