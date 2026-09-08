import { access, readFile } from 'node:fs/promises';
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
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => normalize(match[1]))
  .filter(value => value && !value.startsWith('#') && !/^(?:https?:|data:|mailto:)/i.test(value));
const manifestReferences = (manifest.icons || []).map(icon => normalize(icon.src));
const required = [...new Set([...references, ...manifestReferences, 'sw.js', 'manifest.json'])];
const missing = [];
for (const resource of required) {
  if (!(await exists(resource))) missing.push(resource);
}
const pngIcons = (manifest.icons || []).filter(icon => icon.type === 'image/png');
const hasRequiredPngIcon = size => pngIcons.some(icon => String(icon.sizes || '').split(/\s+/).includes(size));
const manifestValid = manifest.name === 'Osteo3D'
  && manifest.short_name === 'Osteo3D'
  && manifest.display === 'standalone'
  && manifest.start_url === './'
  && manifest.scope === './'
  && hasRequiredPngIcon('192x192')
  && hasRequiredPngIcon('512x512');
if (!manifestValid) {
  throw new Error('El manifiesto no conserva identidad, instalación standalone, rutas GitHub Pages o iconos PNG requeridos.');
}
if (!/addEventListener\(['"](?:install|activate|fetch)['"]/.test(serviceWorker)
  || !/caches\.open\(/.test(serviceWorker)
  || !/SKIP_WAITING/.test(serviceWorker)) {
  throw new Error('El Service Worker no conserva instalación, caché offline y actualización controlada.');
}
if (missing.length) throw new Error(`Faltan recursos del artefacto PWA: ${missing.join(', ')}`);
console.log(`PWA artifact OK: ${required.length} recursos verificados.`);
