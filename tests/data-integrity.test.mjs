import assert from 'node:assert/strict';
import { parseCsv, applyInventoryRows, createBackup, validateBackup } from '../src/domain/backup.js';
import { importDentalRows } from '../src/domain/dental-import.js';
import { takeInventorySnapshot, applyInventorySnapshot } from '../src/domain/inventory-history.js';
import { normalizeProject, fallbackProjectKey, loadProject, listProjects, saveProject } from '../src/data/store.js';
import { createProjectWriter } from '../src/data/persistence.js';
import { createOsteoArchive, readOsteoArchive } from '../src/domain/backup-archive.js';

const bones = [{ id: 'skull' }, { id: 'mandible' }, { id: 'left_femur' }];
const archiveBytes = createOsteoArchive(createBackup({ projectId: 'archive-1', projectName: 'Copia con GLB' }), [{ name: 'models/custom/infant/left_femur.glb', data: new Uint8Array([0, 1, 2, 255]) }]);
const archive = readOsteoArchive(archiveBytes);
assert.equal(archive.project.project.projectName, 'Copia con GLB');
assert.equal(archive.models[0].name, 'models/custom/infant/left_femur.glb');
assert.deepEqual([...archive.models[0].data], [0, 1, 2, 255]);
assert.throws(() => readOsteoArchive(new Uint8Array([1, 2, 3])));
const csv = '\uFEFFBone_ID,Notes,Weight_g\r\nskull,"línea 1, \"\"comillas\"\"\r\nlínea 2",0\r\n\r\nmandible,"",\r\n';
const rows = parseCsv(csv);
assert.equal(rows.length, 2);
assert.equal(rows[0].Notes, 'línea 1, "comillas"\r\nlínea 2');
assert.equal(rows[0].Weight_g, '0');
assert.equal(rows[1].Notes, '');
for (const invalid of ['Bone_ID,Notes\nskull,"sin cierre', 'Bone_ID,Notes\nskull,"a"b', 'Bone_ID,Notes\nskull,a"b', 'Bone_ID,Notes\nskull', 'Bone_ID,Notes\nskull,a,extra', 'Bone_ID,Bone_ID\nskull,a']) assert.throws(() => parseCsv(invalid));
const original = { status: { skull: 'present' }, completeness: { skull: 40 }, fragments: { skull: 3 }, weights: { skull: 12 }, notes: { skull: 'original' }, report: { site: 'Original' } };
const untouched = structuredClone(original);
const partial = applyInventoryRows(original, [{ Bone_ID: 'skull', Weight_g: '', Presence: '', Notes: 'nota nueva' }], bones);
assert.equal(partial.status.skull, 'present');
assert.equal(partial.completeness.skull, 40);
assert.equal(partial.weights.skull, 12);
assert.equal(partial.fragments.skull, 3);
assert.equal(partial.notes.skull, 'nota nueva');
assert.deepEqual(original, untouched, 'Import is pure until confirmed');
const unknown = applyInventoryRows({}, [{ Bone_ID: 'skull', Weight_g: '', Fragments: null, Completeness: ' ' }], bones);
assert.deepEqual(unknown.weights, {});
assert.deepEqual(unknown.fragments, {});
assert.deepEqual(unknown.completeness, {});
const zero = applyInventoryRows({}, [{ Bone_ID: 'skull', Weight_g: 0, Fragments: '0', Completeness: 0, Presence: ' present ' }], bones);
assert.equal(zero.weights.skull, 0);
assert.equal(zero.fragments.skull, 0);
assert.equal(zero.completeness.skull, 0);
assert.equal(zero.status.skull, 'present');
const rejected = applyInventoryRows({ ...original, locked: { skull: true } }, [{ Bone_ID: 'skull', Notes: 'no', Site: 'Rejected' }, { Bone_ID: 'mandible', Weight_g: -1, Site: 'Rejected' }, { Bone_ID: 'left_femur', Presence: 'present', Taphonomy_Detail: '{bad' }], bones);
assert.equal(rejected.rejectedRows, 3);
assert.equal(rejected.importedRows, 0);
assert.equal(rejected.notes.skull, 'original');
assert.equal(rejected.status.left_femur, undefined, 'A malformed field rejects its entire row');
assert.equal(rejected.report.site, 'Original');
const duplicates = applyInventoryRows({}, [{ Bone_ID: 'skull', Weight_g: '-1' }, { Bone_ID: 'skull', Weight_g: '3' }], bones);
assert.equal(duplicates.rejectedRows, 2, 'Duplicate ID rejected even after an invalid first row');
for (const value of [null, undefined, '', ' ', false, [], {}]) {
  const project = normalizeProject({ weights: { skull: value }, fragments: { skull: value }, completeness: { skull: value } });
  assert.deepEqual(project.weights, {}); assert.deepEqual(project.fragments, {}); assert.deepEqual(project.completeness, {});
}
assert.equal(normalizeProject({ weights: { skull: 0 } }).weights.skull, 0);
assert.equal(normalizeProject([]), null);
assert.throws(() => validateBackup({ format: 'osteo3d-project-backup', version: 1, project: [] }));
const visualBackup = validateBackup(createBackup({ skeletonFilter: 'axial', regionFilter: 'Cráneo', explosion: 70, tableMode: true, orthographic: true, isolate: true, lightingMode: 'laboratory' }));
assert.equal(visualBackup.explosion, 70); assert.equal(visualBackup.tableMode, true); assert.equal(visualBackup.lightingMode, 'laboratory');
assert.equal(validateBackup(createBackup({ weights: { skull: 0 }, notes: { skull: rows[0].Notes } })).notes.skull, rows[0].Notes);

assert.deepEqual(importDentalRows({ 12: 'caries' }, [{ Tooth_FDI: 11, Status: 'Presente' }, { Tooth_FDI: 12, Status: '' }]), { 11: 'present', 12: 'caries' });
assert.deepEqual(importDentalRows({ 51: 'present' }, [{ Tooth_FDI: 51, Status: 'not_recorded' }], { deciduous: true }), {});
assert.deepEqual(importDentalRows({ 11: 'present' }, [{ Tooth_FDI: 11, Status: 'absent_pm' }], { locked: { 11: true } }), { 11: 'present' });
assert.throws(() => importDentalRows({}, [{ Tooth_FDI: 51, Status: 'present' }]));
assert.throws(() => importDentalRows({}, [{ Tooth_FDI: 11, Status: 'unexpected' }]));
assert.throws(() => importDentalRows({}, [{ Tooth_FDI: 11, Status: 'present' }, { Tooth_FDI: 11, Status: 'wear' }]));
const state = { ...original, pathologyDetails: { skull: { description: 'antes' } }, dental: { 11: 'wear' } };
const snapshot = takeInventorySnapshot(state);
state.weights.skull = 99; state.pathologyDetails.skull.description = 'después'; state.dental[11] = 'caries';
applyInventorySnapshot(state, snapshot);
assert.equal(state.weights.skull, 12); assert.equal(state.pathologyDetails.skull.description, 'antes'); assert.equal(state.dental[11], 'wear');
state.pathologyDetails.skull.description = 'nueva';
assert.equal(snapshot.pathologyDetails.skull.description, 'antes', 'Undo snapshots cannot be mutated by later edits');
const photoState = { photos: { skull: [{ name: 'a', dataUrl: 'data:image/png;base64,AA' }] }, indeterminateFragments: [{ type: 'astilla' }] };
const photoSnapshot = takeInventorySnapshot(photoState);
photoState.photos.skull.push({ name: 'b', dataUrl: 'data:image/png;base64,BB' }); photoState.indeterminateFragments.splice(0, 1);
applyInventorySnapshot(photoState, photoSnapshot);
assert.equal(photoState.photos.skull.length, 1, 'Photo additions are undoable as part of the common snapshot');
assert.equal(photoState.indeterminateFragments.length, 1, 'Indeterminate-fragment changes are undoable as part of the common snapshot');

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
const storage = new MemoryStorage(), fail = async () => { throw new Error('IDB unavailable'); };
const fallbackWriter = createProjectWriter({ primary: fail, storage: () => storage });
assert.equal((await fallbackWriter({ id: 'A', weights: { skull: 2 }, updatedAt: '2026-09-09T12:00:00Z' })).backend, 'localStorage');
assert.equal((await fallbackWriter({ id: 'B', weights: { skull: 3 } })).ok, true);
assert.equal(JSON.parse(storage.getItem(fallbackProjectKey('A'))).weights.skull, 2);
assert.equal(JSON.parse(storage.getItem(fallbackProjectKey('B'))).weights.skull, 3);
const failedWriter = createProjectWriter({ primary: fail, storage: () => ({ setItem() { throw new Error('Quota'); } }) });
assert.equal((await failedWriter({ id: 'A' })).ok, false);
const primaryWriter = createProjectWriter({ primary: async () => {}, storage: () => storage });
assert.equal((await primaryWriter({ id: 'A' })).backend, 'indexedDB');
assert.equal(storage.getItem(fallbackProjectKey('A')), null, 'Successful primary save clears superseded fallback');
const written = []; let release;
const queued = createProjectWriter({ primary: async project => { written.push(project); if (written.length === 1) await new Promise(resolve => { release = resolve; }); }, storage: () => storage });
const draft = { id: 'A', weights: { skull: 4 } };
const firstSave = queued(draft);
draft.weights.skull = 5;
const secondSave = queued(draft);
await Promise.resolve(); assert.equal(written.length, 1); release(); await Promise.all([firstSave, secondSave]);
assert.deepEqual(written.map(project => project.weights.skull), [4, 5]);

globalThis.localStorage = storage;
globalThis.window = {};
storage.setItem('osteo3d-mvp', JSON.stringify({ id: 'legacy', weights: { skull: 9 } }));
assert.equal((await loadProject('B')).weights.skull, 3);
assert.equal((await loadProject('legacy')).weights.skull, 9);
assert.equal(await loadProject('missing'), null, 'Never load a different project when an ID is missing');
assert.deepEqual((await listProjects()).map(project => project.id).sort(), ['B', 'legacy']);
let closed = false;
const db = {
  transaction() {
    const tx = { objectStore() { return { put() { queueMicrotask(() => tx.onabort()); } }; } };
    return tx;
  }, close() { closed = true; }
};
globalThis.window.indexedDB = globalThis.indexedDB = { open() { const request = { result: db }; queueMicrotask(() => request.onsuccess()); return request; } };
await assert.rejects(saveProject({ id: 'A' }), /cancelada/);
assert.equal(closed, true, 'Aborted transactions close their database connection');
let lateClose = false;
globalThis.indexedDB = { open() { const request = { result: { close() { lateClose = true; } } }; queueMicrotask(() => { request.onblocked(); queueMicrotask(() => request.onsuccess()); }); return request; } };
await assert.rejects(saveProject({ id: 'A' }), /bloqueado/);
await Promise.resolve(); assert.equal(lateClose, true, 'A late database connection is closed after a blocked-open failure');
storage.setItem(fallbackProjectKey('A'), JSON.stringify({ id: 'A', weights: { skull: 7 }, updatedAt: '2026-09-09T12:00:00Z' }));
const older = { id: 'A', weights: { skull: 1 }, updatedAt: '2026-09-08T12:00:00Z' };
globalThis.indexedDB = { open() {
  const request = { result: { close() {}, transaction() { return { objectStore() {
    const result = value => { const get = { result: value }; queueMicrotask(() => get.onsuccess()); return get; };
    return { get: () => result(older), getAll: () => result([older]) };
  } }; } } }; queueMicrotask(() => request.onsuccess()); return request;
} };
assert.equal((await loadProject('A')).weights.skull, 7, 'Latest fallback supersedes a stale IndexedDB record');
assert.equal((await listProjects()).find(project => project.id === 'A').weights.skull, 7);
console.log('Data integrity: CSV multiline/strict parsing, blank vs zero, locks, atomic rows, dental codes, undo, queued saves and storage failures OK');
