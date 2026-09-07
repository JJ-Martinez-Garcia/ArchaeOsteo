import { access, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateModelManifest, validateModelSourceRegistry } from '../src/anatomy/package.js';

const root = resolve('public/models');
const readJson = async name => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const exists = async path => { try { await access(path); return true; } catch { return false; } };

const manifest = await readJson('manifest.json');
const registry = await readJson('sources.json');
const errors = [
  ...validateModelManifest(manifest).errors,
  ...validateModelSourceRegistry(manifest, registry).errors,
];

if (!Number.isInteger(manifest.bone_count) || manifest.bone_count < 1) {
  errors.push('manifest: bone_count debe ser un entero positivo');
}

const profileCounts = {};
for (const [profileId, profile] of Object.entries(manifest.profiles || {})) {
  const profileRoot = resolve(root, profileId);
  const files = await exists(profileRoot)
    ? (await readdir(profileRoot)).filter(name => name.toLowerCase().endsWith('.glb'))
    : [];
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
    if (profile.asset_status === 'ready' && files.length !== manifest.bone_count) {
      errors.push(`${profileId}: ready exige ${manifest.bone_count} GLB y hay ${files.length}`);
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
