export const MODEL_MANIFEST_SCHEMA = 1;
export const MODEL_SOURCE_REGISTRY_SCHEMA = 1;
export const MODEL_PACKAGE_CACHE = 'osteo3d-models-v1';
export const CUSTOM_MODEL_CACHE = 'osteo3d-custom-models-v1';

const ASSET_STATUSES = new Set(['placeholder', 'ready', 'partial']);

function normalizeBoneIds(items = []) {
  return items.map(item => typeof item === 'string' ? item : item?.id).filter(id => typeof id === 'string' && id.length > 0);
}

export function glbNodeNames(body) {
  const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : body instanceof Uint8Array ? body : new Uint8Array(body || []);
  if (bytes.byteLength < 20 || new TextDecoder().decode(bytes.slice(0, 4)) !== 'glTF') return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== 2) return [];
  const jsonLength = view.getUint32(12, true);
  const chunkType = new TextDecoder().decode(bytes.slice(16, 20));
  if (chunkType !== 'JSON' || 20 + jsonLength > bytes.byteLength) return [];
  try {
    const json = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + jsonLength)));
    return Array.isArray(json.nodes) ? json.nodes.map(node => node?.name).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function glbContainsBoneId(body, boneId) {
  return glbNodeNames(body).includes(boneId);
}

export function validateModelManifest(manifest, boneIds = []) {
  const errors = [];
  if (!manifest || manifest.schema_version !== MODEL_MANIFEST_SCHEMA) errors.push('schema_version no compatible');
  if (!manifest?.profiles || typeof manifest.profiles !== 'object') errors.push('falta profiles');
  if (!manifest?.bone_asset_pattern) errors.push('falta bone_asset_pattern');
  else {
    if (!manifest.bone_asset_pattern.includes('{profile}')) errors.push('bone_asset_pattern debe incluir {profile}');
    if (!manifest.bone_asset_pattern.includes('{bone_id}')) errors.push('bone_asset_pattern debe incluir {bone_id}');
  }
  if (!Array.isArray(manifest?.required_metadata) || !manifest.required_metadata.includes('license')) errors.push('required_metadata debe exigir license');
  for (const [profileId, profile] of Object.entries(manifest?.profiles || {})) {
    if (!profile.root) errors.push(`${profileId}: falta root`);
    if (!ASSET_STATUSES.has(profile.asset_status)) errors.push(`${profileId}: asset_status no válido`);
    if (profile.asset_status === 'partial' && (!Array.isArray(profile.asset_ids) || profile.asset_ids.length === 0)) errors.push(`${profileId}: partial exige asset_ids`);
    if (Array.isArray(profile.asset_ids)) {
      if (new Set(profile.asset_ids).size !== profile.asset_ids.length) errors.push(`${profileId}: asset_ids contiene duplicados`);
      if (profile.asset_ids.some(id => typeof id !== 'string' || !id.trim())) errors.push(`${profileId}: asset_ids contiene identificadores inválidos`);
      if (Number.isInteger(profile.asset_count) && profile.asset_count !== profile.asset_ids.length) errors.push(`${profileId}: asset_count no coincide con asset_ids`);
    }
  }
  const expectedProfiles = ['adult_male', 'adult_female', 'infant', 'neonate'];
  for (const profileId of expectedProfiles) if (!manifest?.profiles?.[profileId]) errors.push(`falta perfil ${profileId}`);
  return { valid: errors.length === 0, errors, profileCount: Object.keys(manifest?.profiles || {}).length, boneCount: boneIds.length };
}

export function validateModelSourceRegistry(manifest, registry = {}) {
  const errors = [];
  if (!registry || registry.schema_version !== MODEL_SOURCE_REGISTRY_SCHEMA) errors.push('schema_version del registro no compatible');
  if (!registry?.profiles || typeof registry.profiles !== 'object' || Array.isArray(registry.profiles)) errors.push('falta profiles en el registro');
  const records = registry?.profiles && typeof registry.profiles === 'object' ? registry.profiles : {};
  for (const [profileId, profile] of Object.entries(manifest?.profiles || {})) {
    const source = records[profileId];
    if (!source) {
      errors.push(`${profileId}: falta registro de fuente`);
      continue;
    }
    if (!['pending', 'published'].includes(source.source_status)) errors.push(`${profileId}: source_status no válido`);
    if (profile.asset_status === 'placeholder' && source.source_status === 'pending') continue;
    for (const field of ['author', 'institution', 'url', 'license', 'version', 'consulted_at']) {
      if (!source[field]) errors.push(`${profileId}: falta ${field}`);
    }
    if (profile.asset_status === 'ready' && (!Number.isInteger(source.asset_count) || source.asset_count < 1)) {
      errors.push(`${profileId}: asset_count debe ser mayor que cero`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function modelPackageSummary(manifest, profileId, boneIds = []) {
  const profile = manifest?.profiles?.[profileId];
  const normalizedBoneIds = normalizeBoneIds(boneIds);
  if (!profile) return { profileId, status: 'missing', expected: normalizedBoneIds.length, pattern: null };
  const availableBoneIds = Array.isArray(profile.asset_ids) ? profile.asset_ids : [];
  return {
    profileId,
    status: profile.asset_status,
    expected: normalizedBoneIds.length,
    pattern: String(manifest.bone_asset_pattern || '').replace('{profile}', profileId),
    requiredMetadata: manifest.required_metadata || [],
    approximateSizeMb: Number.isFinite(profile.approximate_size_mb) ? profile.approximate_size_mb : null,
    availableBoneIds,
    availableCount: availableBoneIds.length,
    publishedCount: profile.asset_status === 'ready' ? normalizedBoneIds.length : availableBoneIds.length
  };
}

export function formatPackageSize(sizeMb) {
  return Number.isFinite(sizeMb) && sizeMb > 0 ? `aprox. ${sizeMb} MB` : 'no disponible';
}

export function modelPackageDownloadPlan(manifest, profileId, boneIds = []) {
  const summary = modelPackageSummary(manifest, profileId, boneIds);
  const normalizedBoneIds = normalizeBoneIds(boneIds);
  const requestedIds = new Set(normalizedBoneIds);
  const availableIds = summary.status === 'partial'
    ? summary.availableBoneIds.filter(boneId => requestedIds.size === 0 || requestedIds.has(boneId))
    : normalizedBoneIds;
  return {
    ...summary,
    urls: summary.status === 'missing'
      ? []
      : availableIds
        .map(boneId => `./models/${summary.pattern.replace('{bone_id}', boneId)}`)
  };
}

export async function downloadModelPackage(manifest, profileId, boneIds = [], options = {}) {
  const plan = modelPackageDownloadPlan(manifest, profileId, boneIds);
  if (plan.status !== 'ready' && plan.status !== 'partial') {
    throw new Error(`El paquete ${profileId} no está disponible: ${plan.status}.`);
  }
  if (!globalThis.caches?.open) throw new Error('Cache Storage no disponible en este navegador.');
  const cache = await caches.open(options.cacheName || MODEL_PACKAGE_CACHE);
  const addedUrls = [];
  const replacedEntries = [];
  try {
    for (const url of plan.urls) {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`No se pudo descargar ${url} (${response.status}).`);
      const existed = await cache.match(url);
      await cache.put(url, response.clone());
      if (!existed) addedUrls.push(url);
      else replacedEntries.push({ url, response: existed.clone() });
    }
  } catch (error) {
    await Promise.all([addedUrls.map(url => cache.delete(url)), replacedEntries.map(entry => cache.put(entry.url, entry.response))].flat());
    throw error;
  }
  return { ...plan, downloaded: plan.urls.length, cacheName: options.cacheName || MODEL_PACKAGE_CACHE };
}

export async function importModelPackageFiles(profileId, files = [], boneIds = [], options = {}) {
  if (!globalThis.caches?.open) throw new Error('Cache Storage no disponible en este navegador.');
  const cacheName = options.cacheName || MODEL_PACKAGE_CACHE;
  const cache = await caches.open(cacheName);
  const knownIds = new Set(boneIds);
  const imported = [];
  const rejected = [];
  for (const file of files) {
    const baseName = String(file?.name || '').replace(/\.glb$/i, '');
    if (!/\.glb$/i.test(String(file?.name || '')) || !knownIds.has(baseName)) {
      rejected.push(file?.name || 'archivo sin nombre');
      continue;
    }
    const body = await file.arrayBuffer();
    const magic = new TextDecoder().decode(new Uint8Array(body).slice(0, 4));
    if (magic !== 'glTF' || !glbContainsBoneId(body, baseName)) {
      rejected.push(file?.name || 'archivo sin nombre');
      continue;
    }
    const url = `./models/${profileId}/${baseName}.glb`;
    await cache.put(url, new Response(body, { headers: { 'content-type': 'model/gltf-binary', 'content-length': String(file.size || body.byteLength) } }));
    imported.push(baseName);
  }
  return { imported, rejected, importedCount: imported.length, rejectedCount: rejected.length, cacheName };
}

export async function removeModelPackage(manifest, profileId, boneIds = [], options = {}) {
  const plan = modelPackageDownloadPlan(manifest, profileId, boneIds);
  if (!globalThis.caches?.open) throw new Error('Cache Storage no disponible en este navegador.');
  const cache = await caches.open(options.cacheName || MODEL_PACKAGE_CACHE);
  await Promise.all(plan.urls.map(url => cache.delete(url)));
  return { ...plan, removed: plan.urls.length, cacheName: options.cacheName || MODEL_PACKAGE_CACHE };
}

export async function getModelPackageCacheStatus(manifest, profileId, boneIds = [], options = {}) {
  const plan = modelPackageDownloadPlan(manifest, profileId, boneIds);
  const cacheName = options.cacheName || MODEL_PACKAGE_CACHE;
  if (!globalThis.caches?.open) return { ...plan, cached: 0, cachedBytes: 0, cacheName };
  if (globalThis.caches.has && !(await caches.has(cacheName))) return { ...plan, cached: 0, cachedBytes: 0, cacheName };
  const cache = await caches.open(cacheName);
  let cached = 0;
  let cachedBytes = 0;
  for (const url of plan.urls) {
    const response = await cache.match(url);
    if (!response) continue;
    cached += 1;
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length)) cachedBytes += length;
  }
  return { ...plan, cached, cachedBytes, cacheName };
}

export async function getCachedModelBoneIds(profileId, boneIds = [], options = {}) {
  if (!globalThis.caches?.open) return [];
  const cacheName = options.cacheName || MODEL_PACKAGE_CACHE;
  if (globalThis.caches.has && !(await caches.has(cacheName))) return [];
  const cache = await caches.open(cacheName);
  const entries = await Promise.all(boneIds.map(async boneId => {
    const response = await cache.match(`./models/${profileId}/${boneId}.glb`);
    return response ? boneId : null;
  }));
  return entries.filter(Boolean);
}

export function customModelUrl(profileId, boneId, format = 'glb') {
  const safeFormat = String(format || 'glb').toLowerCase().replace(/[^a-z0-9]/g, '') || 'glb';
  return `./models/custom/${encodeURIComponent(profileId)}/${encodeURIComponent(boneId)}.${safeFormat}`;
}

export async function cacheCustomModelFile(profileId, boneId, file, options = {}) {
  if (!globalThis.caches?.open) throw new Error('Cache Storage no disponible en este navegador.');
  const format = String(file?.name || '').split('.').pop().toLowerCase() || 'glb';
  const url = customModelUrl(profileId, boneId, format);
  const body = await file.arrayBuffer();
  const cacheName = options.cacheName || CUSTOM_MODEL_CACHE;
  const cache = await caches.open(cacheName);
  await Promise.all(['glb', 'gltf', 'obj', 'stl'].filter(item => item !== format).map(item => cache.delete(customModelUrl(profileId, boneId, item))));
  await cache.put(url, new Response(body, {
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'content-length': String(file.size || body.byteLength)
    }
  }));
  return { url, format, cacheName, bytes: body.byteLength };
}

export async function getCachedCustomModelFile(profileId, boneId, format = 'glb', options = {}) {
  if (!globalThis.caches?.open) return null;
  const cacheName = options.cacheName || CUSTOM_MODEL_CACHE;
  if (globalThis.caches.has && !(await caches.has(cacheName))) return null;
  const cache = await caches.open(cacheName);
  return cache.match(customModelUrl(profileId, boneId, format));
}

export async function removeCachedCustomModelFile(profileId, boneId, format = 'glb', options = {}) {
  if (!globalThis.caches?.open) return false;
  const cacheName = options.cacheName || CUSTOM_MODEL_CACHE;
  if (globalThis.caches.has && !(await caches.has(cacheName))) return false;
  const cache = await caches.open(cacheName);
  return cache.delete(customModelUrl(profileId, boneId, format));
}
