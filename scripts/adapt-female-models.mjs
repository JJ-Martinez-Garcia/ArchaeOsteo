// Creates a visually adapted adult-female package from the documented
// adult-male GLBs. Geometry is preserved; only per-bone proportions change.
// This is an educational visual adaptation, not a validated female specimen.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/models');
const sourceDir = path.join(root, 'adult_male');
const targetDir = path.join(root, 'adult_female');
const manifestPath = path.join(root, 'manifest.json');
const registryPath = path.join(root, 'sources.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const ids = manifest.profiles.adult_male.asset_ids;
const licenseText = await readFile(path.resolve('public/licenses/CC-BY-SA-4.0.txt'), 'utf8');

const scaleFor = id => {
  if (id === 'skull') return [1, .98, 1];
  if (id === 'mandible') return [1.02, .98, 1];
  if (id.includes('coxal')) return [1.18, .96, 1.08];
  if (id.includes('clavicle') || id.includes('scapula')) return [.92, 1, .96];
  if (id.includes('femur')) return [.96, 1.02, .96];
  if (id.includes('tibia') || id.includes('fibula')) return [.95, 1.01, .95];
  if (id.includes('humerus') || id.includes('radius') || id.includes('ulna')) return [.95, 1, .95];
  if (id.includes('metacarp') || id.includes('digit') || id.includes('carpal')) return [.94, 1, .94];
  if (id.includes('metatars') || id.includes('toe') || id.includes('tarsal')) return [.96, 1, .96];
  if (id.startsWith('rib_') || id.includes('_rib_')) return [.96, 1, .94];
  return [1, 1, 1];
};

function adaptGlb(body, boneId) {
  const bytes = new Uint8Array(body);
  if (bytes.byteLength < 20 || new TextDecoder().decode(bytes.slice(0, 4)) !== 'glTF') throw new Error(`${boneId}: no es GLB`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  if (new TextDecoder().decode(bytes.slice(16, 20)) !== 'JSON') throw new Error(`${boneId}: falta chunk JSON`);
  const json = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + jsonLength)));
  const node = json.nodes?.find(item => item.name === boneId);
  if (!node) throw new Error(`${boneId}: falta nodo raíz`);
  node.scale = scaleFor(boneId);
  node.extras = { ...(node.extras || {}), bone_id: boneId, generated: true, profileId: 'adult_female', version: 'adult-male-adaptation-1.0.0', license: 'CC BY-SA 4.0', licenseText, adapted_from: 'adult_male', adaptation: 'visual female-profile scaling; not anatomically validated' };
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(JSON.stringify(json));
  const paddedLength = Math.ceil(jsonBytes.byteLength / 4) * 4;
  const output = new Uint8Array(20 + paddedLength + bytes.byteLength - (20 + jsonLength));
  const outputView = new DataView(output.buffer);
  output.set(bytes.slice(0, 12), 0);
  outputView.setUint32(12, paddedLength, true);
  output.set([0x4a, 0x53, 0x4f, 0x4e], 16);
  output.set(jsonBytes, 20);
  output.fill(0x20, 20 + jsonBytes.byteLength, 20 + paddedLength);
  output.set(bytes.slice(20 + jsonLength), 20 + paddedLength);
  outputView.setUint32(8, output.byteLength, true);
  return output;
}

await mkdir(targetDir, { recursive: true });
let totalBytes = 0;
for (const id of ids) {
  const source = await readFile(path.join(sourceDir, `${id}.glb`));
  const adapted = adaptGlb(source, id);
  await writeFile(path.join(targetDir, `${id}.glb`), adapted);
  totalBytes += adapted.byteLength;
}

const previousFemale = manifest.profiles.adult_female;
manifest.profiles.adult_female = {
  ...previousFemale,
  asset_status: 'partial',
  asset_count: ids.length,
  asset_ids: ids,
  approximate_size_mb: Number((totalBytes / 1048576).toFixed(2)),
  model_kind: 'adapted-from-adult-male',
  generator_version: 'adult-male-adaptation-1.0.0'
};
registry.profiles.adult_female = {
  source_status: 'published',
  author: 'Osteo3D contributors; derived from Open3Dmodel contributors / Open Anatomy lineage',
  institution: 'ArchaeOsteo project',
  url: 'https://github.com/JJ-Martinez-Garcia/ArchaeOsteo',
  license: 'CC BY-SA 4.0',
  license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  version: 'adult-male-adaptation-1.0.0',
  consulted_at: '2026-09-11',
  modifications: 'Adult-male GLBs copied without geometry edits and adapted with controlled per-bone proportional transforms for a female-profile visualisation. Not a female specimen, scan, sex estimator or validated morphometric model.',
  asset_count: ids.length,
  asset_ids: ids,
  model_kind: 'adapted-from-adult-male'
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
console.log(`Adult female adaptation: ${ids.length} GLB · ${(totalBytes / 1048576).toFixed(2)} MB`);
