const makeBone = (id, es, en, la, region, side, p, e, size, type = 'placeholder') => ({
  id, es, en, la, region, side, p, e, shape: 'bone', size, type
});

const bones = [];
const add = (...args) => bones.push(makeBone(...args));

// Columna: cada vértebra mantiene un ID estable para inventario y futuros GLB.
for (let i = 2; i <= 7; i += 1) add(`c${i}`, `Vértebra cervical C${i}`, `Cervical vertebra C${i}`, `Vertebra cervicalis ${i}`, 'Columna', '—', [0, 2.45 - (i - 2) * .2, 0], [-2.8 + (i - 2) * .45, 3.7, 0], [.18, .14, .18], 'vertebra');
for (let i = 1; i <= 12; i += 1) add(`t${i}`, `Vértebra torácica T${i}`, `Thoracic vertebra T${i}`, `Vertebra thoracica ${i}`, 'Columna', '—', [0, 1.15 - (i - 1) * .19, 0], [-2.6 + (i - 1) * .32, 2.5, 0], [.2, .13, .2], 'vertebra');
for (let i = 1; i <= 5; i += 1) add(`l${i}`, `Vértebra lumbar L${i}`, `Lumbar vertebra L${i}`, `Vertebra lumbalis ${i}`, 'Columna', '—', [0, -.98 - (i - 1) * .22, 0], [-1.9 + (i - 1) * .4, 1.4, 0], [.23, .16, .23], 'vertebra');
add('sacrum', 'Sacro', 'Sacrum', 'Os sacrum', 'Columna', '—', [0, -2.05, 0], [0, -1.4, 0], [.42, .58, .18], 'vertebra');
add('coccyx', 'Cóccix', 'Coccyx', 'Os coccygis', 'Columna', '—', [0, -2.65, 0], [0, -.65, 0], [.18, .28, .14], 'vertebra');
add('cervical_indeterminate', 'Vértebra cervical indeterminada', 'Indeterminate cervical vertebra', 'Vertebra cervicalis indeterminata', 'Columna', '—', [-.8, 2.55, .18], [-3.4, 3.8, .18], [.2, .14, .2], 'vertebra_indeterminate');
add('thoracic_indeterminate', 'Vértebra torácica indeterminada', 'Indeterminate thoracic vertebra', 'Vertebra thoracica indeterminata', 'Columna', '—', [-.8, .55, .18], [-3.1, 2.6, .18], [.22, .14, .2], 'vertebra_indeterminate');
add('lumbar_indeterminate', 'Vértebra lumbar indeterminada', 'Indeterminate lumbar vertebra', 'Vertebra lumbalis indeterminata', 'Columna', '—', [-.8, -.9, .18], [-2.7, 1.5, .18], [.24, .16, .22], 'vertebra_indeterminate');

// Costillas individualizadas, con lateralidad y número anatómico.
for (const side of [['left', 'Izquierda', -1], ['right', 'Derecha', 1]]) {
  for (let i = 1; i <= 12; i += 1) {
    const y = 1.9 - (i - 1) * .18;
    add(`${side[0]}_rib_${i}`, `Costilla ${i} ${side[1].toLowerCase()}`, `${side[1]} rib ${i}`, `Costa ${side[0] === 'left' ? 'sinistra' : 'dextra'} ${i}`, 'Tórax', side[1], [side[2] * (.62 + i * .015), y, -.12], [side[2] * (2.55 + (i % 3) * .18), 2.2 - i * .16, 0], [1.05 - i * .025, .055, .055], 'rib');
  }
}
add('left_rib_indeterminate', 'Costilla izquierda indeterminada', 'Indeterminate left rib', 'Costa sinistra indeterminata', 'Tórax', 'Izquierda', [-.9, -.35, -.12], [-3.2, 1.1, .18], [.9, .055, .055], 'rib_indeterminate');
add('right_rib_indeterminate', 'Costilla derecha indeterminada', 'Indeterminate right rib', 'Costa dextra indeterminata', 'Tórax', 'Derecha', [.9, -.35, -.12], [3.2, 1.1, .18], [.9, .055, .055], 'rib_indeterminate');
add('rib_indeterminate', 'Costilla indeterminada', 'Indeterminate rib', 'Costa indeterminata', 'Tórax', '—', [0, -.35, -.12], [0, 1.1, .18], [.9, .055, .055], 'rib_indeterminate');

for (const side of [['left', 'Izquierda', -1], ['right', 'Derecha', 1]]) {
  const prefix = side[0]; const sign = side[2];
  add(`${prefix}_scapula`, `Escápula ${side[1].toLowerCase()}`, `${side[1]} scapula`, `Scapula ${prefix === 'left' ? 'sinistra' : 'dextra'}`, 'Cintura escapular', side[1], [sign * 1.15, 1.35, -.12], [sign * 3.0, 2.6, 0], [.45, .7, .1], 'flat_bone');
  add(`${prefix}_radius`, `Radio ${side[1].toLowerCase()}`, `${side[1]} radius`, `Radius ${prefix === 'left' ? 'sinister' : 'dexter'}`, 'Extremidad superior', side[1], [sign * 1.32, -.55, 0], [sign * 3.2, .5, 0], [.14, 1.7, .14], 'long_bone');
  add(`${prefix}_ulna`, `Ulna ${side[1].toLowerCase()}`, `${side[1]} ulna`, `Ulna ${prefix === 'left' ? 'sinistra' : 'dextra'}`, 'Extremidad superior', side[1], [sign * 1.55, -.55, -.12], [sign * 3.55, .5, 0], [.14, 1.75, .14], 'long_bone');
  add(`${prefix}_patella`, `Patela ${side[1].toLowerCase()}`, `${side[1]} patella`, `Patella ${prefix === 'left' ? 'sinistra' : 'dextra'}`, 'Extremidad inferior', side[1], [sign * .5, -2.72, .35], [sign * 2.0, -2.0, 0], [.22, .28, .1], 'sesamoid');
  add(`${prefix}_fibula`, `Fíbula ${side[1].toLowerCase()}`, `${side[1]} fibula`, `Fibula ${prefix === 'left' ? 'sinistra' : 'dextra'}`, 'Extremidad inferior', side[1], [sign * .76, -3.4, -.1], [sign * 2.3, -3.9, 0], [.12, 2.3, .12], 'long_bone');
}

const carpals = [['scaphoid', 'escafoides'], ['lunate', 'semilunar'], ['triquetrum', 'piramidal'], ['pisiform', 'pisiforme'], ['trapezium', 'trapecio'], ['trapezoid', 'trapezoide'], ['capitate', 'grande'], ['hamate', 'ganchoso']];
const tarsals = [['talus', 'astrágalo'], ['calcaneus', 'calcáneo'], ['navicular', 'navicular'], ['medial_cuneiform', 'cuneiforme medial'], ['intermediate_cuneiform', 'cuneiforme intermedio'], ['lateral_cuneiform', 'cuneiforme lateral'], ['cuboid', 'cuboides']];
for (const side of [['left', 'Izquierda', -1], ['right', 'Derecha', 1]]) {
  const [prefix, label, sign] = side;
  carpals.forEach(([id, name], i) => add(`${prefix}_${id}`, `${name} ${label.toLowerCase()}`, `${label} ${id}`, `${name} ${prefix === 'left' ? 'sinister' : 'dexter'}`, 'Manos', label, [sign * 1.7 + (i % 4) * .12, -.75 - Math.floor(i / 4) * .14, .08], [sign * 4.0, 1.2 - i * .14, 0], [.12, .12, .1], 'carpal'));
  if (prefix === 'left') add('carpal_indeterminate', 'Carpo indeterminado', 'Indeterminate carpal', 'Os carpi indeterminatum', 'Manos', '—', [-.9, -.9, .08], [-3.8, 1.0, 0], [.14, .14, .1], 'carpal_indeterminate');
  for (let i = 1; i <= 5; i += 1) {
    add(`${prefix}_metacarpal_${i}`, `Metacarpiano ${i} ${label.toLowerCase()}`, `${label} metacarpal ${i}`, `Os metacarpale ${i}`, 'Manos', label, [sign * 1.95 + (i - 3) * .13, -1.15, 0], [sign * 4.5, .45 - i * .13, 0], [.1, .65, .1], 'metacarpal');
    for (const [part, partName, scale] of [['proximal', 'proximal', .23], ['middle', 'media', .18], ['distal', 'distal', .16]]) {
      if (i === 1 && part === 'middle') continue;
      add(`${prefix}_digit_${i}_${part}`, `Falange ${i} ${partName} ${label.toLowerCase()}`, `${label} digit ${i} ${partName}`, `Phalanx ${partName}`, 'Manos', label, [sign * (2.05 + (i - 3) * .13), -1.85 - (part === 'proximal' ? 0 : .28), 0], [sign * 4.9, .3 - i * .12 - (part === 'distal' ? .35 : 0), 0], [.09, scale, .09], 'phalanx');
    }
  }
  if (prefix === 'left') {
    add('metacarpal_indeterminate', 'Metacarpiano indeterminado', 'Indeterminate metacarpal', 'Os metacarpale indeterminatum', 'Manos', '—', [-.9, -1.35, 0], [-4.2, .3, 0], [.1, .65, .1], 'metacarpal_indeterminate');
    add('hand_phalanx_indeterminate', 'Falange de la mano indeterminada', 'Indeterminate hand phalanx', 'Phalanx manus indeterminata', 'Manos', '—', [-.9, -1.85, 0], [-4.6, -.1, 0], [.09, .24, .09], 'phalanx_indeterminate');
  }
  tarsals.forEach(([id, name], i) => add(`${prefix}_${id}`, `${name} ${label.toLowerCase()}`, `${label} ${id}`, `${name} ${prefix === 'left' ? 'sinister' : 'dexter'}`, 'Pies', label, [sign * 1.65 + (i % 3) * .15, -3.85 - Math.floor(i / 3) * .14, .05], [sign * 4.0, -2.0 - i * .14, 0], [.16, .16, .13], 'tarsal'));
  for (let i = 1; i <= 5; i += 1) {
    add(`${prefix}_metatarsal_${i}`, `Metatarsiano ${i} ${label.toLowerCase()}`, `${label} metatarsal ${i}`, `Os metatarsale ${i}`, 'Pies', label, [sign * 1.9 + (i - 3) * .15, -4.35, 0], [sign * 4.5, -2.2 - i * .12, 0], [.11, .72, .11], 'metatarsal');
    for (const [part, partName, scale] of [['proximal', 'proximal', .24], ['middle', 'media', .18], ['distal', 'distal', .15]]) {
      if (i === 1 && part === 'middle') continue;
      add(`${prefix}_toe_${i}_${part}`, `Falange del dedo ${i} ${partName} ${label.toLowerCase()}`, `${label} toe ${i} ${partName}`, `Phalanx ${partName}`, 'Pies', label, [sign * (2.0 + (i - 3) * .15), -5.05 - (part === 'proximal' ? 0 : .25), 0], [sign * 5.0, -2.5 - i * .1 - (part === 'distal' ? .3 : 0), 0], [.09, scale, .09], 'phalanx');
    }
  }
  if (prefix === 'left') {
    add('tarsal_indeterminate', 'Tarso indeterminado', 'Indeterminate tarsal', 'Os tarsi indeterminatum', 'Pies', '—', [-.9, -4.0, .05], [-3.8, -1.9, 0], [.16, .16, .13], 'tarsal_indeterminate');
    add('metatarsal_indeterminate', 'Metatarsiano indeterminado', 'Indeterminate metatarsal', 'Os metatarsale indeterminatum', 'Pies', '—', [-.9, -4.45, 0], [-4.2, -2.1, 0], [.11, .72, .11], 'metatarsal_indeterminate');
    add('foot_phalanx_indeterminate', 'Falange del pie indeterminada', 'Indeterminate foot phalanx', 'Phalanx pedis indeterminata', 'Pies', '—', [-.9, -5.1, 0], [-4.6, -2.4, 0], [.09, .24, .09], 'phalanx_indeterminate');
  }
}

export const extendedBones = bones;
