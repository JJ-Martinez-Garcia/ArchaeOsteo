export async function loadBoneModel(THREE, profileId, boneId, options = {}) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader(options.manager);
  const url = options.url || `./models/${profileId}/${boneId}.glb`;
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}
