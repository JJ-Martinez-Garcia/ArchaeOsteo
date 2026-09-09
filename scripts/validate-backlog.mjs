import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backlog = await readFile(path.join(root, 'PROJECT_BACKLOG.md'), 'utf8');
const review = await readFile(path.join(root, 'PROJECT_REVIEW.md'), 'utf8');
const ids = [...backlog.matchAll(/^\|\s*(\d+)\s*\|/gm)].map(match => Number(match[1]));
const expected = Array.from({ length: 119 }, (_, index) => index + 1);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
const missing = expected.filter(id => !ids.includes(id));
const extras = ids.filter(id => !expected.includes(id));
const requiredSections = ['## Requisitos y pruebas que faltan para cerrarlos', '## Mejoras adicionales propuestas', '## Criterio de finalización'];
const errors = [];
if (ids.length !== expected.length) errors.push(`se esperaban 119 filas y hay ${ids.length}`);
if (duplicates.length) errors.push(`filas duplicadas: ${[...new Set(duplicates)].join(', ')}`);
if (missing.length) errors.push(`filas ausentes: ${missing.join(', ')}`);
if (extras.length) errors.push(`filas fuera de rango: ${extras.join(', ')}`);
for (const section of requiredSections) if (!backlog.includes(section)) errors.push(`falta la sección «${section}»`);
if (!review.includes('## Verificación reproducible')) errors.push('falta la sección «## Verificación reproducible» en PROJECT_REVIEW.md');
if (errors.length) { console.error(`Backlog inválido:\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Backlog OK: ${ids.length} requisitos numerados 1–119, sin duplicados ni huecos.`);
