import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const profileId = process.argv[2];
if (!profileId) throw new Error('Uso: node scripts/sync-model-index.mjs <profile_id>');

const root = path.resolve('public/models');
const manifestPath = path.join(root, 'manifest.json');
const sourcesPath = path.join(root, 'sources.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sources = JSON.parse(await readFile(sourcesPath, 'utf8'));
if (!manifest.profiles?.[profileId]) throw new Error(`Perfil desconocido en manifest.json: ${profileId}`);
if (!sources.profiles?.[profileId]) throw new Error(`Perfil desconocido en sources.json: ${profileId}`);

const profileRoot = path.join(root, profileId);
const filenames = (await readdir(profileRoot)).filter(name => name.toLowerCase().endsWith('.glb')).sort();
const assetIds = filenames.map(name => name.replace(/\.glb$/i, ''));
const sizes = await Promise.all(filenames.map(name => stat(path.join(profileRoot, name))));
const bytes = sizes.reduce((sum, item) => sum + item.size, 0);
const status = assetIds.length === manifest.bone_count ? 'ready' : assetIds.length > 0 ? 'partial' : 'placeholder';

manifest.profiles[profileId] = {
  ...manifest.profiles[profileId],
  asset_status: status,
  approximate_size_mb: Number((bytes / 1048576).toFixed(2)),
  asset_count: assetIds.length,
  asset_ids: assetIds,
};
sources.profiles[profileId] = {
  ...sources.profiles[profileId],
  source_status: assetIds.length > 0 ? 'published' : 'pending',
  asset_count: assetIds.length,
  asset_ids: assetIds,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
console.log(`${profileId}: ${assetIds.length}/${manifest.bone_count} GLB · ${(bytes / 1048576).toFixed(2)} MB · ${status}`);
