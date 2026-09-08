import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const roots = ['src', 'scripts', 'tests'];
const extensions = new Set(['.js', '.mjs']);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(filePath));
    else if (extensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

const files = (await Promise.all(roots.map(collect))).flat().sort();
const failures = files.filter(file => spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }).status !== 0);
if (failures.length) throw new Error(`Sintaxis JavaScript inválida:\n- ${failures.join('\n- ')}`);
console.log(`JavaScript syntax OK: ${files.length} archivos verificados.`);
