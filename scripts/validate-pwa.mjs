import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const exists = async relativePath => {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};
const normalize = value => value.replace(/^\.\//, '').split(/[?#]/, 1)[0];
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const serviceWorker = await readFile(path.join(root, 'sw.js'), 'utf8');
const shellMatch = serviceWorker.match(/const SHELL = (\[[^;]+\]);/);
if (!shellMatch) throw new Error('El Service Worker no declara la lista SHELL.');
const shellReferences = [...shellMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => normalize(match[1])).filter(Boolean);
if (shellReferences.length === 0) throw new Error('La lista SHELL no contiene recursos.');
const buildAssets = (await readdir(path.join(root, 'assets'), { withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => `./assets/${entry.name}`);
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => normalize(match[1]))
  .filter(value => value && !value.startsWith('#') && !/^(?:https?:|data:|mailto:)/i.test(value));
const manifestReferences = (manifest.icons || []).map(icon => normalize(icon.src));
const required = [...new Set([...references, ...manifestReferences, ...shellReferences, 'sw.js', 'manifest.json'])];
const missing = [];
for (const resource of required) {
  if (!(await exists(resource))) missing.push(resource);
}
const pngIcons = (manifest.icons || []).filter(icon => icon.type === 'image/png');
const hasRequiredPngIcon = size => pngIcons.some(icon => String(icon.sizes || '').split(/\s+/).includes(size));
const shortcutsValid = manifest.shortcuts?.every(shortcut => /^\.\/\?view=(?:inventory|report)$/.test(shortcut.url || '')
  && typeof shortcut.name === 'string'
  && Array.isArray(shortcut.icons)
  && shortcut.icons.some(icon => normalize(icon.src) === 'icons/osteo3d-192.png'));
const manifestValid = manifest.name === 'Osteo3D'
  && manifest.short_name === 'Osteo3D'
  && manifest.id === './'
  && manifest.lang === 'es'
  && manifest.dir === 'ltr'
  && manifest.display === 'standalone'
  && Array.isArray(manifest.display_override)
  && manifest.display_override.includes('standalone')
  && typeof manifest.description === 'string'
  && manifest.description.length > 0
  && manifest.start_url === './'
  && manifest.scope === './'
  && manifest.orientation === 'any'
  && /^#[0-9a-f]{6}$/i.test(manifest.theme_color || '')
  && /^#[0-9a-f]{6}$/i.test(manifest.background_color || '')
  && manifest.prefer_related_applications === false
  && Array.isArray(manifest.shortcuts)
  && manifest.shortcuts.length >= 2
  && shortcutsValid
  && hasRequiredPngIcon('192x192')
  && hasRequiredPngIcon('512x512');
if (!manifestValid) {
  throw new Error('El manifiesto no conserva identidad, metadatos de instalación, accesos directos, rutas GitHub Pages o iconos PNG requeridos.');
}
const missingBuildAssets = buildAssets.filter(asset => !serviceWorker.includes(asset));
if (missingBuildAssets.length) throw new Error(`El Service Worker no incluye todos los chunks del build: ${missingBuildAssets.join(', ')}`);
if (!/const CACHE = 'osteo3d-shell-v\d+\.\d+\.\d+-[a-f0-9]{12}';/.test(serviceWorker)) {
  throw new Error('El Service Worker publicado no contiene una caché versionada por fingerprint del build.');
}
const serviceWorkerMarkers = [
  /addEventListener\(['"]install['"]/, /addEventListener\(['"]activate['"]/, /addEventListener\(['"]fetch['"]/, /caches\.open\(/,
  /SKIP_WAITING/, /\.\/index\.html/, /\.\/manifest\.json/, /event\.request\.mode === ['"]navigate['"]/, /cache: ['"]no-store['"]/,
  /caches\.match\(['"]\.\/index\.html['"]\)/, /event\.request\.method !== ['"]GET['"]|cached \|\| fetch\(event\.request\)/, /caches\.match\(event\.request\)/,
  /self\.clients\.claim\(\)/, /key\.startsWith\(['"]osteo3d-shell-/
];
if (serviceWorkerMarkers.some(marker => !marker.test(serviceWorker))) {
  throw new Error('El Service Worker no conserva instalación, caché offline y actualización controlada.');
}
if (missing.length) throw new Error(`Faltan recursos del artefacto PWA: ${missing.join(', ')}`);
console.log(`PWA artifact OK: ${required.length} recursos verificados.`);
