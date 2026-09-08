import { readFile, writeFile } from 'node:fs/promises';

const [input, output, nodeName] = process.argv.slice(2);
if (!input || !output || !nodeName) throw new Error('Uso: node annotate-glb-node.mjs entrada.glb salida.glb Bone_ID');

const body = await readFile(input);
if (body.length < 20 || body.toString('ascii', 0, 4) !== 'glTF' || body.readUInt32LE(4) !== 2) {
  throw new Error('El archivo no es un GLB glTF 2.0 válido.');
}
const jsonLength = body.readUInt32LE(12);
const jsonType = body.toString('ascii', 16, 20);
if (jsonType !== 'JSON') throw new Error('El primer chunk GLB no es JSON.');
const json = JSON.parse(body.subarray(20, 20 + jsonLength).toString('utf8'));
if (!Array.isArray(json.nodes) || json.nodes.length === 0) throw new Error('El GLB no contiene nodos.');
json.nodes[0].name = nodeName;

const jsonBytes = Buffer.from(JSON.stringify(json));
const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
const rest = body.subarray(20 + jsonLength);
const outputBody = Buffer.alloc(12 + 8 + paddedJson.length + rest.length);
outputBody.write('glTF', 0, 4, 'ascii');
outputBody.writeUInt32LE(2, 4);
outputBody.writeUInt32LE(outputBody.length, 8);
outputBody.writeUInt32LE(paddedJson.length, 12);
outputBody.write('JSON', 16, 4, 'ascii');
paddedJson.copy(outputBody, 20);
rest.copy(outputBody, 20 + paddedJson.length);
await writeFile(output, outputBody);
