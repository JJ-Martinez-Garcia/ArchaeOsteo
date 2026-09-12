// Generates only our own three profile packages. Never touches imported adult-male GLBs.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { extendedBones } from '../src/anatomy/extended-bones.js';
import { baseBones } from '../src/anatomy/base-bones.js';
import { createProceduralBone, PROCEDURAL_VERSION } from '../src/anatomy/procedural.js';

globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();});}
};
const root=path.resolve('public/models');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const registry=JSON.parse(await readFile(path.join(root,'sources.json'),'utf8'));
const publishedAdaptedProfiles=['adult_female','infant','neonate'];
if(publishedAdaptedProfiles.some(profile=>manifest.profiles[profile]?.model_kind==='adapted-from-adult-male')){
  throw Error('Los paquetes publicados son adaptaciones de Blender; no se permite sobrescribirlos con el generador procedural. Usa Blender/scripts/blender-adapt-female-models.py para regenerar adaptaciones.');
}
const ids=manifest.profiles.adult_male.asset_ids;
const license=await readFile('LICENSE','utf8');
for(const profile of ['adult_female','infant','neonate']){
  const directory=path.join(root,profile);await mkdir(directory,{recursive:true});let bytes=0;
  for(const id of ids){
    const bone=[...baseBones,...extendedBones].find(b=>b.id===id);
    if(!bone)throw Error(`Missing catalogue entry: ${id}`);
    const model=createProceduralBone(THREE,bone,profile);
    model.position.set(0,0,0);model.rotation.set(0,0,0);
    delete model.userData.baseScale;
    model.userData={...model.userData,author:'Osteo3D contributors',generated:true,licenseText:license,referenceScale:'arbitrary',notice:'Original didactic model. No measured specimen, clinical validation, exact age or sex diagnosis. Blue parts are schematic cartilage envelopes; ochre parts are illustrative ossification-center markers, not verified centers.'};
    const binary=await new GLTFExporter().parseAsync(model,{binary:true});
    const file=path.join(directory,`${id}.glb`);
    // Protect any user-supplied asset that may have been added since the last generation.
    const existing=await readFile(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(existing){const length=existing.readUInt32LE(12);const json=JSON.parse(existing.subarray(20,20+length).toString());if(!json.nodes?.some(node=>node.name===id&&node.extras?.generated===true))throw Error(`Refusing to overwrite non-generated asset: ${file}`);}
    await writeFile(file,new Uint8Array(binary));bytes+=binary.byteLength;
    model.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  }
  manifest.profiles[profile]={...manifest.profiles[profile],asset_status:'partial',asset_count:ids.length,asset_ids:ids,approximate_size_mb:Number((bytes/1048576).toFixed(2)),model_kind:'original-didactic',generator_version:PROCEDURAL_VERSION};
  registry.profiles[profile]={source_status:'published',author:'Osteo3D contributors',institution:'ArchaeOsteo project',url:'https://github.com/JJ-Martinez-Garcia/ArchaeOsteo',license:'MIT',license_url:'https://opensource.org/license/mit/',version:`procedural-${PROCEDURAL_VERSION}`,consulted_at:'2026-09-10',modifications:'Original mathematical modeling with independent regional proportions, higher-resolution surfaces, separated epiphyseal plates and illustrative ossification-center envelopes. Not derived from the imported adult-male meshes; uncalibrated didactic reconstruction.',asset_count:ids.length,asset_ids:ids,model_kind:'original-didactic'};
  console.log(`${profile}: ${ids.length} original GLB files · ${(bytes/1048576).toFixed(2)} MB`);
}
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(root,'sources.json'),JSON.stringify(registry,null,2)+'\n');
