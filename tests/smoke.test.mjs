import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { calculateOsteoAnalysis } from '../src/domain/analysis.js';
import { applyInventoryRows, parseCsv, validateBackup } from '../src/domain/backup.js';

const text = async path => readFile(path, 'utf8');
const exists = async path => { try { await access(path); return true; } catch { return false; } };

const manifest = JSON.parse(await text('public/manifest.json'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './');
assert.ok(manifest.icons.length > 0);

const sw = await text('public/sw.js');
assert.match(sw, /caches\.open/);
assert.match(sw, /SKIP_WAITING/);
assert.match(sw, /cache: 'reload'/);
assert.match(sw, /no-store/);

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
assert.equal(await exists('src/domain/analysis.js'), true);
assert.equal(await exists('src/domain/backup.js'), true);
assert.equal(await exists('src/ui/extended.js'), true);

const testBones = [
  { id: 'left_femur', es: 'Fémur izquierdo', region: 'Extremidad inferior', side: 'Izquierda' },
  { id: 'right_femur', es: 'Fémur derecho', region: 'Extremidad inferior', side: 'Derecha' }
];
const testState = { status: { left_femur: 'fragmentary', right_femur: 'not_recorded' }, fragments: { left_femur: 2 }, portions: { left_femur: 'proximal' }, report: { individual: 'IND-TEST' } };
const analysis = calculateOsteoAnalysis(testBones, testState);
assert.equal(analysis.nisp.value, 1);
assert.equal(analysis.mne.value, 2);
assert.equal(analysis.mni.value, 2);
assert.equal(parseCsv('Bone_ID,Presence\nleft_femur,present')[0].Bone_ID, 'left_femur');
assert.equal(applyInventoryRows({}, [{ Bone_ID: 'left_femur', Presence: 'present' }], testBones).status.left_femur, 'present');
assert.throws(() => validateBackup({ format: 'wrong' }));

console.log('Osteo3D smoke tests: OK');
