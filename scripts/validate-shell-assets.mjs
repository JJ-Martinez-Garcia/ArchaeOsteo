import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const source = await readFile(path.join(dist, 'sw.js'), 'utf8');
const match = source.match(/^const SHELL = (\[[^;]+\]);/m);
assert.ok(match, 'dist/sw.js no contiene una lista SHELL válida. Ejecuta pnpm build.');
const shell = JSON.parse(match[1].replaceAll("'", '"'));
assert.ok(Array.isArray(shell) && shell.length > 0, 'La lista SHELL está vacía.');
const missing = [];
for (const entry of shell) {
  const relative = entry === './' ? '' : entry.replace(/^\.\//, '');
  try { await stat(path.join(dist, relative)); } catch { missing.push(entry); }
}
assert.deepEqual(missing, [], `Recursos precacheados inexistentes en dist: ${missing.join(', ')}`);
console.log(`Service Worker shell OK: ${shell.length} rutas precacheadas presentes.`);
