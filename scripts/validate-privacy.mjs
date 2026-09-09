import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const externalNetwork = /(?:fetch|sendBeacon|WebSocket|\.open)\s*\(\s*[`'"`]https?:\/\//i;
const findings = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (/\.(?:js|mjs|ts|tsx)$/.test(entry.name)) {
      const source = await readFile(file, 'utf8');
      if (externalNetwork.test(source)) findings.push(path.relative(process.cwd(), file));
      if (/navigator\.sendBeacon\s*\(|new\s+WebSocket\s*\(|XMLHttpRequest/i.test(source)) findings.push(`${path.relative(process.cwd(), file)} (implicit transport)`);
    }
  }
}

await visit(root);
if (findings.length) throw new Error(`Privacy validation failed:\n- ${findings.join('\n- ')}`);
console.log('Privacy validation: no implicit external data transport in src/');
