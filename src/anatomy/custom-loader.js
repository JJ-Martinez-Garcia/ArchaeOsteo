export async function loadLocalModel(THREE, file, options = {}) {
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  if (extension === 'obj') {
    const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
    return new OBJLoader().parse(await file.text());
  }
  if (extension === 'stl') {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
    const geometry = new STLLoader().parse(await file.arrayBuffer());
    const material = new THREE.MeshStandardMaterial({ color: 0xc4ad8b, roughness: 0.72 });
    return new THREE.Mesh(geometry, material);
  }
  if (extension === 'glb' || extension === 'gltf') {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    if (options.dracoDecoderPath) {
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const draco = new DRACOLoader();
      draco.setDecoderPath(options.dracoDecoderPath);
      loader.setDRACOLoader(draco);
    }
    const body = await file.arrayBuffer();
    return new Promise((resolve, reject) => loader.parse(body, '', resolve, reject));
  }
  throw new Error('Formato no compatible. Usa GLB, GLTF, OBJ o STL.');
}
