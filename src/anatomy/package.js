export const MODEL_MANIFEST_SCHEMA = 1;
export const MODEL_SOURCE_REGISTRY_SCHEMA = 1;
export const MODEL_PACKAGE_CACHE = 'osteo3d-models-v1';

const ASSET_STATUSES = new Set(['placeholder', 'ready', 'partial']);

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
  if (!Array.isArray(manifest?.required_metadata) || !manifest.required_metadata.includes('license')) errors.push('required_metadata debe exigir license');
  for (const [profileId, profile] of Object.entries(manifest?.profiles || {})) {
    if (!profile.root) errors.push(`${profileId}: falta root`);
    if (!ASSET_STATUSES.has(profile.asset_status)) errors.push(`${profileId}: asset_status no válido`);
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
  if (!profile) return { profileId, status: 'missing', expected: boneIds.length, pattern: null };
  return {
    profileId,
    status: profile.asset_status,
    expected: boneIds.length,
    pattern: String(manifest.bone_asset_pattern || '').replace('{profile}', profileId),
    requiredMetadata: manifest.required_metadata || [],
    approximateSizeMb: Number.isFinite(profile.approximate_size_mb) ? profile.approximate_size_mb : null
  };
}

export function formatPackageSize(sizeMb) {
  return Number.isFinite(sizeMb) && sizeMb > 0 ? `aprox. ${sizeMb} MB` : 'no disponible';
}

export function modelPackageDownloadPlan(manifest, profileId, boneIds = []) {
  const summary = modelPackageSummary(manifest, profileId, boneIds);
  return {
    ...summary,
    urls: summary.status === 'missing'
      ? []
      : boneIds.map(boneId => `./models/${summary.pattern.replace('{bone_id}', boneId)}`)
  };
}

export async function downloadModelPackage(manifest, profileId, boneIds = [], options = {}) {
  const plan = modelPackageDownloadPlan(manifest, profileId, boneIds);
  if (plan.status !== 'ready' && plan.status !== 'partial') {
    throw new Error(`El paquete ${profileId} no está disponible: ${plan.status}.`);
  }
  if (!globalThis.caches?.open) throw new Error('Cache Storage no disponible en este navegador.');
  const cache = await caches.open(options.cacheName || MODEL_PACKAGE_CACHE);
  for (const url of plan.urls) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`No se pudo descargar ${url} (${response.status}).`);
    await cache.put(url, response.clone());
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
