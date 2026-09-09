const encoder = new TextEncoder();
const decoder = new TextDecoder();

function u16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32(value) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function join(parts) { const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1; return value >>> 0; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }

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

export function createOsteoArchive(projectBackup, models = []) {
  const entries = [{ name: 'project.json', data: encoder.encode(JSON.stringify(projectBackup, null, 2)) }, { name: 'MANIFEST.json', data: encoder.encode(JSON.stringify({ format: 'osteo3d-archive', version: 1, createdAt: new Date().toISOString(), models: models.map(model => model.name) }, null, 2)) }];
  for (const model of models) entries.push({ name: model.name, data: model.data });
  return createStoredZip(entries);
}

export function readOsteoArchive(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer); const entries = new Map(); let offset = 0;
  while (offset + 4 <= bytes.length && bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
    const method = bytes[offset + 8] | (bytes[offset + 9] << 8); const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24); const nameSize = bytes[offset + 26] | (bytes[offset + 27] << 8); const extraSize = bytes[offset + 28] | (bytes[offset + 29] << 8); const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameSize)); const start = offset + 30 + nameSize + extraSize; if (method !== 0 || start + compressedSize > bytes.length) throw new Error('Archivo Osteo3D no compatible o dañado.'); entries.set(name, bytes.slice(start, start + compressedSize)); offset = start + compressedSize;
  }
  if (!entries.has('project.json')) throw new Error('La copia Osteo3D no contiene project.json.');
  let project; try { project = JSON.parse(decoder.decode(entries.get('project.json'))); } catch { throw new Error('project.json no es JSON válido.'); }
  return { project, models: [...entries.entries()].filter(([name]) => name.startsWith('models/custom/')).map(([name, data]) => ({ name, data })) };
}
