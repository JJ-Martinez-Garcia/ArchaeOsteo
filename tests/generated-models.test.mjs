import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { baseBones } from '../src/anatomy/base-bones.js';
import { extendedBones } from '../src/anatomy/extended-bones.js';
import { PROCEDURAL_VERSION } from '../src/anatomy/procedural.js';
import { clampInspectorWidth, inspectorWidthBounds } from '../src/ui/inspector-layout.js';

const manifest=JSON.parse(await readFile('public/models/manifest.json','utf8'));
const bones=[...baseBones,...extendedBones];let total=0;
for(const profile of ['adult_female','infant','neonate']){
  const info=manifest.profiles[profile];assert.equal(info.asset_count,179);
  assert.equal(info.model_kind,'original-didactic');
  for(const id of info.asset_ids){
    const body=await readFile(`public/models/${profile}/${id}.glb`);
    const gltf=await new GLTFLoader().parseAsync(body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength),'');
    const root=gltf.scene.getObjectByName(id);assert.ok(root,`${profile}/${id}`);
    assert.equal(root.userData.generated,true);assert.equal(root.userData.profileId,profile);
    assert.equal(root.userData.version,PROCEDURAL_VERSION);
    assert.equal(root.userData.license,'MIT');assert.match(root.userData.licenseText,/Permission is hereby granted/);
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
console.log(`Original GLB packages: ${total} files parsed; profile, catalogue metadata, license and finite geometry verified.`);
