// Silhuetas de recursos. Sem texturas, luzes extras ou GLB; partes mescladas por material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PICKUPS = Object.freeze({
  ammo9: { label: 'MUNIÇÃO 9 mm', color: 0xffb030 },
  shells: { label: 'CARTUCHOS', color: 0xff593f },
  medkit: { label: 'VIDA', color: 0x55ef83 },
  armor: { label: 'PROTEÇÃO', color: 0x35d9ff },
  pecas: { label: 'PEÇAS CRONAIS', color: 0xc28aff },
  weapon_trovao: { label: 'TROVÃO DUPLO', color: 0xf2f4ff },
});
const templates = new Map();

function build(type) {
  const def = PICKUPS[type];
  if (!def) throw new Error(`Recurso desconhecido: ${type}`);
  const root = new THREE.Group(); root.name = `pickup_${type}`; root.userData.pickupType = type;
  const bins = new Map();
  const colors = { body: 0x283341, accent: def.color, mark: 0xf2f5f0 };
  const part = (key, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(geo);
  };
  const box = (key, w, h, d, x = 0, y = 0, z = 0, rz = 0) => part(key, new THREE.BoxGeometry(w, h, d), x, y, z, 0, 0, rz);
  const cyl = (key, r, h, x, y, z) => part(key, new THREE.CylinderGeometry(r, r, h, 8), x, y, z);
  if (type === 'medkit') {
    colors.body = 0xe5e9e1;
    box('body', .48, .30, .23); // maleta branca e alça
    box('body', .20, .035, .055, 0, .225); box('body', .035, .08, .055, -.083, .19); box('body', .035, .08, .055, .083, .19);
    for (const z of [-.121, .121]) { box('accent', .19, .055, .012, 0, 0, z); box('accent', .055, .19, .014, 0, 0, z); }
    for (const x of [-.18, .18]) box('accent', .035, .31, .24, x);
  } else if (type === 'ammo9') {
    box('body', .40, .08, .18, 0, -.12);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * .095;
      cyl('accent', .037, .24, x, .025, 0);
      part('mark', new THREE.ConeGeometry(.037, .08, 8), x, .185, 0);
      cyl('mark', .042, .025, x, -.10, 0);
    }
  } else if (type === 'shells') {
    colors.mark = 0xd6a854;
    box('body', .39, .07, .18, 0, -.145);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * .13;
      cyl('accent', .055, .28, x, .025, 0);
      cyl('mark', .059, .07, x, -.09, 0);
      cyl('mark', .047, .012, x, .171, 0);
    }
  } else if (type === 'armor') {
    const shape = new THREE.Shape();
    shape.moveTo(-.23, -.27); shape.lineTo(.23, -.27); shape.lineTo(.23, .10);
    shape.lineTo(.16, .30); shape.lineTo(.07, .30); shape.lineTo(.055, .19);
    shape.lineTo(-.055, .19); shape.lineTo(-.07, .30); shape.lineTo(-.16, .30);
    shape.lineTo(-.23, .10); shape.closePath();
    part('accent', new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: false }), 0, 0, -.06);
    for (const z of [-.075, .075]) {
      box('body', .36, .055, .03, 0, -.16, z); box('body', .045, .34, .03, 0, -.005, z);
      box('mark', .08, .10, .035, -.10, .035, z);
    }
  } else if (type === 'pecas') {
    part('body', new THREE.TorusGeometry(.15, .055, 5, 12));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      box('accent', .09, .085, .10, Math.cos(a) * .21, Math.sin(a) * .21, 0, a);
    }
    part('mark', new THREE.OctahedronGeometry(.09));
  } else {
    colors.accent = 0x835b3c;
    for (const x of [-.055, .055]) part('body', new THREE.CylinderGeometry(.043, .043, .67, 8), x, .025, .13, Math.PI / 2);
    box('accent', .15, .12, .33, 0, -.015, -.34);
    box('accent', .16, .08, .27, 0, -.045, .04);
    box('mark', .14, .12, .12, 0, -.015, -.17);
  }
  for (const [key, geos] of bins) {
    const geo = mergeGeometries(geos); geos.forEach(g => g.dispose());
    const mat = new THREE.MeshLambertMaterial({ color: colors[key], emissive: colors[key], emissiveIntensity: key === 'body' ? .12 : .35 });
    const mesh = new THREE.Mesh(geo, mat); mesh.userData.pickupShared = true; root.add(mesh);
  }
  const halo = new THREE.Mesh(new THREE.RingGeometry(.30, .35, 24), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -.24; halo.userData.pickupShared = true; root.add(halo);
  return root;
}

export function createPickupMesh(type) {
  if (!templates.has(type)) templates.set(type, build(type));
  return templates.get(type).clone(true);
}

// Cópias removidas por coleta não descartam buffers usados pelas demais.
export function disposePickupAssets() {
  for (const root of templates.values()) root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  templates.clear();
}
