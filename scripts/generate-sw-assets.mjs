import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const packageJson = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'));
const cacheFingerprint = createHash('sha256')
  .update(`${packageJson.version}:${files.join('|')}`)
  .digest('hex')
  .slice(0, 12);
const cacheName = `osteo3d-shell-v${packageJson.version}-${cacheFingerprint}`;
const withAssets = source.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(files)};`);
if (!withAssets.includes("const CACHE = 'osteo3d-shell-v7';")) throw new Error('No se encontró la plantilla de caché del Service Worker');
await writeFile(swPath, withAssets.replace("const CACHE = 'osteo3d-shell-v7';", `const CACHE = '${cacheName}';`));
console.log(`Service Worker preparado: ${files.length} assets de build incluidos · caché ${cacheName}.`);
