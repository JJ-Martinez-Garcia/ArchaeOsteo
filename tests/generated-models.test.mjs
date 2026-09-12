import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { baseBones } from '../src/anatomy/base-bones.js';
import { extendedBones } from '../src/anatomy/extended-bones.js';
import { PROCEDURAL_VERSION } from '../src/anatomy/procedural.js';
import { clampInspectorWidth, inspectorWidthBounds } from '../src/ui/inspector-layout.js';

const manifest=JSON.parse(await readFile('public/models/manifest.json','utf8'));
const bones=[...baseBones,...extendedBones];let total=0;
function assertFiniteGlbGeometry(body,label){
  let offset=12,json,binary;
  while(offset<body.length){
    const length=body.readUInt32LE(offset),type=body.readUInt32LE(offset+4),chunk=body.subarray(offset+8,offset+8+length);
    if(type===0x4e4f534a)json=JSON.parse(chunk.toString());
    if(type===0x004e4942)binary=chunk;
    offset+=8+length;
  }
  assert.ok(json&&binary,`${label}: GLB chunks missing`);
  let primitiveCount=0;
  for(const mesh of json.meshes||[]) for(const primitive of mesh.primitives||[]){
    const accessor=json.accessors?.[primitive.attributes?.POSITION];
    assert.ok(accessor,`${label}: POSITION accessor missing`);
    const view=json.bufferViews?.[accessor.bufferView];
    assert.ok(view,`${label}: POSITION bufferView missing`);
    assert.equal(accessor.componentType,5126,`${label}: POSITION must use float32`);
    const start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12;
    for(let index=0;index<accessor.count;index+=1) for(let axis=0;axis<3;axis+=1)
      assert.ok(Number.isFinite(binary.readFloatLE(start+index*stride+axis*4)),`${label}: non-finite vertex`);
    primitiveCount+=1;
  }
  assert.ok(primitiveCount>0,`${label}: no mesh primitives`);
}
for(const profile of ['adult_female','infant','neonate']){
  const info=manifest.profiles[profile];assert.equal(info.asset_count,179);
  const adaptedPackage=true;
  assert.equal(info.model_kind,'adapted-from-adult-male');
  for(const id of info.asset_ids){
      const body=await readFile(`public/models/${profile}/${id}.glb`);
    assertFiniteGlbGeometry(body,`${profile}/${id}`);
    if(adaptedPackage){
      const jsonLength=body.readUInt32LE(12),json=JSON.parse(body.subarray(20,20+jsonLength));
      const root=json.nodes.find(node=>node.name===id);assert.ok(root,`${profile}/${id}`);
      assert.equal(root.extras.generated,true);assert.equal(root.extras.profileId,profile);
      assert.equal(root.extras.version,'blender-adaptation-1.0.0');
      assert.equal(root.extras.license,'CC BY-SA 4.0');assert.equal(root.extras.adapted_from,'adult_male');
      if(root.scale) assert.ok(Array.isArray(root.scale)&&root.scale.length===3);
      total++;continue;
    }
    const gltf=await new GLTFLoader().parseAsync(body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength),'');
    const root=gltf.scene.getObjectByName(id);assert.ok(root,`${profile}/${id}`);
    assert.equal(root.userData.generated,true);assert.equal(root.userData.profileId,profile);
    assert.equal(root.userData.version,PROCEDURAL_VERSION);
    assert.equal(root.userData.license,'MIT');
    assert.match(root.userData.licenseText,/Permission is hereby granted/);
    assert.equal(root.userData.name_es,bones.find(b=>b.id===id).es);
    let count=0;
    root.traverse(node=>{if(node.isMesh){count++;assert.ok(node.geometry.attributes.position.array.every(Number.isFinite));node.geometry.dispose();node.material.dispose();}});
    assert.ok(count>0);total++;
  }
}
for(const viewport of [901,1024,1440,1920]){
  const bounds=inspectorWidthBounds(viewport);
  assert.ok(clampInspectorWidth(2000,viewport)<=bounds.max);
  assert.equal(clampInspectorWidth(-1,viewport),bounds.min);
  assert.ok(Number.isFinite(clampInspectorWidth(NaN,viewport)));
}
console.log(`Profile GLB packages: ${total} files parsed; profile, catalogue metadata, license and finite geometry verified.`);
