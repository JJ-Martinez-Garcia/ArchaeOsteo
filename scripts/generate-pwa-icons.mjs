import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';

const outputDirectory = new URL('../public/icons/', import.meta.url);
const background = [16, 42, 67, 255];
const bone = [215, 168, 110, 255];

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const payload = Buffer.concat([typeBytes, data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  return Buffer.concat([length, payload, checksum]);
}

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 192;
  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels.set(color, offset);
  };
  const roundedRect = (left, top, right, bottom, radius, color) => {
    for (let y = Math.floor(top); y < Math.ceil(bottom); y += 1) {
      for (let x = Math.floor(left); x < Math.ceil(right); x += 1) {
        const dx = Math.max(left + radius - x, 0, x - (right - radius));
        const dy = Math.max(top + radius - y, 0, y - (bottom - radius));
        if (dx * dx + dy * dy <= radius * radius) setPixel(x, y, color);
      }
    }
  };
  const ellipse = (cx, cy, rx, ry, color) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        if (((x - cx) ** 2) / rx ** 2 + ((y - cy) ** 2) / ry ** 2 <= 1) setPixel(x, y, color);
      }
    }
  };
  roundedRect(0, 0, size, size, 36 * scale, background);
  ellipse(96 * scale, 59 * scale, 31 * scale, 31 * scale, bone);
  roundedRect(55 * scale, 78 * scale, 137 * scale, 153 * scale, 35 * scale, bone);
  ellipse(96 * scale, 119 * scale, 7 * scale, 7 * scale, background);
  ellipse(84 * scale, 59 * scale, 5 * scale, 7 * scale, background);
  ellipse(108 * scale, 59 * scale, 5 * scale, 7 * scale, background);
  const rows = [];
  for (let y = 0; y < size; y += 1) rows.push(Buffer.concat([Buffer.from([0]), pixels.subarray(y * size * 4, (y + 1) * size * 4)]));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

await mkdir(outputDirectory, { recursive: true });
for (const size of [192, 512]) await writeFile(new URL(`osteo3d-${size}.png`, outputDirectory), renderIcon(size));
console.log('Iconos PWA PNG generados: 192x192 y 512x512');
