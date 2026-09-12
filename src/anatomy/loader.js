import { MODEL_MANIFEST_SCHEMA, MODEL_SOURCE_REGISTRY_SCHEMA, validateModelManifest, validateModelSourceRegistry } from './package.js';

export async function loadModelManifest(url = './models/manifest.json') {
  const versionedUrl = `${url}${url.includes('?') ? '&' : '?'}schema=${MODEL_MANIFEST_SCHEMA}`;
  const response = await fetch(versionedUrl, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar el manifiesto de modelos (${response.status}).`);
  const manifest = await response.json();
  const validation = validateModelManifest(manifest);
  if (!validation.valid) throw new Error(`Manifiesto de modelos inválido: ${validation.errors.join('; ')}`);
  return manifest;
}

export async function loadModelSourceRegistry(manifest, url = './models/sources.json') {
  const versionedUrl = `${url}${url.includes('?') ? '&' : '?'}schema=${MODEL_SOURCE_REGISTRY_SCHEMA}`;
  const response = await fetch(versionedUrl, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar el registro de fuentes (${response.status}).`);
  const registry = await response.json();
  const validation = validateModelSourceRegistry(manifest, registry);
  if (!validation.valid) throw new Error(`Registro de fuentes inválido: ${validation.errors.join('; ')}`);
  return registry;
}

const sharedLoaders = new Map();
async function createSharedLoader(options) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader(options.manager);
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
  loader.setMeshoptDecoder(MeshoptDecoder);
  if (options.dracoDecoderPath) {
    const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
    const draco = new DRACOLoader(options.manager);
    draco.setDecoderPath(options.dracoDecoderPath);
    draco.setWorkerLimit(2);
    loader.setDRACOLoader(draco);
  }
  return loader;
}

export async function loadBoneModel(THREE, profileId, boneId, options = {}) {
  const key = options.manager || options.dracoDecoderPath || 'default';
  if (!sharedLoaders.has(key)) {
    sharedLoaders.set(key, createSharedLoader(options).catch(error => { sharedLoaders.delete(key); throw error; }));
  }
  const loader = await sharedLoaders.get(key);
  const url = options.url || `./models/${profileId}/${boneId}.glb`;
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}
