import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const SOURCE_URL = 'https://github.com/yamz8/human-body-simulator/blob/e6570d72bc74f044439798e8503d02e91b87b1ea/public/models/overview-skeleton.glb';
const SOURCE_COMMIT = 'e6570d72bc74f044439798e8503d02e91b87b1ea';

function addPair(targets, id, sourceName) {
  targets.push({ boneId: `right_${id}`, sourceNames: [sourceName], mirror: false });
  targets.push({ boneId: `left_${id}`, sourceNames: [sourceName], mirror: true });
}

export function buildOpen3dTargets() {
  const targets = [
    { boneId: 'mandible', sourceNames: ['Mandible bone'], mirror: false },
    { boneId: 'c1_atlas', sourceNames: ['Atlas (C1)'], mirror: false },
    { boneId: 'sternum', sourceNames: ['Body of sternum', 'Manubrium of sternum'], mirror: false },
    { boneId: 'sacrum', sourceNames: ['Sacrum'], mirror: false },
    { boneId: 'coccyx', sourceNames: ['Coccyx'], mirror: false },
  ];

  targets.push({ boneId: 'c2', sourceNames: ['Axis (C2)'], mirror: false });
  for (let index = 3; index <= 7; index += 1) targets.push({ boneId: `c${index}`, sourceNames: [`Cervical vertebrae (C${index})`], mirror: false });
  for (let index = 1; index <= 12; index += 1) targets.push({ boneId: `t${index}`, sourceNames: [`Thoracic vertebrae (T${index})`], mirror: false });
  for (let index = 1; index <= 5; index += 1) targets.push({ boneId: `l${index}`, sourceNames: [`Lumbar vertebrae (L${index})`], mirror: false });

  for (const [id, sourceName] of [
    ['clavicle', 'Clavicle.r'], ['scapula', 'Scapula.r.'], ['humerus', 'Humerus.r'],
    ['radius', 'Radius.r'], ['ulna', 'Ulna.r'], ['coxal', 'Hip bone.r'],
    ['femur', 'Femur.r'], ['patella', 'Patella.r'], ['tibia', 'Tibia.r'], ['fibula', 'Fibula.r'],
  ]) addPair(targets, id, sourceName);

  const ribOrdinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  ribOrdinals.forEach((ordinal, index) => addPair(targets, `rib_${index + 1}`, `Rib (${ordinal}).r`));

  for (const [id, sourceName] of [
    ['scaphoid', 'Scaphoid.r'], ['lunate', 'Lunate bone.r'], ['triquetrum', 'Triquetrum.r'],
    ['pisiform', 'Pisiform.r'], ['trapezium', 'Trapezium.r'], ['trapezoid', 'Trapezoid.r'],
    ['capitate', 'Capitate.r'], ['hamate', 'Hamate.r'],
  ]) addPair(targets, id, sourceName);

  const metacarpalOrdinals = ['1st', '2nd', '3rd', '4th', '5th'];
  metacarpalOrdinals.forEach((ordinal, index) => addPair(targets, `metacarpal_${index + 1}`, `${ordinal} metacarpal bone.r`));

  const proximalFingerOrdinals = ['1st', '2d', '3rd', '4th', '5th'];
  const middleFingerOrdinals = [null, '2d', '3rd', '4th', '5th'];
  const distalFingerOrdinals = ['1st', '2d', '3d', '4th', '5th'];
  for (let digit = 1; digit <= 5; digit += 1) {
    addPair(targets, `digit_${digit}_proximal`, `Proximal phalanx of ${proximalFingerOrdinals[digit - 1]} finger.r`);
    if (middleFingerOrdinals[digit - 1]) addPair(targets, `digit_${digit}_middle`, `Middle phalanx of ${middleFingerOrdinals[digit - 1]} finger.r`);
    addPair(targets, `digit_${digit}_distal`, `Distal phalanx of ${distalFingerOrdinals[digit - 1]} finger.r`);
  }

  for (const [id, sourceName] of [
    ['talus', 'Talus.r'], ['calcaneus', 'Calcaneus.r'], ['navicular', 'Navicular bone.r'],
    ['medial_cuneiform', 'Medial cuneiform bone.r'], ['intermediate_cuneiform', 'Intermediate cuneiform bone.r'],
    ['lateral_cuneiform', 'Lateral cuneiform bone.r'], ['cuboid', 'Cuboid bone.r'],
  ]) addPair(targets, id, sourceName);

  const footOrdinals = ['first', 'second', 'third', 'fourth', 'fifth'];
  const metatarsalNames = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  for (let digit = 1; digit <= 5; digit += 1) {
    addPair(targets, `metatarsal_${digit}`, `${metatarsalNames[digit - 1]} metatarsal bone.r`);
    addPair(targets, `toe_${digit}_proximal`, `Proximal phalanx of ${footOrdinals[digit - 1]} finger of foot.r`);
    if (digit !== 1) addPair(targets, `toe_${digit}_middle`, `Middle phalanx of ${footOrdinals[digit - 1]} finger of foot.r`);
    addPair(targets, `toe_${digit}_distal`, `Distal phalanx of ${footOrdinals[digit - 1]} finger of foot.r`);
  }

  return targets;
}

function parseGlb(body) {
  if (body.length < 28 || body.toString('utf8', 0, 4) !== 'glTF') throw new Error('El archivo no es un GLB válido.');
  if (body.readUInt32LE(4) !== 2 || body.readUInt32LE(8) !== body.length) throw new Error('La cabecera GLB no es compatible.');
  let offset = 12;
  let document;
  let binary;
  while (offset + 8 <= body.length) {
    const length = body.readUInt32LE(offset);
    const type = body.readUInt32LE(offset + 4);
    const chunk = body.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) document = JSON.parse(chunk.toString('utf8').trim());
    if (type === BIN_CHUNK) binary = chunk;
    offset += 8 + length;
  }
  if (!document || !binary) throw new Error('El GLB debe contener chunks JSON y BIN.');
  return { document, binary };
}

function copyMaterial(material = {}) {
  const result = {};
  for (const key of ['name', 'alphaMode', 'alphaCutoff', 'doubleSided', 'emissiveFactor']) {
    if (material[key] !== undefined) result[key] = material[key];
  }
  const sourcePbr = material.pbrMetallicRoughness || {};
  const pbr = {};
  for (const key of ['baseColorFactor', 'metallicFactor', 'roughnessFactor']) {
    if (sourcePbr[key] !== undefined) pbr[key] = sourcePbr[key];
  }
  if (Object.keys(pbr).length > 0) result.pbrMetallicRoughness = pbr;
  return result;
}

function makeGlb(document, binary) {
  const jsonBody = Buffer.from(JSON.stringify(document), 'utf8');
  const jsonPadding = (4 - (jsonBody.length % 4)) % 4;
  const binPadding = (4 - (binary.length % 4)) % 4;
  const jsonLength = jsonBody.length + jsonPadding;
  const binLength = binary.length + binPadding;
  const totalLength = 12 + 8 + jsonLength + 8 + binLength;
  const output = Buffer.alloc(totalLength);
  output.write('glTF', 0, 4, 'ascii');
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(jsonLength, 12);
  output.writeUInt32LE(JSON_CHUNK, 16);
  jsonBody.copy(output, 20);
  output.fill(0x20, 20 + jsonBody.length, 20 + jsonLength);
  const binHeader = 20 + jsonLength;
  output.writeUInt32LE(binLength, binHeader);
  output.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  binary.copy(output, binHeader + 8);
  return output;
}

function extractTarget(source, target, sourceSha256) {
  const sourceNodeByName = new Map(source.document.nodes.map((node, index) => [node.name, { node, index }]));
  const selected = target.sourceNames.map(name => {
    const match = sourceNodeByName.get(name);
    if (!match || !Number.isInteger(match.node.mesh)) throw new Error(`${target.boneId}: no existe la malla fuente '${name}'.`);
    return match;
  });

  const oldAccessorIds = new Set();
  const oldMaterialIds = new Set();
  const oldBufferViewIds = new Set();
  const sourceMeshes = selected.map(({ node }) => source.document.meshes[node.mesh]);
  for (const mesh of sourceMeshes) {
    for (const primitive of mesh.primitives || []) {
      Object.values(primitive.attributes || {}).forEach(id => oldAccessorIds.add(id));
      if (Number.isInteger(primitive.indices)) oldAccessorIds.add(primitive.indices);
      for (const morphTarget of primitive.targets || []) Object.values(morphTarget).forEach(id => oldAccessorIds.add(id));
      if (Number.isInteger(primitive.material)) oldMaterialIds.add(primitive.material);
      const dracoView = primitive.extensions?.KHR_draco_mesh_compression?.bufferView;
      if (Number.isInteger(dracoView)) oldBufferViewIds.add(dracoView);
    }
  }

  for (const accessorId of oldAccessorIds) {
    const accessor = source.document.accessors[accessorId];
    if (Number.isInteger(accessor.bufferView)) oldBufferViewIds.add(accessor.bufferView);
    if (Number.isInteger(accessor.sparse?.indices?.bufferView)) oldBufferViewIds.add(accessor.sparse.indices.bufferView);
    if (Number.isInteger(accessor.sparse?.values?.bufferView)) oldBufferViewIds.add(accessor.sparse.values.bufferView);
  }

  const bufferViewMap = new Map([...oldBufferViewIds].sort((a, b) => a - b).map((id, index) => [id, index]));
  const chunks = [];
  const bufferViews = [];
  let binaryOffset = 0;
  for (const [oldId] of bufferViewMap) {
    const sourceView = source.document.bufferViews[oldId];
    if ((sourceView.buffer || 0) !== 0) throw new Error(`${target.boneId}: buffer externo no compatible.`);
    const padding = (4 - (binaryOffset % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      binaryOffset += padding;
    }
    const body = source.binary.subarray(sourceView.byteOffset || 0, (sourceView.byteOffset || 0) + sourceView.byteLength);
    const nextView = { ...sourceView, buffer: 0, byteOffset: binaryOffset };
    bufferViews.push(nextView);
    chunks.push(body);
    binaryOffset += body.length;
  }

  const accessorMap = new Map([...oldAccessorIds].sort((a, b) => a - b).map((id, index) => [id, index]));
  const accessors = [...accessorMap].map(([oldId]) => {
    const accessor = structuredClone(source.document.accessors[oldId]);
    if (Number.isInteger(accessor.bufferView)) accessor.bufferView = bufferViewMap.get(accessor.bufferView);
    if (Number.isInteger(accessor.sparse?.indices?.bufferView)) accessor.sparse.indices.bufferView = bufferViewMap.get(accessor.sparse.indices.bufferView);
    if (Number.isInteger(accessor.sparse?.values?.bufferView)) accessor.sparse.values.bufferView = bufferViewMap.get(accessor.sparse.values.bufferView);
    return accessor;
  });

  const materialMap = new Map([...oldMaterialIds].sort((a, b) => a - b).map((id, index) => [id, index]));
  const materials = [...materialMap].map(([oldId]) => copyMaterial(source.document.materials[oldId]));
  const meshes = sourceMeshes.map(mesh => {
    const output = { ...mesh, primitives: (mesh.primitives || []).map(sourcePrimitive => {
      const primitive = structuredClone(sourcePrimitive);
      primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes || {}).map(([semantic, id]) => [semantic, accessorMap.get(id)]));
      if (Number.isInteger(primitive.indices)) primitive.indices = accessorMap.get(primitive.indices);
      if (Number.isInteger(primitive.material)) primitive.material = materialMap.get(primitive.material);
      if (primitive.targets) primitive.targets = primitive.targets.map(morphTarget => Object.fromEntries(Object.entries(morphTarget).map(([semantic, id]) => [semantic, accessorMap.get(id)])));
      if (Number.isInteger(primitive.extensions?.KHR_draco_mesh_compression?.bufferView)) {
        primitive.extensions.KHR_draco_mesh_compression.bufferView = bufferViewMap.get(primitive.extensions.KHR_draco_mesh_compression.bufferView);
      }
      return primitive;
    }) };
    return output;
  });

  const childNodes = selected.map(({ node }, index) => {
    const child = { name: node.name, mesh: index };
    if (target.mirror) child.scale = [-1, 1, 1];
    return child;
  });
  const document = {
    asset: { version: '2.0', generator: 'Osteo3D Open3Dmodel extractor' },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes: [{
      name: target.boneId,
      children: childNodes.map((_, index) => index + 1),
      extras: { bone_id: target.boneId, mirrored_from_right: target.mirror },
    }, ...childNodes],
    meshes,
    accessors,
    materials,
    bufferViews,
    buffers: [{ byteLength: binaryOffset }],
    extensionsUsed: ['KHR_draco_mesh_compression'],
    extensionsRequired: ['KHR_draco_mesh_compression'],
    extras: {
      source: SOURCE_URL,
      source_commit: SOURCE_COMMIT,
      source_sha256: sourceSha256,
      license: 'CC BY-SA 4.0',
      modifications: 'Malla separada por Bone_ID, texturas normales retiradas y lado izquierdo generado por espejo cuando corresponde.',
    },
  };
  return makeGlb(document, Buffer.concat(chunks));
}

export async function extractOpen3dSkeleton(inputPath, outputPath) {
  const body = await readFile(inputPath);
  const source = parseGlb(body);
  const sourceSha256 = createHash('sha256').update(body).digest('hex');
  const targets = buildOpen3dTargets();
  const ids = targets.map(target => target.boneId);
  if (targets.length !== 178 || new Set(ids).size !== targets.length) throw new Error(`Mapa Open3Dmodel inválido: ${targets.length} targets, ${new Set(ids).size} IDs únicos.`);
  await mkdir(outputPath, { recursive: true });
  let outputBytes = 0;
  for (const target of targets) {
    const output = extractTarget(source, target, sourceSha256);
    await writeFile(path.join(outputPath, `${target.boneId}.glb`), output);
    outputBytes += output.length;
  }
  return { count: targets.length, outputBytes, sourceSha256 };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  const [, , input, output = 'public/models/adult_male'] = process.argv;
  if (!input) throw new Error('Uso: node scripts/extract-open3d-skeleton.mjs <overview-skeleton.glb> [directorio-salida]');
  const result = await extractOpen3dSkeleton(path.resolve(input), path.resolve(output));
  console.log(`Open3Dmodel extraído: ${result.count} GLB · ${(result.outputBytes / 1048576).toFixed(2)} MB · SHA-256 fuente ${result.sourceSha256}`);
}
