export const MODEL_MANIFEST_SCHEMA = 1;

const ASSET_STATUSES = new Set(['placeholder', 'ready', 'partial']);

export function validateModelManifest(manifest, boneIds = []) {
  const errors = [];
  if (!manifest || manifest.schema_version !== MODEL_MANIFEST_SCHEMA) errors.push('schema_version no compatible');
  if (!manifest?.profiles || typeof manifest.profiles !== 'object') errors.push('falta profiles');
  if (!manifest?.bone_asset_pattern) errors.push('falta bone_asset_pattern');
  if (!Array.isArray(manifest?.required_metadata) || !manifest.required_metadata.includes('license')) errors.push('required_metadata debe exigir license');
  for (const [profileId, profile] of Object.entries(manifest?.profiles || {})) {
    if (!profile.root) errors.push(`${profileId}: falta root`);
    if (!ASSET_STATUSES.has(profile.asset_status)) errors.push(`${profileId}: asset_status no válido`);
  }
  const expectedProfiles = ['adult_male', 'adult_female', 'infant', 'neonate'];
  for (const profileId of expectedProfiles) if (!manifest?.profiles?.[profileId]) errors.push(`falta perfil ${profileId}`);
  return { valid: errors.length === 0, errors, profileCount: Object.keys(manifest?.profiles || {}).length, boneCount: boneIds.length };
}

export function modelPackageSummary(manifest, profileId, boneIds = []) {
  const profile = manifest?.profiles?.[profileId];
  if (!profile) return { profileId, status: 'missing', expected: boneIds.length, pattern: null };
  return {
    profileId,
    status: profile.asset_status,
    expected: boneIds.length,
    pattern: String(manifest.bone_asset_pattern || '').replace('{profile}', profileId),
    requiredMetadata: manifest.required_metadata || []
  };
}
