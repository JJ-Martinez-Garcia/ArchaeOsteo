import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

const text = async path => readFile(path, 'utf8');
const exists = async path => { try { await access(path); return true; } catch { return false; } };

const manifest = JSON.parse(await text('public/manifest.json'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './');
assert.ok(manifest.icons.length > 0);

const sw = await text('public/sw.js');
assert.match(sw, /caches\.open/);
assert.match(sw, /SKIP_WAITING/);

const main = await text('src/main.js');
const store = await text('src/data/store.js');
assert.match(store, /indexedDB/);
for (const marker of ['PINTAR INVENTARIO', 'ODONTOGRAMA', 'OSTEOMETRÍA', 'ESTADÍSTICAS', 'INFORME OSTEOARQUEOLÓGICO', 'exportXlsx', 'registerPwa']) {
  assert.match(main, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Falta módulo: ${marker}`);
}

assert.equal(await exists('src/anatomy/catalog.js'), true);
assert.equal(await exists('src/anatomy/loader.js'), true);
assert.equal(await exists('public/models/manifest.json'), true);
assert.equal(await exists('dist/index.html'), true);
assert.equal(await exists('dist/sw.js'), true);

console.log('Osteo3D smoke tests: OK');
