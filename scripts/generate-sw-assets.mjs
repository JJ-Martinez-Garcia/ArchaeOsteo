import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const assetsRoot = path.join(root, 'assets');
const files = (await readdir(assetsRoot, { withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => `./assets/${entry.name}`)
  .sort();
const swPath = path.join(root, 'sw.js');
const source = await readFile(swPath, 'utf8');
const marker = 'const BUILD_ASSETS = [];';
if (!source.includes(marker)) throw new Error('No se encontró el marcador BUILD_ASSETS en dist/sw.js');
await writeFile(swPath, source.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(files)};`));
console.log(`Service Worker preparado: ${files.length} assets de build incluidos.`);
