// Original, deterministic schematic geometry. MIT, Osteo3D contributors (2026).
// Display units are arbitrary: neither morphometry nor age/sex estimation is valid.
export const PROCEDURAL_VERSION = '1.2.0';
export const PROFILE_SHAPES = Object.freeze({
  adult_male: { trunk: 1, arm: 1, leg: 1, head: 1, shoulder: 1, pelvis: 1, immature: false },
  adult_female: { trunk: .96, arm: .94, leg: .96, head: .98, shoulder: .9, pelvis: 1.14, immature: false },
  infant: { trunk: .67, arm: .49, leg: .44, head: .84, shoulder: .67, pelvis: .67, immature: true },
  neonate: { trunk: .45, arm: .3, leg: .25, head: .69, shoulder: .45, pelvis: .45, immature: true }
});

export function isAnatomicalBone(bone) {
  return bone.id !== 'vertebrae' && !bone.id.includes('indeterminate');
}

// Anatomical left is on the viewer's right in the anterior view (+X).
export function boneLayout(bone, profileId = 'adult_male') {
  const q = PROFILE_SHAPES[profileId] || PROFILE_SHAPES.adult_male;
  const id = bone.id, side = id.startsWith('left_') ? 1 : -1;
  let p = [...bone.p], size = [...bone.size], rotation = [0, 0, 0];
  const set = (position, dimensions) => { p = position; size = dimensions; };
  const shoulder = 1.12 * q.shoulder, hip = .43 * q.pelvis;
  const top = 1.9 * q.trunk, pelvisY = -.6 * q.trunk;
  if (id === 'skull') set([0, top + .9 * q.head, 0], [1.04*q.head, 1.22*q.head, 1.04*q.head]);
  else if (id === 'mandible') set([0, top + .42*q.head, .16*q.head], [.77*q.head, .36*q.head, .64*q.head]);
  else if (/^(c1_atlas|c[2-7]|t\d+|l\d+)$/.test(id)) {
    const c = id[0] === 'c', t = id[0] === 't';
    const n = id === 'c1_atlas' ? 1 : Number(id.slice(1));
    const y = c ? 2.05 - (n-1)*.085 : t ? 1.43-(n-1)*.125 : -.07-(n-1)*.13;
    set([0, y*q.trunk, -.19*q.trunk], [(c?.3:t?.38:.46)*q.trunk, .085*q.trunk, .35*q.trunk]);
  } else if (id === 'sacrum') set([0, pelvisY-.12*q.trunk, -.15*q.trunk], [.55*q.pelvis,.52*q.trunk,.24*q.trunk]);
  else if (id === 'coccyx') set([0, pelvisY-.46*q.trunk,-.04*q.trunk],[.13*q.trunk,.2*q.trunk,.13*q.trunk]);
  else if (id === 'sternum') set([0,1.05*q.trunk,.54*q.trunk],[.22*q.trunk,1.08*q.trunk,.12*q.trunk]);
  else if (bone.type === 'rib') {
    const n=Number(id.split('_').at(-1)), width=(.58 + .48*Math.sin((n-1)/12*Math.PI))*q.trunk;
    set([side*width/2,(1.6-(n-1)*.135)*q.trunk,.09*q.trunk],[width,.18*q.trunk,.9*q.trunk]);
  } else if (id.endsWith('_clavicle')) set([side*shoulder/2,top,.35*q.trunk],[shoulder,.12*q.trunk,.2*q.trunk]);
  else if (id.endsWith('_scapula')) set([side*.76*q.shoulder,1.46*q.trunk,-.48*q.trunk],[.62*q.shoulder,.79*q.trunk,.16*q.trunk]);
  else if (id.endsWith('_coxal')) set([side*hip,pelvisY,0],[.62*q.pelvis,.85*q.trunk,.42*q.pelvis]);
  else if (id.endsWith('_humerus')) set([side*(shoulder+.12*q.arm),top-.85*q.arm,0],[.28*q.arm,1.6*q.arm,.28*q.arm]);
  else if (/_radius$|_ulna$/.test(id)) set([side*(shoulder+(id.endsWith('radius')?.3:.09)*q.arm),top-2.38*q.arm,0],[.15*q.arm,1.35*q.arm,.16*q.arm]);
  else if (id.endsWith('_femur')) set([side*hip,pelvisY-1.5*q.leg,0],[.4*q.leg,2.22*q.leg,.38*q.leg]);
  else if (id.endsWith('_patella')) set([side*hip,pelvisY-2.68*q.leg,.2*q.leg],[.25*q.leg,.3*q.leg,.14*q.leg]);
  else if (/_tibia$|_fibula$/.test(id)) set([side*(hip+(id.endsWith('fibula')?.19*q.leg:0)),pelvisY-3.77*q.leg,0],[(id.endsWith('fibula')?.12:.27)*q.leg,1.96*q.leg,.24*q.leg]);
  else if (bone.region === 'Manos') {
    const wrist=top-3.16*q.arm, center=shoulder+.2*q.arm;
    const carpal=['scaphoid','lunate','triquetrum','pisiform','trapezium','trapezoid','capitate','hamate'].indexOf(id.replace(/^(left|right)_/,''));
    if (carpal>=0) set([side*(center+(.18-(carpal%4)*.115)*q.arm),wrist-Math.floor(carpal/4)*.14*q.arm,carpal===3?.08*q.arm:0],[.105*q.arm,.12*q.arm,.11*q.arm]);
    else {
      const n=Number(id.match(/_(\d)_/)?.[1] || id.match(/_(\d)$/)?.[1] || 3);
      const x=side*(center+(3-n)*.125*q.arm), thumb=n===1;
      const y=id.includes('metacarpal')?.46:id.endsWith('proximal')?.84:id.endsWith('middle')?1.06:thumb?1.04:1.24;
      set([x,wrist-y*q.arm,0],[.085*q.arm,(id.includes('metacarpal')?(thumb?.32:.44):id.endsWith('proximal')?.24:id.endsWith('middle')?.17:.14)*q.arm,.09*q.arm]);
    }
  } else if (bone.region === 'Pies') {
    const ankle=pelvisY-4.83*q.leg;
    const tarsals={talus:[0,.04,0,.22,.2,.25],calcaneus:[0,-.1,-.15,.25,.24,.44],navicular:[-.04,-.06,.23,.22,.14,.18],medial_cuneiform:[-.13,-.1,.4,.12,.16,.2],intermediate_cuneiform:[0,-.1,.4,.11,.14,.17],lateral_cuneiform:[.12,-.1,.4,.12,.15,.2],cuboid:[.23,-.1,.22,.2,.17,.25]};
    const t=tarsals[id.replace(/^(left|right)_/,'')];
    if(t) set([side*(hip+t[0]*q.leg),ankle+t[1]*q.leg,t[2]*q.leg],t.slice(3).map(v=>v*q.leg));
    else {
      const n=Number(id.match(/_(\d)_/)?.[1] || id.match(/_(\d)$/)?.[1] || 3);
      const z=id.includes('metatarsal')?.73:id.endsWith('proximal')?1.03:id.endsWith('middle')?1.19:n===1?1.2:1.32;
      set([side*(hip+(n-2)*.115*q.leg),ankle-.13*q.leg,(z-(n-1)*.035)*q.leg],[.09*q.leg,(id.includes('metatarsal')?.46:id.endsWith('proximal')?.18:.12)*q.leg,.09*q.leg]);
      rotation=[Math.PI/2,0,0];
    }
  }
  return { p, size, rotation };
}

export function applyProfileLayout(bones, profileId) {
  const order=['Cráneo','Columna','Tórax','Cintura escapular','Pelvis','Extremidad superior','Manos','Extremidad inferior','Pies'];
  const regions=[...new Set([...order,...bones.map(bone=>bone.region).filter(Boolean)])];
  if (bones.some(bone => !bone.region)) regions.push('__ungrouped');
  let y=0;
  for(const region of regions) {
    let x=0, rowHeight=0, placed=false;
    for(const bone of bones.filter(item=>(item.region || '__ungrouped')===region)) {
      const layout=boneLayout(bone,profileId);
      Object.assign(bone,layout,{recordOnly:!isAnatomicalBone(bone)});
      if(bone.recordOnly) continue;
      const horizontal=bone.size[1]>bone.size[0]*2;
      const width=horizontal?bone.size[1]:bone.size[0], height=horizontal?bone.size[0]:bone.size[1];
      if(x+width>11 && x>0){x=0;y+=rowHeight+.3;rowHeight=0;}
      bone.e=[x+width/2-5.5,-y-height/2,0];
      bone.expandedRotation=[0,0,horizontal?Math.PI/2:0];
      x+=width+.25;rowHeight=Math.max(rowHeight,height);placed=true;
    }
    if(placed) y+=rowHeight+.75;
  }
  const middle=Math.max(0,(y-.75)/2);
  bones.filter(isAnatomicalBone).forEach(bone=>{bone.e[1]+=middle;});
}

export function createProceduralBone(THREE,bone,profileId='adult_male',color=0xc4ad8b) {
  const q=PROFILE_SHAPES[profileId] || PROFILE_SHAPES.adult_male;
  const newborn=profileId==='neonate', female=profileId==='adult_female';
  const root=new THREE.Group(), id=bone.id, sign=id.startsWith('left_')?1:-1;
  root.name=id;
  root.userData={id,boneId:id,name_es:bone.es||id,name_en:bone.en||id,name_la:bone.la||id,region:bone.region||'',side:bone.side||'',modelSource:'procedural',profileId,version:PROCEDURAL_VERSION,units:'arbitrary',license:'MIT',schematic:true};
  if(!isAnatomicalBone(bone)) return root;
  const material=new THREE.MeshStandardMaterial({color,roughness:.7,side:THREE.DoubleSide});
  const cartilage=material.clone(); cartilage.color.setHex(0x64aabb);
  const ossification=material.clone(); ossification.color.setHex(0xd1a06b);
  const add=(geometry,name,position=[0,0,0],scale=[1,1,1],mat=material)=>{
    const m=new THREE.Mesh(geometry,mat); m.name=`${id}:${name}`;
    m.userData={boneId:id,componentId:m.name,tissue:mat===cartilage?'cartilage-envelope':mat===ossification?'ossification-center':'schematic-bone'};
    m.position.set(...position);m.scale.set(...scale);root.add(m);return m;
  };
  const ellipsoid=(name,p,s,mat)=>add(new THREE.SphereGeometry(1,24,16),name,p,s,mat);
  const tube=(name,points,r=.06)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,10,false),name);
  const plate=(name,points,depth=.08)=>{
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    return add(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025}),name,[0,0,-depth/2]);
  };
  if(id==='skull') {
    const gap=q.immature?(newborn?.12:.065):.012;
    for(let half=0;half<2;half++) for(let quadrant=0;quadrant<2;quadrant++) {
      add(new THREE.SphereGeometry(1,18,12,half*Math.PI+gap,Math.PI-2*gap,.14+quadrant*.72,.7-gap),`vault-${half}-${quadrant}`,[0,.12,-.08],[.49,.54,.5]);
    }
    ellipsoid('cranial-base',[0,-.26,-.1],[.4,.12,.38]);
    for(const s of [-1,1]) {
      const temporal=add(new THREE.SphereGeometry(1,16,10,0,Math.PI,0,Math.PI),'temporal-plate-'+s,[s*.35,-.11,-.08],[.13,.21,.3]);
      temporal.rotation.y=s*Math.PI/2;
      if(!newborn)ellipsoid('mastoid-'+s,[s*.37,-.3,-.15],[.045,female?.065:.09,.055]);
    }
    const occipital=add(new THREE.SphereGeometry(1,20,12,0,Math.PI,0,Math.PI),'occipital-plate',[0,-.07,-.3],[.36,.34,.2]);
    occipital.rotation.y=Math.PI;
    for(const s of [-1,1]) {
      const orbit=add(new THREE.TorusGeometry(.155,.042,8,20),`orbital-rim-${s}`,[s*.22,-.12,.34]);
      orbit.scale.y=.86;
      ellipsoid(`maxilla-${s}`,[s*.1,-.34,.32],[.11,q.immature?.07:.12,.12]);
      tube(`nasal-${s}`,[[s*.03,-.04,.41],[s*.06,-.2,.47]],newborn?.012:.018);
      tube(`zygomatic-${s}`,[[s*.35,-.12,.3],[s*.43,-.23,.08],[s*.4,-.24,-.08]],.038);
    }
    if(q.immature){
      ellipsoid('anterior-fontanelle',[0,.58,.18],[.16,.1,.035],cartilage);
      ellipsoid('posterior-fontanelle',[0,.43,-.27],[.1,.07,.03],cartilage);
      tube('frontal-suture',[[-.02,.62,.37],[0,.59,.43],[.02,.62,.37]],.012);
      tube('sagittal-suture',[[0,.63,.37],[0,.52,.12],[0,.44,-.2]],.012);
    }
  } else if(id==='mandible') {
    for(const s of [-1,1]) {
      const gap=profileId==='neonate'?.025:0;
      tube(`hemimandible-${s}`,[[s*.04+ s*gap,-.2,.34],[s*.24,-.2,.26],[s*.4,-.14,-.1],[s*.4,.23,-.22]],.06);
      ellipsoid(`condyle-${s}`,[s*.4,.26,-.22],[.085,.05,.07]);
    }
  } else if(bone.type==='rib') {
    const n=Number(id.split('_').at(-1));
    tube('costal-body',[[-sign*.45,.1,-.4],[-sign*.05,.06,-.43],[sign*.47,0,-.05],[sign*.22,-.08,.37],[-sign*(n>10?.05:.36),-.12,n>10?.25:.43]],.034);
    ellipsoid('head',[-sign*.45,.1,-.4],[.06,.06,.06]);
  } else if(id.endsWith('clavicle')) {
    tube('s-curve',[[-.5,0,-.04],[-.25,.035,.07],[0,0,0],[.28,-.025,-.08],[.5,0,.02]],.06);
  } else if(id==='c1_atlas' || /^(c[2-7]|t\d+|l\d+)$/.test(id)) {
    if(newborn){
      for(const side of [-1,1]){const arch=add(new THREE.TorusGeometry(.27,.05,8,16,Math.PI*.78),'neural-arch-'+side,[side*.025,0,-.08]);arch.rotation.set(Math.PI/2,0,side===1?.12:Math.PI+.12);}
    }else{const arch=add(new THREE.TorusGeometry(.27,.06,8,20,Math.PI*1.75),'neural-arch',[0,0,-.08]);arch.rotation.x=Math.PI/2;}
    if(id!=='c1_atlas') ellipsoid('centrum',[0,0,.21],[.27,.12,.18]);
    tube('spinous-process',[[0,0,-.28],[0,-.04,-.5]],.045);
    for(const s of [-1,1]) tube(`transverse-${s}`,[[s*.2,0,0],[s*.45,0,-.05]],.04);
    if(id==='c2') ellipsoid('dens',[0,.2,.2],[.065,.17,.065]);
  } else if(id.endsWith('scapula')) {
    plate('blade',[[-sign*.45,.43],[sign*.38,.35],[sign*.3,-.08],[-sign*.1,-.48]]);
    tube('spine',[[-sign*.4,.18,-.08],[0,.2,-.15],[sign*.4,.3,-.14]],.048);
    ellipsoid('glenoid',[sign*.4,.18,0],[.07,.12,.07]);
  } else if(id.endsWith('coxal')) {
    const flare=female?1.16:newborn?.8:1;
    plate('ilium',[[-.12,-.03],[-.45*flare,.36],[-.3*flare,.52],[.33*flare,.44],[.4*flare,.18],[.13,-.04]],q.immature?.065:.11);
    const gap=q.immature?.05:0;
    tube('ischium',[[.1,-.02-gap,.05],[.28,-.34-gap,.04],[0,-.49-gap,0],[-.18,-.37-gap,.02]],.075);
    tube('pubis',[[-.16,-.38-gap,.02],[-.38,-.25-gap,.1],[-.34,-.09-gap,.14],[-.1,-.05-gap,.07]],.06);
    ellipsoid('acetabular-rim',[.1,-.03,0],[.13,.12,.08]);
    // Mirror the actual geometry, not only its location in the assembled view.
    if(sign<0)root.children.forEach(part=>{part.position.x*=-1;part.scale.x*=-1;});
  } else if(id==='sacrum' || id==='coccyx' || id==='sternum') {
    const count=id==='coccyx'?4:5;
    for(let i=0;i<count;i++) {
      const w=id==='sternum'?(i===0?.4:.27):.45-i*.073;
      ellipsoid(`segment-${i+1}`,[0,.4-i*.19,0],[w,q.immature?.068:.095,.11]);
    }
  } else if(bone.type==='carpal'||bone.type==='tarsal'||id.endsWith('patella')) {
    const seed=[...id.replace(/^(left|right)_/,'')].reduce((s,c)=>s+c.charCodeAt(0),0);
    const g=new THREE.SphereGeometry(1,12,8), pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);const r=1+.12*Math.sin(3*x+seed)*Math.cos(4*y+2*z);pos.setXYZ(i,x*r,y*r,z*r);}
    g.computeVertexNormals();add(g,'body',[0,0,0],[.45,.45,.45],q.immature&&bone.type==='carpal'?cartilage:material);
    if(id.endsWith('hamate')) tube('hook',[[.1,0,.3],[.18,.08,.55],[.05,.13,.58]],.07);
  } else {
    const small=/metacarpal|metatarsal|digit_|toe_/.test(id), femur=id.endsWith('femur'), slender=/_fibula$|_radius$|_ulna$/.test(id);
    const points=[[-.5,.17],[-.43,.145],[-.34,.105],[-.22,.073],[-.08,.058],[.08,.058],[.22,.073],[.34,.105],[.43,.145],[.5,.17]];
    const shaft=add(new THREE.LatheGeometry(points.map(([y,r])=>new THREE.Vector2(slender?r*.7:r,y)),24),'diaphysis');
    const positions=shaft.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const y=positions.getY(i),bow=(.16-y*y);
      const lateral=id.endsWith('radius')?sign*.34*bow:id.endsWith('ulna')?-sign*.15*bow:0;
      const sagittal=femur?.22*bow:id.endsWith('tibia')?.08*bow:.04*bow;
      positions.setXYZ(i,positions.getX(i)+lateral,y,positions.getZ(i)+sagittal);
    }
    shaft.geometry.computeVertexNormals();
    const endMaterial=q.immature?cartilage:material, offset=q.immature?.465:.4;
    if(q.immature){
      add(new THREE.CylinderGeometry(.18,.18,.035,24),'proximal-epiphyseal-plate',[0,offset-.02,0],[1,1,1],cartilage);
      add(new THREE.CylinderGeometry(.16,.16,.035,24),'distal-epiphyseal-plate',[0,-offset+.02,0],[1,1,1],cartilage);
      ellipsoid('proximal-ossification-center',[femur?-sign*.08:0,offset+.035,.01],[femur?.1:.08,.055,.08],ossification);
      ellipsoid('distal-ossification-center',[0,-offset-.035,.01],[small?.07:.1,.05,small?.07:.08],ossification);
    }
    ellipsoid('proximal-envelope',[femur?-sign*.18:0,offset,0],[femur?.17:.14,.105,.14],endMaterial);
    if(femur) tube('neck',[[-sign*.05,.28,0],[-sign*.18,.4,0]],.085);
    if(femur)ellipsoid('greater-trochanter',[sign*.09,.34,0],[.08,.1,.09]);
    if(id.endsWith('humerus')){ellipsoid('head',[-sign*.065,.41,-.03],[.17,.16,.15],endMaterial);ellipsoid('tubercle',[sign*.1,.36,.06],[.07,.09,.065]);}
    if(id.endsWith('ulna'))tube('olecranon',[[0,.28,0],[0,.49,-.065],[0,.55,.04],[0,.43,.1]],.054);
    if(id.endsWith('radius')){const head=add(new THREE.CylinderGeometry(.14,.14,.065,24),'radial-head',[0,offset,0]);if(q.immature)head.material=cartilage;}
    if(id.endsWith('tibia'))ellipsoid('tibial-tuberosity',[0,.26,.11],[.07,.1,.055]);
    ellipsoid('distal-envelope',[0,-offset,0],[small?.12:.17,.1,.13],endMaterial);
    if(!small) for(const s of [-1,1]) ellipsoid(`condyle-${s}`,[s*.09,-offset,0],[.1,.1,.13],endMaterial);
  }
  // Fit generated geometry to the declared schematic envelope; imported scans are not modified here.
  root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root), extent=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  const content=new THREE.Group(); content.name=`${id}:components`;
  [...root.children].forEach(child=>{root.remove(child);content.add(child);});
  content.position.copy(center).multiplyScalar(-1);root.add(content);
  const layout=boneLayout(bone,profileId);
  root.scale.set(...layout.size.map((v,i)=>v/[extent.x,extent.y,extent.z][i]));
  root.position.set(...layout.p); root.rotation.set(...layout.rotation);
  root.userData.baseScale=root.scale.clone();
  return root;
}
