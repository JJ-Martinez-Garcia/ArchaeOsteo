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
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => normalize(match[1]))
  .filter(value => value && !value.startsWith('#') && !/^(?:https?:|data:|mailto:)/i.test(value));
const manifestReferences = (manifest.icons || []).map(icon => normalize(icon.src));
const required = [...new Set([...references, ...manifestReferences, 'sw.js', 'manifest.json'])];
const missing = [];
for (const resource of required) {
  if (!(await exists(resource))) missing.push(resource);
}
if (manifest.display !== 'standalone' || manifest.start_url !== './' || manifest.scope !== './') {
  throw new Error('El manifiesto no conserva display, start_url o scope compatibles con GitHub Pages.');
}
if (missing.length) throw new Error(`Faltan recursos del artefacto PWA: ${missing.join(', ')}`);
console.log(`PWA artifact OK: ${required.length} recursos verificados.`);
