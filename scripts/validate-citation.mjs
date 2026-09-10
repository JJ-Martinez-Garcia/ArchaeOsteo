import { readFile } from 'node:fs/promises';

const citation = await readFile('CITATION.cff', 'utf8');
const required = [
  /^cff-version:\s*1\.2\.0\s*$/m,
  /^type:\s*software\s*$/m,
  /^title:\s*"?Osteo3D"?\s*$/m,
  /^version:\s*\d+\.\d+\.\d+\s*$/m,
  /^authors:\s*$/m,
  /^repository-code:\s*"https:\/\/github\.com\/JJ-Martinez-Garcia\/ArchaeOsteo"\s*$/m,
  /^license:\s*MIT\s*$/m
];
const missing = required.filter(pattern => !pattern.test(citation));
if (missing.length) {
  console.error(`CITATION.cff inválido: faltan ${missing.length} campos obligatorios.`);
  process.exitCode = 1;
} else {
  console.log('CITATION.cff: OK · autoría, versión, licencia y repositorio verificados.');
}
