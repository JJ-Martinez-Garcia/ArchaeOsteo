const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const ARCHIVE_LIMITS = Object.freeze({ maxBytes: 256 * 1024 * 1024, maxEntries: 2048, maxEntryBytes: 64 * 1024 * 1024 });

function u16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32(value) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function join(parts) { const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1; return value >>> 0; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
function readU32(bytes, offset) { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0; }
async function sha256Hex(bytes) { const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }

export function createStoredZip(entries) {
  const locals = [], centrals = []; let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(String(entry.name)); const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data); const crc = crc32(data);
    const local = join([new Uint8Array([0x50,0x4b,0x03,0x04]), u16(20), u16(0x800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
    locals.push(local);
    centrals.push(join([new Uint8Array([0x50,0x4b,0x01,0x02]), u16(20), u16(20), u16(0x800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local.length;
  }
  const body = join(locals), central = join(centrals);
  return join([body, central, new Uint8Array([0x50,0x4b,0x05,0x06]), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(central.length), u32(body.length), u16(0)]);
}

export async function createOsteoArchive(projectBackup, models = []) {
  const projectData = encoder.encode(JSON.stringify(projectBackup, null, 2));
  if (projectData.length > ARCHIVE_LIMITS.maxEntryBytes) throw new Error('El proyecto supera el límite de 64 MB por entrada.');
  if (!Array.isArray(models) || models.length > ARCHIVE_LIMITS.maxEntries - 2) throw new Error('La copia contiene demasiados modelos personalizados.');
  const names = new Set(['project.json', 'MANIFEST.json']);
  const normalizedModels = models.map(model => {
    const name = String(model?.name || '');
    const data = model?.data instanceof Uint8Array ? model.data : new Uint8Array(model?.data || []);
    if (!name.startsWith('models/custom/') || name.startsWith('/') || name.includes('..') || names.has(name)) throw new Error('Nombre de modelo no válido para la copia.');
    if (data.length > ARCHIVE_LIMITS.maxEntryBytes) throw new Error(`El modelo ${name} supera el límite de 64 MB.`);
    names.add(name);
    return { name, data };
  });
  if (projectData.length + normalizedModels.reduce((sum, model) => sum + model.data.length, 0) > ARCHIVE_LIMITS.maxBytes) throw new Error('La copia supera el límite total de 256 MB.');
  const checksums = Object.fromEntries(normalizedModels.map(model => [model.name, crc32(model.data).toString(16).padStart(8, '0')]));
  const hashEntries = [['project.json', projectData], ...normalizedModels.map(model => [model.name, model.data])];
  const sha256 = Object.fromEntries(await Promise.all(hashEntries.map(async ([name, data]) => [name, await sha256Hex(data)])));
  const entries = [{ name: 'project.json', data: projectData }, { name: 'MANIFEST.json', data: encoder.encode(JSON.stringify({ format: 'osteo3d-archive', version: 2, createdAt: new Date().toISOString(), models: normalizedModels.map(model => model.name), checksums, sha256 }, null, 2)) }];
  for (const model of normalizedModels) entries.push(model);
  if (entries[1].data.length > ARCHIVE_LIMITS.maxEntryBytes || entries.reduce((sum, entry) => sum + entry.data.length, 0) > ARCHIVE_LIMITS.maxBytes) throw new Error('La copia supera los límites de tamaño permitidos.');
  return createStoredZip(entries);
}

export async function readOsteoArchive(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer); if (bytes.length > ARCHIVE_LIMITS.maxBytes) throw new Error('La copia Osteo3D supera el límite de 256 MB.'); const entries = new Map(); let offset = 0; let totalUncompressed = 0;
  while (offset + 4 <= bytes.length && bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
    if (entries.size >= ARCHIVE_LIMITS.maxEntries) throw new Error('La copia Osteo3D contiene demasiadas entradas.');
    if (offset + 30 > bytes.length) throw new Error('Archivo Osteo3D no compatible o dañado.');
    const method = bytes[offset + 8] | (bytes[offset + 9] << 8); const expectedCrc = readU32(bytes, offset + 14); const compressedSize = readU32(bytes, offset + 18); const uncompressedSize = readU32(bytes, offset + 22); const nameSize = bytes[offset + 26] | (bytes[offset + 27] << 8); const extraSize = bytes[offset + 28] | (bytes[offset + 29] << 8); const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameSize)); const start = offset + 30 + nameSize + extraSize; totalUncompressed += uncompressedSize; if (compressedSize > ARCHIVE_LIMITS.maxEntryBytes || uncompressedSize > ARCHIVE_LIMITS.maxEntryBytes || totalUncompressed > ARCHIVE_LIMITS.maxBytes || method !== 0 || compressedSize !== uncompressedSize || start < offset + 30 || start + compressedSize > bytes.length || !name || name.startsWith('/') || name.includes('..') || entries.has(name)) throw new Error('Archivo Osteo3D no compatible, inseguro o demasiado grande.'); const data = bytes.slice(start, start + compressedSize); if (crc32(data) !== expectedCrc) throw new Error(`Archivo Osteo3D dañado: ${name}.`); entries.set(name, data); offset = start + compressedSize;
  }
  if (!entries.has('project.json')) throw new Error('La copia Osteo3D no contiene project.json.');
  let project, manifest = { format: 'osteo3d-archive', version: 1, models: [] }; try { project = JSON.parse(decoder.decode(entries.get('project.json'))); if (entries.has('MANIFEST.json')) manifest = JSON.parse(decoder.decode(entries.get('MANIFEST.json'))); } catch { throw new Error('project.json o MANIFEST.json no es JSON válido.'); }
  if (!manifest || manifest.format !== 'osteo3d-archive' || ![1, 2].includes(manifest.version) || !Array.isArray(manifest.models)) throw new Error('MANIFEST.json no es compatible.');
  const models = [...entries.entries()].filter(([name]) => name.startsWith('models/custom/')).map(([name, data]) => ({ name, data }));
  const declaredModels = new Set(manifest.models);
  if (declaredModels.size !== manifest.models.length || declaredModels.size !== models.length || models.some(model => !declaredModels.has(model.name))) throw new Error('MANIFEST.json no coincide con los modelos de la copia.');
  for (const model of models) { const expected = manifest.checksums?.[model.name]; if (expected && expected !== crc32(model.data).toString(16).padStart(8, '0')) throw new Error(`Archivo Osteo3D dañado: ${model.name}.`); }
  if (manifest.version >= 2) { if (!manifest.checksums || !manifest.sha256 || !manifest.sha256['project.json'] || models.some(model => !manifest.sha256[model.name])) throw new Error('MANIFEST.json no contiene hashes completos.'); const expectedProject = manifest.sha256['project.json']; if (expectedProject !== await sha256Hex(entries.get('project.json'))) throw new Error('Archivo Osteo3D dañado: project.json.'); for (const model of models) { const expected = manifest.sha256[model.name]; if (expected !== await sha256Hex(model.data)) throw new Error(`Archivo Osteo3D dañado: ${model.name}.`); } }
  return { project, manifest, models };
}
