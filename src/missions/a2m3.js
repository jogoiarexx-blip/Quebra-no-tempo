// A2-M3 — O TREM DE FERRO. Vale de Mercúrio, 1888 (GDD §8 Ato II, §8.2, §12, §35).
// Estação → embarque → vagões em movimento (tiro em movimento, vigas sobre o teto) → vagão de carga (Ferrovia)
// → vagão oculto (escotilha) → tênder → locomotiva com reator anacrônico → ponte partida → estação após a ponte.
// O trem fica parado nas coordenadas; chão, trilhos, postes e estações deslizam (colisão estável e testável).
import * as THREE from 'three';
import { createBuilder, canvasTex, makeSky, makeDust, lantern, boxGeo } from '../world.js';
import { addCollider } from '../physics.js';
import { TRAIN, newTrain, depart, startBridge, stepTrain, beamHits, moving, closeValve, pullCore } from './trem-state.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SECTORS = { station: 'Estação Mercúrio', c1: 'Vagão de passageiros', c2: 'Vagão-restaurante', c3: 'Vagão de carga', c4: 'Teto do vagão postal', hidden: 'Vagão oculto', tender: 'Tênder de carvão', cab: 'Cabine da locomotiva', end: 'Estação Ponte Velha' };
export const CARS = { c1: [0, 14], c2: [15.4, 29.4], c3: [30.8, 44.8], c4: [46.2, 60.2], tender: [61.6, 69.6], cab: [71, 75.5] };
export const TREM_ROUTE = { spawn: [-6, 1.11, -8], board: [0, 1.21, -.8], cargo: [.2, 1.21, 35], rifle: [-1.2, 1.21, 32.6], valve: [-1.1, 1.21, 74.2], core: [1, 1.21, 74.2], gate: [7, 1.11, 50] };
const HW = 2.0, FLOOR = 1.2, ROOF = 4.1;
function sectorAt(p) {
  if (Math.abs(p.x) > 2.05) return p.x < 0 ? 'station' : 'end';
  if (p.z < CARS.c1[1]) return 'c1'; if (p.z < CARS.c2[1]) return 'c2'; if (p.z < CARS.c3[1]) return 'c3';
  if (p.z < CARS.c4[1]) return p.y > 3.8 ? 'c4' : 'hidden'; if (p.z < CARS.tender[1]) return 'tender'; return 'cab';
}
function plate(text, bg = '#3a2414', ink = '#f0d8a0') {
  return canvasTex(512, 128, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#140a04'; c.lineWidth = 8; c.strokeRect(4, 4, 504, 120); c.font = 'bold 50px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink; c.fillText(text, 256, 66); }, false);
}
function build(scene) {
  const L = createBuilder(scene), { B, D, M, root } = L;
  L.fogColor = 0xd8a080; L.fogDensity = 0.0055; L.hemi = 1.9; L.moon = 1.5;
  L.sunColor = 0xffd0a0; L.hemiSky = 0xffd8c0; L.hemiGround = 0x6a5038;
  makeSky(L, 0x3a5a9a, 0xf0b080, 0xff9050); makeDust(L, 260, 0xf0d0a0, 0.06, 0.1);
  const sign = (t, x, y, z, w, ry, bg, ink) => { const m = L.mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: plate(t, bg, ink), side: THREE.DoubleSide }), x, y, z); m.rotation.y = ry; return m; };
  // grupo móvel com colisores próprios (vagão 1, estações): malha por caixa + colisor ligável
  const movable = () => { const g = new THREE.Group(); root.add(g); g.userData.cols = []; return g; };
  const GB = (g, mat, x0, x1, y0, y1, z0, z1, o = {}) => {
    if (!o.invisible) g.add(new THREE.Mesh(boxGeo(x0, x1, y0, y1, z0, z1, o.tile || 2), mat));
    if (!o.noCol) g.userData.cols.push(addCollider(x0, x1, y0, y1, z0, z1, o.col || {}));
  };
  // ---------------- chão rolante, trilhos e cenário (deslizam com S.train.dist) ----------------
  addCollider(-400, 400, -1, 0, -400, 400, {});   // chão invisível: só pega quem cai do trem
  const groundTex = M.sand.map.clone(); groundTex.needsUpdate = true; groundTex.repeat.set(60, 120);
  L.groundMat = new THREE.MeshLambertMaterial({ map: groundTex });
  L.ground = L.mesh(new THREE.PlaneGeometry(500, 1000).rotateX(-Math.PI / 2), L.groundMat, 0, -.02, 60);
  const tiesTex = canvasTex(64, 128, (c) => { c.fillStyle = '#6a5a48'; c.fillRect(0, 0, 64, 128); c.fillStyle = '#3a2414'; for (let y = 0; y < 128; y += 32) c.fillRect(0, y, 64, 14); }, true); tiesTex.repeat.set(1, 150);
  L.tiesMat = new THREE.MeshLambertMaterial({ map: tiesTex });
  for (const x of [0, 6]) L.mesh(new THREE.PlaneGeometry(3.2, 600).rotateX(-Math.PI / 2), L.tiesMat, x, .01, 60);
  for (const x of [-.72, .72, 5.28, 6.72]) B(M.iron, x - .05, x + .05, .02, .16, -240, 360, { noCol: true });
  L.scroll = [];
  const scrollAdd = (obj, z, span = 320) => { L.scroll.push({ obj, z, span }); return obj; };
  const pole = new THREE.Group(); { const p = new THREE.Mesh(new THREE.BoxGeometry(.18, 7, .18), M.boards); p.position.y = 3.5; pole.add(p); const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, .12, .12), M.boards); c.position.y = 6.6; pole.add(c); }
  for (let i = 0; i < 12; i++) { const p = pole.clone(); p.position.x = -9; root.add(p); scrollAdd(p, i * 27); }
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
  for (let i = 0; i < 26; i++) { const g = new THREE.Group(); const h = 1.6 + (i % 4) * .6; const t = new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, h, 8), cactusMat); t.position.y = h / 2; g.add(t); if (i % 2) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .9, 6), cactusMat); a.position.set(.35, h * .6, 0); g.add(a); } g.position.x = (i % 2 ? 1 : -1) * (12 + (i * 7.3) % 30); root.add(g); scrollAdd(g, i * 12.3); }
  for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + (i % 3) * .9, 0), M.rock); r.position.set((i % 2 ? 1 : -1) * (10 + (i * 11) % 40), .4, 0); root.add(r); scrollAdd(r, i * 23); }
  for (let i = 0; i < 8; i++) { const w = 30 + (i % 3) * 20, h = 18 + (i % 4) * 9; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 30), M.rock); m.position.set((i % 2 ? 1 : -1) * (90 + i * 9), h / 2 - 1, 0); root.add(m); scrollAdd(m, i * 40, 320); }
  // ponte de cavaletes e desfiladeiro (só durante a travessia)
  L.bridge = new THREE.Group(); root.add(L.bridge); L.bridge.visible = false;
  for (let i = 0; i < 30; i++) { const seg = new THREE.Group(); const z = i * 10; for (const x of [-2.6, 2.6, 3.4, 8.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.4, 40, .4), M.boards); leg.position.set(x, -20, 0); seg.add(leg); } for (let k = 0; k < 4; k++) { const br = new THREE.Mesh(new THREE.BoxGeometry(12, .3, .3), M.boards); br.position.set(3, -4 - k * 9, 0); br.rotation.z = (k % 2 ? 1 : -1) * .35; seg.add(br); } const deck = new THREE.Mesh(new THREE.BoxGeometry(12, .4, 10.2), M.boards); deck.position.set(3, -.2, 5); if (i === 9) deck.scale.x = .35, deck.position.x = -1.5; seg.add(deck); seg.position.z = z; L.bridge.add(seg); }
  L.gorge = L.mesh(new THREE.PlaneGeometry(500, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5a3a28 }), 0, -42, 60); L.gorge.visible = false;
  // viga que passa sobre o teto (túnel/caixa d'água): aviso antes, agache no teto ou fique dentro do vagão
  L.beam = new THREE.Group(); root.add(L.beam); L.beam.visible = false;
  { const top = new THREE.Mesh(new THREE.BoxGeometry(9, .5, .9), M.boards); top.position.y = 5.65; L.beam.add(top); for (const x of [-4.2, 4.2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.5, 5.9, .5), M.boards); leg.position.set(x, 2.95, 0); L.beam.add(leg); } const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 12), M.planks); tank.position.set(-4.2, 8, 0); L.beam.add(tank); }
  // ---------------- ESTAÇÃO MERCÚRIO (partida, à esquerda) ----------------
  L.st0 = movable();
  GB(L.st0, M.planks, -12, -2.05, 0, 1.1, -24, 18, { tile: 3 });
  for (const z of [-20, -10, 0, 10]) GB(L.st0, M.boards, -11.8, -11.5, 1.1, 4.4, z, z + .3);
  GB(L.st0, M.shingle, -12.2, -6, 4.4, 4.6, -22, 16, { noCol: true });
  GB(L.st0, M.adobe, -20, -12, 0, 6, -18, 12); GB(L.st0, M.shingle, -20.4, -11.6, 6, 6.4, -18.4, 12.4, { noCol: true });
  for (const [x, z] of [[-6, -2], [-9, 8], [-4.4, 12]]) { GB(L.st0, M.planks, x - .8, x + .8, 1.1, 2.1, z - .6, z + .6); }
  GB(L.st0, M.boards, -8, -6.4, 1.1, 1.6, -14, -13.4);
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: plate('ESTAÇÃO MERCÚRIO', '#20304a', '#f0e0a8'), side: THREE.DoubleSide })); s.position.set(-11.95, 3.4, -3); s.rotation.y = Math.PI / 2; L.st0.add(s); }
  L.light(-6, 4, -6, 0xffc88a, 20, 14); L.light(-6, 4, 8, 0xffc88a, 20, 14);
  // ---------------- O COMBOIO ----------------
  const wallCar = (z0, z1, { rearDoor = true, frontDoor = true, roofed = true, low = false, mat = M.planks } = {}) => {
    B(M.iron, -HW, HW, .9, FLOOR, z0, z1);                              // piso do vagão
    B(M.dark, -HW + .2, HW - .2, .3, .9, z0 + .6, z1 - .6, { noCol: true });   // truques/rodeiros (visual)
    for (const zz of [z0 + 1.6, z1 - 1.6]) for (const x of [-1.3, 1.3]) L.mesh(new THREE.CylinderGeometry(.45, .45, .2, 12).rotateZ(Math.PI / 2), M.iron, x, .45, zz);
    const top = low ? FLOOR + 1.2 : ROOF - .2;
    for (const s of [-1, 1]) B(mat, s < 0 ? -HW : HW - .12, s < 0 ? -HW + .12 : HW, FLOOR, top, z0, z1);
    const end = (z, door) => { if (!door) { B(mat, -HW, HW, FLOOR, top, z - .06, z + .06); return; } B(mat, -HW, -.7, FLOOR, top, z - .06, z + .06); B(mat, .7, HW, FLOOR, top, z - .06, z + .06); if (!low) B(mat, -.7, .7, FLOOR + 2.2, top, z - .06, z + .06); };
    end(z0 + .06, rearDoor); end(z1 - .06, frontDoor);
    if (roofed) { B(M.shingle, -HW - .1, HW + .1, ROOF - .2, ROOF, z0, z1); }
    if (!low) for (let z = z0 + 1.5; z < z1 - 1.5; z += 2.6) for (const s of [-1, 1]) B(M.glass, s * (HW + .005) - .005, s * (HW + .005) + .005, FLOOR + 1, FLOOR + 2, z, z + 1.4, { noCol: true });
  };
  const coupler = (z0, z1, y = FLOOR) => { B(M.iron, -HW, HW, y - .2, y, z0, z1); B(M.dark, -.15, .15, .4, .8, z0, z1, { noCol: true }); };
  // vagão 1 (passageiros) é um grupo próprio: desengata e cai na ponte
  L.car1 = movable();
  { const g = L.car1, [z0, z1] = CARS.c1;
    GB(g, M.iron, -HW, HW, .9, FLOOR, -1.6, z1); GB(g, M.dark, -1.7, 1.7, .3, .9, 0, z1, { noCol: true });
    for (const s of [-1, 1]) GB(g, M.planks, s < 0 ? -HW : HW - .12, s < 0 ? -HW + .12 : HW, FLOOR, ROOF - .2, z0, z1);
    GB(g, M.planks, -HW, -.7, FLOOR, ROOF - .2, z0, z0 + .12); GB(g, M.planks, .7, HW, FLOOR, ROOF - .2, z0, z0 + .12); GB(g, M.planks, -.7, .7, FLOOR + 2.2, ROOF - .2, z0, z0 + .12);
    GB(g, M.planks, -HW, -.7, FLOOR, ROOF - .2, z1 - .12, z1); GB(g, M.planks, .7, HW, FLOOR, ROOF - .2, z1 - .12, z1); GB(g, M.planks, -.7, .7, FLOOR + 2.2, ROOF - .2, z1 - .12, z1);
    GB(g, M.shingle, -HW - .1, HW + .1, ROOF - .2, ROOF, z0 - .3, z1);
    GB(g, M.rail, HW - .1, HW, FLOOR, FLOOR + 1.1, -1.6, 0, { col: { seeThrough: true } }); GB(g, M.rail, -HW, HW, FLOOR, FLOOR + 1.1, -1.6, -1.5, { col: { seeThrough: true } });   // varanda traseira (embarque pela esquerda)
    for (let z = 1.5; z < 12.5; z += 2.2) for (const s of [-1, 1]) { GB(g, M.cloth, s < 0 ? -1.88 : 1.15, s < 0 ? -1.15 : 1.88, FLOOR, FLOOR + .5, z, z + 1.1); GB(g, M.cloth, s < 0 ? -1.88 : 1.75, s < 0 ? -1.75 : 1.88, FLOOR + .5, FLOOR + 1.2, z, z + 1.1, { noCol: true }); }
    for (let z = 1.5; z < 12.5; z += 2.6) for (const s of [-1, 1]) GB(g, M.glass, s * HW - .01, s * HW + .01, FLOOR + 1, FLOOR + 2, z, z + 1.4, { noCol: true });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.25, .3, .25), M.lantern); lamp.position.set(0, ROOF - .5, 7); g.add(lamp);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), new THREE.MeshBasicMaterial({ map: plate('CIA. MERCÚRIO', '#5a1414', '#ffd070'), side: THREE.DoubleSide })); s.position.set(-HW - .02, 3.1, 7); s.rotation.y = Math.PI / 2; g.add(s); }
  L.light(0, 3.4, 7, 0xffc070, 14, 9);
  coupler(CARS.c1[1], CARS.c2[0]);
  // vagão 2: restaurante
  wallCar(...CARS.c2);
  for (const z of [17.5, 21.5]) for (const s of [-1, 1]) { B(M.bar, s < 0 ? -1.9 : 1.0, s < 0 ? -1.0 : 1.9, FLOOR, FLOOR + .8, z, z + 1.2); B(M.cloth, s < 0 ? -1.9 : 1.0, s < 0 ? -1.0 : 1.9, FLOOR + .8, FLOOR + .84, z - .05, z + 1.25, { noCol: true }); }
  B(M.bar, .9, 1.9, FLOOR, FLOOR + 1.1, 24.5, 28.6); for (let z = 24.8; z < 28.4; z += .4) B(z % .8 < .4 ? M.neonAmber : M.glass, 1.75, 1.85, FLOOR + 1.1, FLOOR + 1.45, z, z + .12, { noCol: true });
  L.light(0, 3.4, 22, 0xffc070, 14, 9);
  sign('VAGÃO-RESTAURANTE', HW + .02, 3.1, 22.4, 3.4, Math.PI / 2, '#20304a');
  coupler(CARS.c2[1], CARS.c3[0]);
  // vagão 3: gôndola de carga aberta (carga temporal, Ferrovia) + escada de caixotes até o teto do vagão 4
  wallCar(...CARS.c3, { roofed: false, low: true, mat: M.boards });
  L.cargo = [];
  for (const [x0, x1, z0, z1] of [[.4, 1.85, 32.4, 34.2], [.4, 1.85, 35.4, 37.2], [-1.85, -.6, 36.4, 38]]) { B(M.planks, x0, x1, FLOOR, FLOOR + 1.3, z0, z1); L.cargo.push(L.mesh(new THREE.BoxGeometry(x1 - x0 - .2, .12, z1 - z0 - .2), M.ore, (x0 + x1) / 2, FLOOR + 1.36, (z0 + z1) / 2)); }
  B(M.planks, -1.85, -.6, FLOOR, FLOOR + .55, 31.8, 33.4);   // caixote do rifle
  for (let i = 0; i < 7; i++) B(i % 2 ? M.planks : M.boards, -1.85, -.15, FLOOR, FLOOR + (i + 1) * .414, 40.6 + i * .6, 41.2 + i * .6, { tile: 1 });
  B(M.iron, -1.85, -.15, ROOF - .2, ROOF, 44.8, 46.2);   // prancha até o teto do vagão 4
  sign('CARGA TEMPORAL • NÃO ABRIR', HW + .02, 1.9, 36, 3.2, Math.PI / 2, '#3a0a0a', '#ffcc60');
  L.light(.5, 3.2, 35, 0x3affd0, 16, 8);
  // vagão 4: postal lacrado (sem portas): teto caminhável com escotilha para o compartimento oculto
  wallCar(...CARS.c4, { rearDoor: false, frontDoor: false, mat: M.boards });
  L.hatch = L.mesh(new THREE.BoxGeometry(1, .06, 1), M.iron, 0, ROOF + .03, 53);
  sign('CORREIO • LACRADO', HW + .02, 2.6, 53, 3, Math.PI / 2, '#2a2a3a');
  for (const [x0, x1, z0, z1] of [[-1.85, -.8, 47, 49], [.8, 1.85, 47, 50], [-1.85, -.9, 56, 59.6], [.9, 1.85, 58, 59.6]]) B(M.planks, x0, x1, FLOOR, FLOOR + 1.2, z0, z1);
  B(M.wood, 1.0, 1.8, FLOOR, FLOOR + .9, 56.4, 57.4); L.hiddenSeal = L.mesh(new THREE.OctahedronGeometry(.18, 0), M.neonAmber, 1.4, FLOOR + 1.3, 56.9);
  L.light(0, 3.4, 53, 0xffb35a, 10, 7);
  B(M.iron, -.8, .8, ROOF - .2, ROOF, CARS.c4[1], CARS.tender[0]);   // passarela teto → tênder
  // tênder: monte de carvão em degraus descendo até a cabine
  B(M.iron, -HW, HW, .9, FLOOR, CARS.tender[0], CARS.tender[1]);
  for (const s of [-1, 1]) B(M.iron, s < 0 ? -HW : HW - .15, s < 0 ? -HW + .15 : HW, FLOOR, FLOOR + 1.6, CARS.tender[0], CARS.tender[1]);
  for (let k = 0; k < 6; k++) B(M.dark, -HW + .15, HW - .15, FLOOR, 3.7 - k * .42, CARS.tender[0] + k * 1.333, CARS.tender[0] + (k + 1) * 1.333, { tile: 1 });
  coupler(CARS.c3[1], CARS.c4[0]); coupler(CARS.c4[1], CARS.tender[0]); coupler(CARS.tender[1], CARS.cab[0]);
  // locomotiva: cabine aberta atrás, caldeira à frente, reator anacrônico no painel
  { const [z0, z1] = CARS.cab;
    B(M.iron, -HW, HW, .9, FLOOR, z0, z1 + 13);
    for (const s of [-1, 1]) { B(M.iron, s < 0 ? -HW : HW - .12, s < 0 ? -HW + .12 : HW, FLOOR, FLOOR + 1.1, z0, z1); B(M.iron, s < 0 ? -HW : HW - .12, s < 0 ? -HW + .12 : HW, ROOF - 1.2, ROOF - .2, z0, z1, { noCol: true }); B(M.iron, s < 0 ? -HW : HW - .12, s < 0 ? -HW + .12 : HW, FLOOR, ROOF - .2, z1 - .4, z1); }
    B(M.iron, -HW - .2, HW + .2, ROOF - .2, ROOF, z0 - .3, z1 + .2);
    B(M.iron, -HW, HW, FLOOR, ROOF - .2, z1, z1 + .2);   // fundo da caldeira (painel)
    const boiler = L.mesh(new THREE.CylinderGeometry(1.35, 1.35, 12, 18).rotateX(Math.PI / 2), M.iron, 0, 2.6, z1 + 6.2); boiler.userData.decor = true;
    B(M.iron, -1.35, 1.35, FLOOR, 3.9, z1 + .2, z1 + 12.2, { invisible: true });
    L.mesh(new THREE.CylinderGeometry(.45, .6, 2.4, 12), M.dark, 0, 4.6, z1 + 10); L.mesh(new THREE.CylinderGeometry(.5, .5, .9, 12), M.brass, 0, 4.2, z1 + 6);
    L.mesh(new THREE.ConeGeometry(1.5, 1.6, 4).rotateX(-Math.PI / 2), M.hazard, 0, .9, z1 + 13);
    L.headlamp = L.mesh(new THREE.BoxGeometry(.6, .5, .4), M.lantern, 0, 3.9, z1 + 12.3);
    // reator do século XXIII (GDD §12)
    L.reactor = L.mesh(new THREE.CylinderGeometry(.42, .42, 1.4, 14), M.neonViolet, 0, 2.2, z1 - .25); L.reactorRing = L.mesh(new THREE.TorusGeometry(.62, .06, 6, 20), M.neonCyan, 0, 2.2, z1 - .3);
    L.valve = L.mesh(new THREE.TorusGeometry(.26, .05, 6, 14), M.lampRed, -1.1, 2.0, z1 - .22); L.coreLamp = L.mesh(new THREE.BoxGeometry(.4, .14, .06), M.lampRed, 1.0, 2.3, z1 - .22);
    L.light(0, 2.6, z1 - .8, 0x9a6dff, 22, 8);
    sign('CIA. MERCÚRIO Nº 13', HW + .02, 2.6, z1 + 6, 3.6, Math.PI / 2, '#101010', '#ffcc60'); }
  L.interact.valve = V(-1.1, 1.9, 74.4); L.interact.core = V(1.0, 1.9, 74.4);
  L.interact.cargo = V(.2, 1.8, 35.2); L.interact.hatch = V(0, 4.6, 53); L.interact.hatchIn = V(0, 1.6, 53.6); L.interact.hidden = V(1.4, 1.6, 55.8); L.interact.letter = V(-1.2, 1.6, 50);
  // ---------------- ESTAÇÃO PONTE VELHA (chegada, à direita; desliza até alinhar) ----------------
  L.st1 = movable();
  GB(L.st1, M.planks, 2.05, 12, 0, 1.1, 18, 84, { tile: 3 });
  for (const z of [22, 34, 46, 58, 70, 80]) GB(L.st1, M.boards, 11.5, 11.8, 1.1, 4.4, z, z + .3);
  GB(L.st1, M.shingle, 6, 12.2, 4.4, 4.6, 20, 82, { noCol: true });
  GB(L.st1, M.adobe, 12, 22, 0, 6.5, 30, 70); GB(L.st1, M.shingle, 11.6, 22.4, 6.5, 6.9, 29.6, 70.4, { noCol: true });
  for (const [x, z] of [[8, 30], [9.5, 64], [5, 72]]) GB(L.st1, M.planks, x - .7, x + .7, 1.1, 2.0, z - .6, z + .6);
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: plate('ESTAÇÃO PONTE VELHA', '#2a3a2a', '#f0e0a8'), side: THREE.DoubleSide })); s.position.set(11.95, 3.3, 50); s.rotation.y = -Math.PI / 2; L.st1.add(s);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.3, .4, .3), M.lantern); lamp.position.set(8, 4.1, 50); L.st1.add(lamp); }
  L.st1Light = L.light(8, 3.6, 50, 0xffc070, 0, 14);
  L.pts.spawn = { x: -6, y: 1.11, z: -8, yaw: 0 }; L.pts.gate = V(7, 2.4, 50); L.pts.gateYaw = Math.PI / 2; L.pts.portal = V(-6, 3, -14);
  // ---------------- recursos, encontros, checkpoints ----------------
  const pickups = [['st_ammo', 'ammo9', 30, -4, 1.45, -4], ['st_med', 'medkit', 35, -9.5, 1.45, 2], ['c1_shell', 'shells', 6, 0, 1.55, 5], ['c2_med', 'medkit', 35, 0, 1.55, 26], ['c3_rifle', 'weapon_ferrovia', 1, -1.2, 2.1, 32.6], ['c3_ammo', 'rifle', 12, -1.2, 1.55, 39.5], ['c4_armor', 'armor', 35, 0, 4.45, 58], ['hid_ammo', 'rifle', 12, -1.3, 1.55, 53], ['tender_med', 'medkit', 35, 0, 2.95, 66.3], ['cab_rockets', 'rockets', 2, -1.3, 1.55, 72.2]];
  for (const p of pickups) L.pickup('a2m3_' + p[0], ...p.slice(1));
  for (const [id, x, y, z] of [['k1', -8.8, 1.1, -12], ['k2', 1.5, FLOOR, 30.1 + 1.3]]) L.barrel('a2m3_' + id, x, y, z);
  L.groups = {
    eg70: { trigger: (p) => p.z > -18, units: [{ type: 'E06', x: -6, y: 1.1, z: 6, role: 'hold', path: [[-6, 2]] }, { type: 'E05', x: -9.5, y: 1.1, z: 12, role: 'hold' }, { type: 'E01', x: -4, y: 1.1, z: 14, role: 'flank', portal: true, path: [[-4, 8]] }] },
    eg71: { trigger: (p) => p.z > 13.5 && p.z < 30 && Math.abs(p.x) < 2.1 && p.y > 1, units: [{ type: 'E06', x: 0, y: FLOOR, z: 27.6, role: 'hold', path: [[0, 23.5]] }, { type: 'E05', x: -.4, y: FLOOR, z: 20.2, role: 'hold' }] },
    eg72: { trigger: (p) => p.z > 29 && p.z < 45 && Math.abs(p.x) < 2.1 && p.y > 1, units: [{ type: 'E04', x: 0, y: FLOOR, z: 39.8, role: 'hold', path: [[0, 38.8]] }, { type: 'E01', x: -1, y: FLOOR, z: 35, role: 'flank' }, { type: 'E02', x: 0, y: ROOF, z: 57.5, role: 'sniper', alt: [[-1, 55], [1, 58.5]] }] },
    eg73: { trigger: (p) => p.z > 45 && p.y > 3.8 && Math.abs(p.x) < 2.1, units: [{ type: 'DRONE', x: 3.5, y: 6.5, z: 52, role: 'hold' }, { type: 'E06', x: .3, y: ROOF, z: 59.2, role: 'hold' }] },
    eg74: { trigger: (p) => p.z > 60.5 && Math.abs(p.x) < 2.1, units: [{ type: 'E05', x: 0, y: 3.28, z: 63.5, role: 'hold' }, { type: 'E04', x: .2, y: FLOOR, z: 73.6, role: 'hold' }] },
    eg75: { units: [{ type: 'E01', x: 0, y: ROOF, z: 57, role: 'flank', portal: true, path: [[0, 59.5]] }, { type: 'E06', x: 0, y: ROOF, z: 50, role: 'hold', portal: true }] },
  };
  L.checkpoints = { cp00: { ...L.pts.spawn }, cp01: { x: 0, y: FLOOR + .01, z: 4, yaw: 0, force: true }, cp02: { x: 0, y: FLOOR + .01, z: 31.6, yaw: 0, force: true }, cp03: { x: 0, y: FLOOR + .01, z: 72.6, yaw: 0, force: true }, cp04: { x: 4, y: 1.11, z: 50, yaw: Math.PI / 2, force: true } };
  L.finish(); return L;
}
let lastSafe = V(0, FLOOR + .01, 4), hazardCd = 0, warnCd = 0;
const setCols = (g, on) => { for (const c of g.userData.cols) c.enabled = on; };
function applyWorld(X) {
  const { L, S } = X, T = S.train, f = S.flags;
  setCols(L.st0, T.phase === 'station'); L.st0.visible = T.phase === 'station' || (T.phase === 'run' && T.dist < 120);
  setCols(L.st1, T.phase === 'stopped'); L.st1.visible = T.phase === 'arrive' || T.phase === 'stopped';
  setCols(L.car1, T.car1 === 'attached'); L.car1.visible = T.car1 !== 'gone';
  if (T.car1 === 'attached') { L.car1.position.set(0, 0, 0); L.car1.rotation.set(0, 0, 0); }
  for (const m of L.cargo) m.material = f.cargo_sabotaged ? L.M.dark : L.M.ore;
  L.hiddenSeal.visible = !S.seals.includes('seal_a2m3_hidden');
  L.valve.material = f.valve_closed ? L.M.lampOn : L.M.lampRed; L.coreLamp.material = f.loco_neutralized ? L.M.lampOn : L.M.lampRed;
  L.reactor.visible = L.reactorRing.visible = !f.loco_neutralized;
}
const onTrain = (p) => Math.abs(p.x) < 2.05 && p.y > 1.1 && p.z > -1.7 && p.z < 75.6;
const mission = {
  id: 'A2-M3', name: 'O Trem de Ferro', era: 'VALE DE MERCÚRIO • 1888', act: 2, sectorNames: SECTORS, sectorAt, sealsRequired: 2, sealsAvailable: 3, requiredFlags: ['train_stopped'], next: 'A2-M4', enemiesTotal: 14, secretsTotal: 2, ambientTrack: 10, build,
  newState: () => ({ train: newTrain() }),
  outdoor: (p) => !(Math.abs(p.x) < 2 && p.y < 3.9 && p.z > 0 && p.z < 60 && !(p.z > CARS.c3[0] && p.z < CARS.c3[1])),
  startLoadout: () => ({ weapons: { martelo9: { have: true, mag: 15 }, trovao_duplo: { have: true, mag: 2 }, rompe_casco: { have: true, mag: 1 } }, ammo: { ammo9: 80, shells: 10, rockets: 2, rifle: 0 }, current: 'martelo9', holster: false }),
  ecoLocked: () => false, afterReset(X) { X.unlockEco(); },
  gateVisible: (X) => X.S.train.phase === 'stopped',
  apply(X) { const T = X.S.train; lastSafe = T.phase === 'stopped' ? V(4, 1.11, 50) : T.phase === 'station' ? V(-6, 1.11, -8) : V(0, FLOOR + .01, 31.6); hazardCd = 0; warnCd = 0; if (T.car1 === 'falling') T.car1 = 'gone'; applyWorld(X); },
  onResume(X) {
    const f = X.S.flags, T = X.S.train;
    if (f.loco_neutralized && !X.S.groupsDone.includes('eg75') && moving(T)) X.startGroup('eg75');
  },
  intro(X) {
    X.say('ÍRIS-9', 'O mapa da mina leva a este trem. Ele carrega caixas com leitura temporal — e a locomotiva tem uma assinatura de energia impossível.');
    X.say('GAEL', 'Um trem cheio de bandido e carga roubada. Vou me sentir num filme antigo. Só que eu sou o filme.');
    X.say('ÍRIS-9', 'Embarque pela varanda traseira. Chegue à locomotiva e pare o carregamento antes da ponte.');
  },
  objective(X) {
    const { S } = X, f = S.flags, T = S.train;
    if (T.phase === 'station') return 'Limpe a plataforma e embarque pela varanda traseira do trem';
    if (!f.loco_neutralized) {
      if (!f.cargo_sabotaged && X.P.body.pos.z < CARS.c3[1]) return 'Avance pelos vagões: sabote a carga temporal na gôndola';
      return f.valve_closed ? 'Cabine: arranque o núcleo do reator' : 'Chegue à locomotiva (por cima do vagão postal) e feche a válvula de vapor';
    }
    if (T.phase !== 'stopped') return T.phase === 'bridge' ? 'A ponte está partida! Segure-se — o trem atravessa no embalo' : 'O trem está freando: sobreviva até a estação';
    if (S.seals.length < 2) return 'Falta um Selo: a carga da gôndola ou o vagão postal oculto (escotilha no teto)';
    return 'Desça na Estação Ponte Velha e atravesse a Fenda de Saída';
  },
  waypoint(X) {
    const { S, L, P } = X, f = S.flags, T = S.train, p = P.body.pos;
    if (T.phase === 'station') return V(0, 2.2, -.8);
    if (!f.loco_neutralized) {
      if (!f.cargo_sabotaged && p.z < CARS.c3[1]) return p.z < CARS.c3[0] ? V(0, 2.2, CARS.c3[0] + 1) : L.interact.cargo;
      if (p.z < CARS.c4[0] && p.y < 3.8) return V(-1, 4.6, 44.5);
      return f.valve_closed ? L.interact.core : L.interact.valve;
    }
    if (T.phase !== 'stopped') return null;
    if (S.seals.length < 2) return !S.seals.includes('seal_a2m3_hidden') ? L.interact.hatch : L.interact.cargo;
    return L.pts.gate;
  },
  gateHint(X) { return X.S.train.phase !== 'stopped' ? 'O trem ainda não parou.' : 'Confirme dois Selos: carga, locomotiva ou vagão oculto.'; },
  exitLine: 'Selos confirmados. A Companhia levava a carga para um forte nas montanhas: Forte Meia-Noite.',
  deathTips: ['No teto do trem, a viga avisa antes de passar: agache (C) ou desça para dentro do vagão.', 'O vagão postal não tem portas: suba pelos caixotes da gôndola e siga pelo teto.', 'A Ferrovia atravessa um inimigo e acerta o de trás: alinhe os tiros no corredor.', 'O Bruto Réptil gira a minigun antes de atirar. Quebre a linha de visão atrás dos caixotes.'],
  interactables(X, add) {
    const { S, L, P } = X, f = S.flags, T = S.train;
    if (!f.cargo_sabotaged) add(L.interact.cargo, 'Sabotar a carga temporal', () => {
      f.cargo_sabotaged = true; X.sfx.power(); X.fx.flash(V(1, 2.6, 35), 2.2, .4, 0x3affd0); X.fx.sparks(V(1, 2.6, 35), 0x3affd0, 40, 5, .8); applyWorld(X);
      X.grantSeal('seal_a2m3_cargo', V(.6, 2.4, 35)); X.say('ÍRIS-9', 'Núcleos temporais drenados. Estavam indo para um forte nas montanhas.');
    });
    if (T.phase !== 'station') {
      add(L.interact.hatch, 'Descer pela escotilha do vagão postal', () => { P.body.pos.set(0, FLOOR + .01, 53.6); P.body.vel.set(0, 0, 0); X.sfx.door(); if (!S.secrets.includes('mail_car')) S.secrets.push('mail_car'); });
      add(L.interact.hatchIn, 'Subir pela escotilha', () => { P.body.pos.set(0, ROOF + .01, 54.4); P.body.vel.set(0, 0, 0); X.sfx.door(); });
    }
    if (!S.seals.includes('seal_a2m3_hidden')) add(L.interact.hidden, 'Pegar o selo escondido na mala postal', () => { L.hiddenSeal.visible = false; X.grantSeal('seal_a2m3_hidden', L.interact.hidden); X.say('GAEL', 'Correio lacrado com um Selo dentro. Alguém aqui sabia o que estava fazendo.'); });
    if (!f.letters_read) add(L.interact.letter, 'Ler as cartas extraviadas', () => {
      f.letters_read = true; if (!S.secrets.includes('lost_letters')) S.secrets.push('lost_letters');
      X.openDoc({ k: 'VAGÃO POSTAL • CARTAS DEVOLVIDAS', t: 'Destinatário desconhecido', b: 'Doze cartas para moradores de Poeira Alta, todas carimbadas "DESTINATÁRIO INEXISTENTE".\n\nUma delas, de Benedito Sá — o mineiro que sumiu do livro de ponto — para a esposa:\n"Se o nosso nome sumir dos papéis, guarde esta carta. Papel apagado ainda é papel."\n\nÍris-9: "Vou registrar todos os nomes. Ninguém mais some daqui."' });
    });
    if (!f.valve_closed) add(L.interact.valve, 'Fechar a válvula de vapor', () => { if (!closeValve(S)) return; X.sfx.power(); applyWorld(X); X.toast('VÁLVULA FECHADA • o reator perdeu pressão', 2); X.say('ÍRIS-9', 'Agora o núcleo. Puxe a haste com cuidado — ele ainda está quente.'); });
    if (!f.loco_neutralized) add(L.interact.core, f.valve_closed ? 'Arrancar o núcleo do reator' : 'Núcleo do reator (vapor escaldante)', () => {
      if (!pullCore(S)) { X.toast('Vapor escaldante! Feche a válvula do lado esquerdo primeiro', 2); X.sfx.empty(); return; } X.sfx.explosion(); X.fx.shake(.4); X.fx.flash(V(0, 2.2, 75), 2.4, .5, 0x9a6dff); applyWorld(X);
      X.grantSeal('seal_a2m3_loco', V(0, 2.4, 74.6)); X.sfx.whistle();
      X.say('ÍRIS-9', 'Locomotiva neutralizada! Mas... a ponte à frente está partida. Sem freio a tempo — vamos atravessar no embalo!');
      X.say('GAEL', 'Ótimo. Até os trens agora têm complexo de superioridade.');
      startBridge(T); X.startGroup('eg75');
    });
  },
  tick(X, dt) {
    const { S, L, P } = X, f = S.flags, T = S.train, p = P.body.pos;
    hazardCd = Math.max(0, hazardCd - dt); warnCd = Math.max(0, warnCd - dt);
    // embarque: o trem parte quando Gael sobe; capangas que ficaram na plataforma são deixados para trás
    if (T.phase === 'station' && onTrain(p)) {
      depart(T); X.sfx.whistle(); X.fx.shake(.15); X.saveCheckpoint('cp01');
      for (const e of X.enemies.list) if (e.active && e.group === 'eg70') e.deactivate();
      X.say('ÍRIS-9', 'Partimos. Do teto você vê mais, mas fica exposto às vigas. Dentro dos vagões é mais seguro.');
      applyWorld(X);
    }
    const onRoof = p.y > ROOF - .3 && Math.abs(p.x) < 2.05;
    for (const e of stepTrain(T, dt, onRoof)) {
      if (e === 'beamWarn' && (onRoof || p.z > CARS.c3[0])) { X.sfx.horn(); X.toast('VIGA À FRENTE • AGACHE (C) OU DESÇA DO TETO', 2.2); if (onRoof) X.say('ÍRIS-9', 'Viga! Abaixe-se!', 1.6); }
      if (e === 'decouple') {
        X.sfx.crash(); X.fx.shake(.5); setCols(L.car1, false);
        if (p.z < CARS.c1[1] + .2 && Math.abs(p.x) < 2.1) { p.set(0, FLOOR + .01, 17); P.body.vel.set(0, 0, 0); X.toast('O VAGÃO DE TRÁS SOLTOU! • você pulou a tempo', 2.4); }
        X.say('GAEL', 'Lá se vai o vagão de passageiros. Espero que ninguém tenha comprado passagem de volta.');
      }
      if (e === 'stopped') { f.train_stopped = true; X.sfx.whistle(); applyWorld(X); X.saveCheckpoint('cp04'); X.say('ÍRIS-9', 'Paramos na Estação Ponte Velha. A Fenda abriu na plataforma.'); }
      if (e === 'arrive') applyWorld(X);
    }
    if (T.phase === 'stopped' && !f.train_stopped) { f.train_stopped = true; applyWorld(X); }
    // vigas
    if (!hazardCd && beamHits(T, p, P.crouch)) { hazardCd = 1.2; X.damagePlayer(30, V(p.x, 5.6, T.beamZ + 2)); X.fx.shake(.4); X.sfx.crash(); X.toast('VIGA! • agache no teto', 1.6); p.z = Math.max(-1, p.z - 2.2); }
    // queda do trem em movimento → volta ao último ponto seguro do comboio
    if (P.body.grounded && onTrain(p)) lastSafe = p.clone();
    if (P.body.grounded && T.phase === 'stopped' && p.x > 2 && p.y > 1) lastSafe = p.clone();
    if (moving(T) && p.y < .9 && !P.dead) { X.fallRecover(lastSafe); X.toast('Caiu do trem • de volta ao vagão', 1.8); return; }
    if (p.y < -3) { X.fallRecover(lastSafe); return; }
    // checkpoints ao avançar
    if (T.phase === 'run' && p.z > CARS.c3[0] + .4 && onTrain(p) && !['cp02', 'cp03', 'cp04'].includes(S.checkpointId)) X.saveCheckpoint('cp02');
    if (T.phase === 'run' && p.z > CARS.cab[0] + .5 && p.y < 2 && onTrain(p) && !['cp03', 'cp04'].includes(S.checkpointId)) X.saveCheckpoint('cp03');
    if (moving(T) && Math.random() < dt * T.speed * .12) X.sfx.chug();
  },
  frame(X, dt, t) {
    const { S, L } = X, T = S.train, d = T.dist;
    L.groundMat.map.offset.y = -d / (1000 / 120); L.tiesMat.map.offset.y = -d / (600 / 150);
    for (const s of L.scroll) { const z = ((s.z - d) % s.span + s.span) % s.span - 100; s.obj.position.z = z; }
    const bridge = T.phase === 'bridge';   // já sobre a ponte; o trecho partido (segmento 9) passa sob o vagão de trás
    L.bridge.visible = bridge; L.gorge.visible = bridge; L.ground.visible = !bridge; for (const s of L.scroll) s.obj.visible = !bridge;
    if (bridge) L.bridge.position.z = -30 - T.t * T.speed;
    L.st0.position.z = T.phase === 'station' ? 0 : -d; L.st0.visible = T.phase === 'station' || d < 140;
    L.st1.position.z = T.phase === 'arrive' ? T.arriveLeft : 0; L.st1Light.intensity = L.st1.visible ? 20 : 0; L.st1Light.pos.z = 50 + L.st1.position.z;
    L.beam.visible = T.beamZ !== null; if (T.beamZ !== null) L.beam.position.z = T.beamZ;
    if (T.car1 === 'falling') { const k = T.decoupleT; L.car1.position.set(0, -k * k * 4, -k * 9 - k * k * 2); L.car1.rotation.x = Math.min(1.2, k * .5); }
    else if (T.car1 === 'gone') L.car1.visible = false;
    if (L.reactor.visible) { L.reactorRing.rotation.z += dt * 3; L.reactor.material = Math.sin(t * 6) > 0 ? L.M.neonViolet : L.M.neonCyan; }
    L.headlamp.material = moving(T) ? L.M.lantern : L.M.dark;
  },
  onGroupDone() {},
  menuCam(t, cam) { cam.position.set(9 + Math.sin(t * .1) * 3, 6.5, 20 + Math.sin(t * .07) * 15); cam.lookAt(0, 2.5, 45); return V(0, 3, 40); },
  resultsText: (X) => `${X.S.pecas} Peças Cronais. Carga ${X.S.flags.cargo_sabotaged ? 'sabotada' : 'intacta'}, locomotiva neutralizada e ponte atravessada. Próximo destino: A2-M4 — Forte Meia-Noite.`,
  onComplete(X, campaign) { campaign.flags.ferrovia_unlocked = true; },
};
export default mission;
