import { access, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { glbContainsBoneId, validateModelManifest, validateModelSourceRegistry } from '../src/anatomy/package.js';
import { extendedBones } from '../src/anatomy/extended-bones.js';

const root = resolve('public/models');
const baseBoneIds = ['skull', 'mandible', 'c1_atlas', 'vertebrae', 'sternum', 'left_clavicle', 'right_clavicle', 'left_humerus', 'right_humerus', 'left_femur', 'right_femur', 'left_tibia', 'right_tibia', 'left_coxal', 'right_coxal'];
const catalogIds = [...baseBoneIds, ...extendedBones.map(bone => bone.id)];
const knownIds = new Set(catalogIds);
const readJson = async name => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const exists = async path => { try { await access(path); return true; } catch { return false; } };

const manifest = await readJson('manifest.json');
const registry = await readJson('sources.json');
const errors = [
  ...validateModelManifest(manifest).errors,
  ...validateModelSourceRegistry(manifest, registry).errors,
];

if (manifest.bone_count !== catalogIds.length) {
  errors.push(`manifest: bone_count debe coincidir con el catálogo (${catalogIds.length})`);
}

const profileCounts = {};
for (const [profileId, profile] of Object.entries(manifest.profiles || {})) {
  const profileRoot = resolve(root, profileId);
  const files = await exists(profileRoot)
    ? (await readdir(profileRoot)).filter(name => name.toLowerCase().endsWith('.glb'))
    : [];
  const fileIds = files.map(name => name.replace(/\.glb$/i, ''));
  const declaredIds = Array.isArray(profile.asset_ids) ? profile.asset_ids : [];
  for (const boneId of declaredIds) if (!knownIds.has(boneId)) errors.push(`${profileId}: Bone_ID desconocido en asset_ids: ${boneId}`);
  profileCounts[profileId] = files.length;
  const source = registry.profiles?.[profileId];

  if (profile.asset_status === 'placeholder' && files.length > 0) {
    errors.push(`${profileId}: hay GLB publicados pero asset_status sigue en placeholder`);
  }
  if (profile.asset_status !== 'placeholder') {
    if (files.length === 0) errors.push(`${profileId}: no hay archivos GLB para un perfil publicado`);
    if (source?.source_status !== 'published') errors.push(`${profileId}: el registro de fuente debe estar published`);
    if (Number.isInteger(source?.asset_count) && source.asset_count !== files.length) {
      errors.push(`${profileId}: asset_count (${source.asset_count}) no coincide con los GLB (${files.length})`);
    }
    if (declaredIds.length !== files.length || declaredIds.some(id => !fileIds.includes(id)) || fileIds.some(id => !declaredIds.includes(id))) {
      errors.push(`${profileId}: asset_ids no coincide exactamente con los GLB publicados`);
    }
    if (Array.isArray(source?.asset_ids) && (source.asset_ids.length !== declaredIds.length || source.asset_ids.some(id => !declaredIds.includes(id)))) {
      errors.push(`${profileId}: asset_ids del registro de fuentes no coincide con el manifiesto`);
    }
    if (profile.asset_status === 'ready' && files.length !== manifest.bone_count) {
      errors.push(`${profileId}: ready exige ${manifest.bone_count} GLB y hay ${files.length}`);
    }
    for (const filename of files) {
      const boneId = filename.replace(/\.glb$/i, '');
      const body = await readFile(resolve(profileRoot, filename));
      if (!glbContainsBoneId(body, boneId)) errors.push(`${profileId}/${filename}: falta un nodo con nombre exacto ${boneId}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Validación de assets GLB fallida:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  const statuses = Object.values(manifest.profiles || {}).map(profile => profile.asset_status);
  const total = Object.values(profileCounts).reduce((sum, count) => sum + count, 0);
  console.log(`Validación de assets GLB: OK · ${statuses.filter(status => status !== 'placeholder').length}/${statuses.length} perfiles publicados · ${total} GLB`);
}
