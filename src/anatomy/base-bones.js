export const baseBones = [
  { id: 'skull', es: 'Cráneo', en: 'Skull', la: 'Cranium', region: 'Cráneo', side: '—', p: [0, 3.7, 0], e: [0, 4.8, 0], shape: 'sphere', size: [0.95, 1.15, 0.8] },
  { id: 'mandible', es: 'Mandíbula', en: 'Mandible', la: 'Mandibula', region: 'Cráneo', side: '—', p: [0, 2.95, 0], e: [0, 4.0, 0], shape: 'box', size: [0.75, 0.18, 0.45] },
  { id: 'c1_atlas', es: 'Atlas (C1)', en: 'Atlas (C1)', la: 'Atlas', region: 'Columna', side: '—', p: [0, 2.55, 0], e: [0, 3.15, 0], shape: 'ring', size: [0.28, 0.16, 0.28] },
  { id: 'vertebrae', es: 'Columna vertebral', en: 'Vertebral column', la: 'Columna vertebralis', region: 'Columna', side: '—', p: [0, 0.7, 0], e: [0, 1.0, 0], shape: 'column', size: [0.26, 2.4, 0.26] },
  { id: 'sternum', es: 'Esternón', en: 'Sternum', la: 'Sternum', region: 'Tórax', side: '—', p: [0, 1.2, 0.55], e: [0, 1.8, 0.65], shape: 'box', size: [0.26, 1.3, 0.12] },
  { id: 'left_clavicle', es: 'Clavícula izquierda', en: 'Left clavicle', la: 'Clavicula sinistra', region: 'Cintura escapular', side: 'Izquierda', p: [-0.65, 1.75, 0], e: [-1.4, 2.1, 0], shape: 'bone', size: [1.15, 0.12, 0.12] },
  { id: 'right_clavicle', es: 'Clavícula derecha', en: 'Right clavicle', la: 'Clavicula dextra', region: 'Cintura escapular', side: 'Derecha', p: [0.65, 1.75, 0], e: [1.4, 2.1, 0], shape: 'bone', size: [1.15, 0.12, 0.12] },
  { id: 'left_humerus', es: 'Húmero izquierdo', en: 'Left humerus', la: 'Humerus sinister', region: 'Extremidad superior', side: 'Izquierda', p: [-1.0, 0.65, 0], e: [-2.1, 1.0, 0], shape: 'bone', size: [0.18, 1.85, 0.18] },
  { id: 'right_humerus', es: 'Húmero derecho', en: 'Right humerus', la: 'Humerus dexter', region: 'Extremidad superior', side: 'Derecha', p: [1.0, 0.65, 0], e: [2.1, 1.0, 0], shape: 'bone', size: [0.18, 1.85, 0.18] },
  { id: 'left_femur', es: 'Fémur izquierdo', en: 'Left femur', la: 'Femur sinister', region: 'Extremidad inferior', side: 'Izquierda', p: [-0.48, -1.35, 0], e: [-1.0, -1.6, 0], shape: 'bone', size: [0.22, 2.7, 0.22] },
  { id: 'right_femur', es: 'Fémur derecho', en: 'Right femur', la: 'Femur dexter', region: 'Extremidad inferior', side: 'Derecha', p: [0.48, -1.35, 0], e: [1.0, -1.6, 0], shape: 'bone', size: [0.22, 2.7, 0.22] },
  { id: 'left_tibia', es: 'Tibia izquierda', en: 'Left tibia', la: 'Tibia sinistra', region: 'Extremidad inferior', side: 'Izquierda', p: [-0.48, -3.35, 0], e: [-1.0, -3.9, 0], shape: 'bone', size: [0.16, 2.35, 0.16] },
  { id: 'right_tibia', es: 'Tibia derecha', en: 'Right tibia', la: 'Tibia dextra', region: 'Extremidad inferior', side: 'Derecha', p: [0.48, -3.35, 0], e: [1.0, -3.9, 0], shape: 'bone', size: [0.16, 2.35, 0.16] }
  ,{ id: 'left_coxal', es: 'Coxal izquierdo', en: 'Left hip bone', la: 'Os coxae sinistrum', region: 'Pelvis', side: 'Izquierda', p: [-0.48, -0.55, 0], e: [-1.15, -0.65, 0], shape: 'flat', size: [0.48, 0.72, 0.18] }
  ,{ id: 'right_coxal', es: 'Coxal derecho', en: 'Right hip bone', la: 'Os coxae dextrum', region: 'Pelvis', side: 'Derecha', p: [0.48, -0.55, 0], e: [1.15, -0.65, 0], shape: 'flat', size: [0.48, 0.72, 0.18] }
];
