import { validateModelManifest, validateModelSourceRegistry } from './package.js';

export async function loadModelManifest(url = './models/manifest.json') {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar el manifiesto de modelos (${response.status}).`);
  const manifest = await response.json();
  const validation = validateModelManifest(manifest);
  if (!validation.valid) throw new Error(`Manifiesto de modelos inválido: ${validation.errors.join('; ')}`);
  return manifest;
}

export async function loadModelSourceRegistry(manifest, url = './models/sources.json') {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar el registro de fuentes (${response.status}).`);
  const registry = await response.json();
  const validation = validateModelSourceRegistry(manifest, registry);
  if (!validation.valid) throw new Error(`Registro de fuentes inválido: ${validation.errors.join('; ')}`);
  return registry;
}

export async function loadBoneModel(THREE, profileId, boneId, options = {}) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader(options.manager);
  const url = options.url || `./models/${profileId}/${boneId}.glb`;
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}
