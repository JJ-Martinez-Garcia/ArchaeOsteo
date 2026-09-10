import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { extendedBones } from '../src/anatomy/extended-bones.js';
import { baseBones } from '../src/anatomy/base-bones.js';
import { applyProfileLayout, boneLayout, createProceduralBone, isAnatomicalBone, PROFILE_SHAPES } from '../src/anatomy/procedural.js';

const manifest=JSON.parse(await readFile('public/models/manifest.json','utf8'));
const ids=manifest.profiles.adult_male.asset_ids;
assert.equal(ids.length,179);
const bones=ids.map(id=>structuredClone(extendedBones.find(bone=>bone.id===id)||{id,p:[0,0,0],e:[0,0,0],size:[1,1,1]}));
const countMeshes=root=>{let count=0;root.traverse(node=>{if(node.isMesh)count++;});return count;};
for(const profile of Object.keys(PROFILE_SHAPES)) {
  applyProfileLayout(bones,profile);
  const expanded=[];
  for(const bone of bones){
    const model=createProceduralBone(THREE,bone,profile);
    assert.ok(countMeshes(model)>0,`${profile}/${bone.id} must contain geometry`);
    assert.equal(model.userData.units,'arbitrary');
    model.traverse(node=>{
      if(!node.isMesh)return;
      assert.ok(node.userData.componentId);
      assert.ok([...node.geometry.attributes.position.array].every(Number.isFinite),`${bone.id}: finite vertices`);
    });
    model.position.set(...bone.e);model.rotation.set(...bone.expandedRotation);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    assert.ok(bounds.getSize(new THREE.Vector3()).length()>0);
    for(const previous of expanded)assert.equal(bounds.intersectsBox(previous.bounds),false,`${profile} exploded overlap: ${bone.id}/${previous.id}`);
    expanded.push({id:bone.id,bounds});
    model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  }
}
for(const id of ['vertebrae','rib_indeterminate','carpal_indeterminate']){
  assert.equal(isAnatomicalBone({id}),false);
  assert.equal(countMeshes(createProceduralBone(THREE,{id},'neonate')),0);
}
const regionBands = new Map();
for (const bone of bones.filter(isAnatomicalBone)) {
  const values = regionBands.get(bone.region) || [];
  values.push(bone.e[1]);
  regionBands.set(bone.region, values);
}
assert.ok(regionBands.size >= 5, 'Expanded layout must keep regional bands');
assert.ok([...regionBands.values()].every(values => values.every(Number.isFinite)), 'Regional band positions must be finite');
const completeLayout = structuredClone([...baseBones, ...extendedBones]);
applyProfileLayout(completeLayout, 'adult_male');
const regionMins = new Map();
for (const bone of completeLayout.filter(isAnatomicalBone)) regionMins.set(bone.expandedRegion || bone.region, Math.min(regionMins.get(bone.expandedRegion || bone.region) ?? Infinity, bone.e[1]));
const regionalOrder = ['Cráneo','Columna','Tórax','Cintura escapular','Extremidad superior','Manos','Pelvis','Extremidad inferior','Pies'].filter(region => regionMins.has(region));
for (let index = 1; index < regionalOrder.length; index++) assert.ok(regionMins.get(regionalOrder[index]) < regionMins.get(regionalOrder[index - 1]), 'Expanded regional bands must progress in anatomical order');
const skull=bones.find(b=>b.id==='skull'), femur=bones.find(b=>b.id==='left_femur');
assert.notEqual(boneLayout(skull,'neonate').size[1]/boneLayout(skull,'adult_male').size[1],boneLayout(femur,'neonate').size[1]/boneLayout(femur,'adult_male').size[1]);
for(const profile of Object.keys(PROFILE_SHAPES)){
  const left=boneLayout(femur,profile),right=boneLayout({...femur,id:'right_femur'},profile);
  assert.equal(left.p[0],-right.p[0]);assert.deepEqual(left.size,right.size);
}
const neonatal=createProceduralBone(THREE,femur,'neonate');
assert.ok(neonatal.getObjectByName('left_femur:proximal-envelope'));
assert.equal(neonatal.getObjectByName('left_femur:proximal-envelope').userData.tissue,'cartilage-envelope');
assert.equal(neonatal.getObjectByName('left_femur:proximal-epiphyseal-plate').userData.tissue,'cartilage-envelope');
assert.equal(neonatal.getObjectByName('left_femur:proximal-ossification-center').userData.tissue,'ossification-center');
const neonatalSkull=createProceduralBone(THREE,skull,'neonate');
assert.equal(neonatalSkull.getObjectByName('skull:anterior-fontanelle').userData.tissue,'cartilage-envelope');
assert.equal(neonatalSkull.getObjectByName('skull:posterior-fontanelle').userData.tissue,'cartilage-envelope');

// GLTFExporter expects the browser FileReader; a Blob-only test adapter is sufficient.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();});}
};
const binary=await new GLTFExporter().parseAsync(neonatal,{binary:true});
assert.equal(new DataView(binary).getUint32(0,true),0x46546c67);
const roundTrip=await new GLTFLoader().parseAsync(binary,'');
assert.equal(roundTrip.scene.getObjectByName('left_femur').userData.license,'MIT');
assert.equal(countMeshes(roundTrip.scene),countMeshes(neonatal));
console.log('Procedural 3D: 716 profile/element geometries, finite vertices, non-overlapping exploded layouts, independent proportions and GLB round-trip OK.');
