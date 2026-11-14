// A2-M2 — MINA TREZE. Galerias, trilhos com vagões, perfuratrizes temporais, perseguição, reservatório e
// elevador principal (GDD §8 Ato II, §8.2, §35: "vagões, trilhos, luz e acústica; perseguição por perfuratriz").
import * as THREE from 'three';
import { createBuilder, canvasTex, makeSky, makeDust, lantern } from '../world.js';
import { CART, CHASE, newDrillState, hitTank, tanksVented, disarm, cartAt, cartHits, stepChase, chaseHits, drain } from './mina-state.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SECTORS = { mouth: 'Boca da Mina', gallery: 'Galeria de Entrada', cavern: 'Cruzamento dos Trilhos', tunnel: 'Túnel Norte', hall: 'Salão do Reservatório', ore: 'Galeria Mineral', channel: 'Canal de Drenagem', lift: 'Elevador Principal' };
export const MINA_ROUTE = { spawn: [0, .01, 2], panelA: [-7.6, .01, 83], lever: [17, 3.21, 148], gate: [0, .01, 206] };
function sectorAt(p) {
  if (p.z < 22) return 'mouth';
  if (p.z < 60) return 'gallery';
  if (p.z < 90) return 'cavern';
  if (p.z < 142) return 'tunnel';
  if (p.x < -20) return 'ore';
  if (p.z < 168) return 'hall';
  if (p.z < 200) return 'channel';
  return 'lift';
}
function plank(text, bg = '#3a2414', ink = '#f0d8a0') {
  return canvasTex(512, 128, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#1a0e06'; c.lineWidth = 8; c.strokeRect(4, 4, 504, 120); c.font = 'bold 52px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(text, 259, 68); c.fillStyle = ink; c.fillText(text, 256, 64); }, false);
}
function build(scene) {
  const L = createBuilder(scene), { B, D, M, root } = L;
  L.fogColor = 0x120e0c; L.fogDensity = 0.018; L.hemi = 0.75; L.moon = 0.35;
  L.sunColor = 0x8aa0ff; L.hemiSky = 0x8a7a6a; L.hemiGround = 0x1a120c;
  makeSky(L, 0x04060c, 0x161a2a, 0x2a1a10); makeDust(L, 260, 0xc8a070, 0.05, 0.05);
  const sign = (t, x, y, z, w, ry, bg, ink) => { const m = L.mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: plank(t, bg, ink), side: THREE.DoubleSide }), x, y, z); m.rotation.y = ry; return m; };
  const cyl = (mat, x, y, z, r, h, rx = 0, rz = 0, seg = 12) => { const g = new THREE.CylinderGeometry(r, r, h, seg); g.rotateX(rx); g.rotateZ(rz); return L.mesh(g, mat, x, y, z); };
  const rails = (x0, x1, z0, z1, alongX) => {
    if (alongX) { for (const dz of [-.55, .55]) B(M.iron, x0, x1, .02, .14, z0 + dz - .05, z0 + dz + .05, { noCol: true }); for (let x = x0; x < x1; x += .9) B(M.boards, x, x + .25, 0, .05, z0 - .9, z0 + .9, { noCol: true }); }
    else { for (const dx of [-.55, .55]) B(M.iron, x0 + dx - .05, x0 + dx + .05, .02, .14, z0, z1, { noCol: true }); for (let z = z0; z < z1; z += .9) B(M.boards, x0 - .9, x0 + .9, 0, .05, z, z + .25, { noCol: true }); }
  };
  const frame = (z, w = 3.7, h = 4.4) => { for (const s of [-1, 1]) B(M.boards, s * w - .16, s * w + .16, 0, h, z - .16, z + .16); B(M.boards, -w - .2, w + .2, h, h + .35, z - .2, z + .2, { noCol: true }); };
  // ---------------- boca da mina (exterior noturno) ----------------
  B(M.sand, -30, 30, -1, 0, -10, 22, { tile: 6 }); B(M.rock, -36, -30, 0, 16, -10, 22); B(M.rock, 30, 36, 0, 16, -10, 22); B(M.rock, -36, 36, 0, 16, -12, -10);
  B(M.rock, -30, -4, 0, 18, 18, 22); B(M.rock, 4, 30, 0, 18, 18, 22); B(M.rock, -4, 4, 5, 18, 18, 22);
  frame(21.8, 4, 5); sign('MINA TREZE', 0, 5.9, 17.75, 7, Math.PI, '#3a1a0a', '#ffd070'); sign('CIA. MERCÚRIO • PROIBIDO', 0, 5.0, 17.74, 5, Math.PI, '#5a0a0a', '#ffe0a0');
  L.pts.spawn = { x: 0, y: .01, z: 2, yaw: 0 }; L.pts.portal = V(0, 2.2, -3);
  B(M.planks, -16, -9, 0, 3.4, 6, 12); B(M.shingle, -16.4, -8.6, 3.4, 3.6, 5.6, 12.4, { noCol: true }); sign('ESCRITÓRIO', -12.5, 2.6, 12.42, 3, 0, '#2a1a0a');
  B(M.planks, 10, 13, 0, 1.2, 8, 12); B(M.boards, 9.6, 13.4, 1.2, 1.3, 7.6, 12.4, { noCol: true });
  for (let i = 0; i < 3; i++) B(M.rock, 6 + i * 2.2, 8 + i * 2.2, 0, .8 + i * .4, 14 - i, 16);
  rails(0, 0, 4, 22, false);
  lantern(L, -4.4, 3.6, 17.6, 0xffb35a, 18, 12); lantern(L, 4.4, 3.6, 17.6, 0xffb35a, 18, 12); lantern(L, -9, 2.8, 9, 0xffb35a, 12, 10);
  // ---------------- galeria de entrada ----------------
  B(M.rock, -4, 4, -1, 0, 22, 60, { tile: 3 }); B(M.rock, -10, -4, 0, 6, 22, 39.8); B(M.rock, -10, -4, 0, 6, 44.2, 60); B(M.rock, -10, -7.2, 0, 6, 39.8, 44.2); B(M.rock, -7.2, -4, 3, 6, 39.8, 44.2); B(M.rock, -7.2, -4, -1, 0, 39.8, 44.2); B(M.rock, 4, 10, 0, 6, 22, 60); B(M.rock, -4, 4, 5, 6, 22, 60);
  rails(0, 0, 22, 60, false);
  for (let z = 27; z < 60; z += 6) frame(z);
  for (let z = 26; z < 60; z += 8) lantern(L, z % 16 ? 3.5 : -3.5, 3.2, z, 0xffb35a, 14, 10);
  B(M.wood, -6.9, -5.9, 0, .9, 41, 43);   // nicho do capataz
  L.interact.log = V(-5.6, 1.2, 42);
  const cartMat = new THREE.MeshLambertMaterial({ color: 0x5a3a28 });
  B(M.iron, -1.2, 1.2, .3, 1.4, 47, 49.4); B(M.hay, -1, 1, 1.4, 1.5, 47.2, 49.2, { noCol: true });   // vagão parado (cobertura)
  B(M.boards, -3.8, -2.6, 0, 1.0, 33, 34.2); B(M.boards, 2.6, 3.8, 0, 1.2, 53, 54.6);
  // ---------------- cruzamento dos trilhos (caverna) ----------------
  B(M.rock, -16, 16, -1, 0, 60, 90, { tile: 4 }); B(M.rock, -22, -16, 0, 11, 60, 90); B(M.rock, 16, 22, 0, 11, 60, 90); B(M.rock, -16, 16, 10, 11, 60, 90);
  B(M.rock, -16, -4, 0, 10, 59.6, 60); B(M.rock, 4, 16, 0, 10, 59.6, 60); B(M.rock, -16, -4, 0, 10, 90, 90.4); B(M.rock, 4, 16, 0, 10, 90, 90.4);
  B(M.rock, -4, 4, 5, 10, 59.6, 60); B(M.rock, -4, 4, 5, 10, 90, 90.4);
  for (const s of [-1, 1]) B(M.dark, s * 15.9 - .1, s * 15.9 + .1, 0, 2.6, 72.4, 75.6, { noCol: true });
  rails(-16, 16, CART.z, 0, true); rails(0, 0, 60, 72.6, false); rails(0, 0, 75.4, 90, false);
  L.cart = new THREE.Group(); root.add(L.cart);
  { const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.5), cartMat); body.position.y = .95; L.cart.add(body);
    const ore = new THREE.Mesh(new THREE.BoxGeometry(2, .3, 1.3), M.ore); ore.position.y = 1.5; L.cart.add(ore);
    for (const dx of [-.7, .7]) for (const dz of [-.6, .6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .12, 10), M.iron); w.rotation.x = Math.PI / 2; w.position.set(dx, .3, dz); L.cart.add(w); } }
  L.cart.position.set(CART.x0, 0, CART.z); L.cart.visible = false;
  L.warn = []; for (const x of [-4.6, 4.6]) { B(M.iron, x - .08, x + .08, 0, 2.4, CART.z - 1.6, CART.z - 1.44); L.warn.push(L.mesh(new THREE.SphereGeometry(.16, 8, 6), M.lampOff, x, 2.5, CART.z - 1.52)); }
  sign('CUIDADO • VAGÕES', 0, 3.6, 70.6, 3.4, 0, '#6a4a10', '#1a0e06');
  // passarela leste com escada
  for (let i = 0; i < 7; i++) B(M.planks, 12, 15.9, 0, (i + 1) * .4286, 62 + i * .6, 62.6 + i * .6, { tile: 1 });
  B(M.planks, 10, 15.9, 2.7, 3.0, 66.2, 88); B(M.rail, 10, 10.1, 3, 4, 66.2, 88, { col: { seeThrough: true } });
  for (const z of [68, 76, 86]) B(M.boards, 10.1, 10.4, 0, 2.7, z, z + .3);
  // perfuratriz A (estacionária): dois tanques de pressão para atirar e painel de desarme
  B(M.iron, -14, -9, 0, 3, 80, 86); L.drillA = L.mesh(new THREE.ConeGeometry(1.25, 2.8, 10).rotateZ(Math.PI / 2), M.brass, -15.1, 1.6, 83);
  L.tanks = {};
  const tank = (id, x, y, z) => { const m = cyl(M.hazard, x, y, z, .45, 1.3); const glow = cyl(M.neonAmber, x, y + .72, z, .3, .12); const col = B(M.iron, x - .45, x + .45, y - .65, y + .65, z - .45, z + .45, { invisible: true, col: { drillTank: id } }); L.tanks[id] = { mesh: m, glow, col }; };
  tank('A0', -12.6, 3.65, 81.5); tank('A1', -10.4, 3.65, 84.5);
  B(M.iron, -8.9, -8.5, 0, 1.6, 82.2, 83.8); L.panelA = L.mesh(new THREE.BoxGeometry(.06, .4, .6), M.lampRed, -8.46, 1.25, 83); L.interact.panelA = V(-8.2, 1.2, 83);
  sign('PERFURATRIZ TEMPORAL', -11.5, 4.9, 79.9, 4.4, 0, '#2a0a0a', '#ff9a50');
  for (const [x, z] of [[-14, 66], [13, 89], [-15, 89], [14, 62]]) { L.mesh(new THREE.OctahedronGeometry(.6, 0), M.ore, x, .8, z); L.light(x, 1.5, z, 0x3affd0, 14, 9); }
  lantern(L, 0, 6, 64, 0xffb35a, 22, 16); lantern(L, 0, 6, 86, 0xffb35a, 22, 16); lantern(L, 13, 4.6, 76, 0xffb35a, 14, 10);
  // ---------------- túnel norte (perseguição) ----------------
  B(M.rock, -4, 4, -1, 0, 90, 142, { tile: 3 }); B(M.rock, -10, -4, 0, 6, 90, 142); B(M.rock, 4, 10, 0, 6, 90, 117.6); B(M.rock, 4, 10, 0, 6, 124.4, 142); B(M.rock, -4, 4, 5, 6, 90, 142);
  B(M.rock, 4, 8.4, -1, 0, 117.6, 124.4); B(M.rock, 8.4, 10, 0, 6, 117.6, 124.4); B(M.rock, 4, 10, 3.2, 6, 117.6, 124.4);   // nicho para escapar
  sign('ABRIGO', 6.2, 2.7, 117.7, 1.8, 0, '#203a20');
  rails(0, 0, 90, 140, false);
  for (let z = 96; z < 140; z += 6) frame(z);
  for (let z = 98; z < 140; z += 10) lantern(L, -3.5, 3.2, z, 0xffb35a, 14, 10);
  L.rubble = D(M.rock, -4, 4, 0, 5, 140.4, 142); L.rubbleHide = true;
  // perfuratriz B (móvel) — o mesh acompanha S.mine.chaseZ
  L.drillB = new THREE.Group(); root.add(L.drillB);
  { const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 5), M.iron); body.position.y = 1.7; L.drillB.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.05, .4, 5.05), M.hazard); stripe.position.y = 1.0; L.drillB.add(stripe);
    L.bit = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3.0, 12).rotateX(Math.PI / 2), M.brass); L.bit.position.set(0, 1.8, 3.9); L.drillB.add(L.bit);
    for (const dx of [-2.3, 2.3]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(.6, .8, 5.4), M.dark); tr.position.set(dx, .4, 0); L.drillB.add(tr); }
    L.drillBLight = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), M.lampRed); L.drillBLight.position.set(0, 3.5, 2.4); L.drillB.add(L.drillBLight); }
  L.drillB.visible = false; L.drillBCol = B(M.iron, -2.5, 2.5, 0, 3.3, 134, 139, { invisible: true }); L.drillBCol.enabled = false;
  tank('B0', -1.3, 3.95, 135.2); tank('B1', 1.3, 3.95, 135.2);
  L.interact.panelB = V(3.1, 1.2, 135.5);
  L.chaseLight = L.light(0, 3, CHASE.z0 + 4, 0xff4020, 0, 12);
  // ---------------- salão do reservatório ----------------
  B(M.rock, -20, 20, -1, 0, 142, 168, { tile: 4 }); B(M.rock, -26, -20, 0, 13, 142, 151.6); B(M.rock, -26, -20, 0, 13, 154.4, 168);   B(M.rock, -26, -20, 1.1, 13, 151.6, 154.4); B(M.rock, 20, 26, 0, 13, 142, 168); B(M.rock, -20, 20, 12, 13, 142, 168);
  B(M.rock, -20, -4, 0, 12, 141.6, 142); B(M.rock, 4, 20, 0, 12, 141.6, 142); B(M.rock, -4, 4, 5, 12, 141.6, 142);
  B(M.concrete, -20, -4, 0, 12, 168, 172.5); B(M.concrete, 4, 20, 0, 12, 168, 172.5); sign('REPRESA 13', 0, 7.5, 167.9, 6, Math.PI, '#2a2a2a', '#e8e0c0');
  for (let i = 0; i < 8; i++) B(M.planks, 16.5, 19.9, 0, (i + 1) * .4, 165 - (i + 1) * 1.1, 165 - i * 1.1, { tile: 1 });
  B(M.planks, 14, 19.9, 2.9, 3.2, 144, 156.2); B(M.rail, 14, 14.1, 3.2, 4.2, 144, 156.2, { col: { seeThrough: true } }); for (const z of [146, 154]) B(M.boards, 14.1, 14.4, 0, 2.9, z, z + .3);
  B(M.iron, 18.6, 19.6, 3.2, 4.6, 147.4, 148.6); L.lever = L.mesh(new THREE.BoxGeometry(.12, 1.0, .12), M.lampRed, 18.4, 4.5, 148); L.lever.rotation.z = .6; L.interact.lever = V(17.4, 4.2, 148);
  sign('COMPORTA DE DRENAGEM', 19.85, 5.5, 148, 3.6, -Math.PI / 2, '#20304a', '#e0f0ff');
  for (const [x, z, w] of [[-10, 150, 3], [8, 158, 2.5], [-6, 162, 2]]) B(M.boards, x - w / 2, x + w / 2, 0, 1.3, z - .7, z + .7);
  B(M.iron, -15, -12.6, .3, 1.4, 158, 161); for (const [x, z] of [[-14.2, 158.2], [-13.4, 160.8]]) cyl(M.iron, x, .3, z, .28, .1, 0, Math.PI / 2);
  lantern(L, -18, 5, 146, 0xffb35a, 20, 14); lantern(L, 0, 8, 156, 0xffb35a, 24, 18); lantern(L, 18, 6, 152, 0xffb35a, 16, 12);
  // galeria mineral (passagem agachada a 1,1 m) — terceiro selo e minério para melhorias
  B(M.rock, -26, -20, -1, 0, 151.6, 154.4);
  B(M.rock, -36, -26, -1, 0, 142, 166, { tile: 3 }); B(M.rock, -40, -36, 0, 6, 142, 166); B(M.rock, -36, -26, 0, 6, 141.6, 142); B(M.rock, -36, -26, 0, 6, 166, 166.4); B(M.rock, -36, -26, 4.4, 6, 142, 166);
  for (const [x, y, z, s] of [[-34, .6, 145, .9], [-30, 3.6, 150, .7], [-35, 1.2, 158, 1.1], [-28, .5, 163, .8], [-32, 3.8, 161, .6], [-27.5, 1.4, 146, .5], [-33, .4, 152, .7]]) L.mesh(new THREE.OctahedronGeometry(s, 0), M.ore, x, y, z).rotation.set(s, s * 2, 0);
  L.light(-31, 2.4, 148, 0x3affd0, 22, 12); L.light(-31, 2.4, 160, 0x3affd0, 22, 12);
  B(M.iron, -34.4, -33, 0, .9, 153.4, 154.6); L.oreSeal = L.mesh(new THREE.OctahedronGeometry(.3, 0), M.neonAmber, -33.7, 1.3, 154); L.interact.ore = V(-32.4, 1.0, 154);
  sign('NÃO ENTRE', -20.05, 2.3, 153, 2, Math.PI / 2, '#5a0a0a');
  // ---------------- canal de drenagem e elevador ----------------
  for (let i = 0; i < 9; i++) B(M.concrete, -4, 4, -6, -(i + 1) * .4, 168 + i * .5, 168.5 + i * .5, { tile: 1 });
  B(M.concrete, -6, 6, -6, -3.6, 172.5, 196, { tile: 3 }); B(M.rock, -20, -6, -6, 12, 172.5, 196); B(M.rock, 6, 20, -6, 12, 172.5, 196); B(M.rock, -6, -4, -6, 0, 168, 172.5); B(M.rock, 4, 6, -6, 0, 168, 172.5);
  for (let i = 0; i < 9; i++) B(M.concrete, -4, 4, -6, -3.6 + (i + 1) * .4, 196 + i * .5, 196.5 + i * .5, { tile: 1 });
  B(M.rock, -6, -4, -6, 0, 196, 200.5); B(M.rock, 4, 6, -6, 0, 196, 200.5);
  for (const x of [-5.9, 5.9]) for (let z = 176; z < 196; z += 5) B(M.iron, x - .1, x + .1, -3.6, 2, z, z + .3);
  B(M.rock, -6, 6, 8, 9, 168, 196);
  L.water = L.mesh(new THREE.PlaneGeometry(12, 23.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1fb0a0, transparent: true, opacity: .62, depthWrite: false }), 0, -.3, 184.25);
  L.flood = D(M.glass, -4, 4, 0, 4, 168.05, 168.4); L.flood.mesh.visible = false;
  L.light(0, -1.6, 180, 0x2affc0, 18, 14); L.light(0, -1.6, 192, 0xffb35a, 16, 12);
  B(M.planks, -6, 6, -1, 0, 200.5, 212); B(M.rock, -12, -6, 0, 12, 196, 212); B(M.rock, 6, 12, 0, 12, 196, 212); B(M.rock, -12, 12, 0, 12, 212, 214); B(M.rock, -12, 12, 9, 12, 196, 212);
  for (const x of [-3, 3]) B(M.iron, x - .15, x + .15, 0, 8, 210, 210.3); B(M.iron, -3, 3, 7.6, 8, 204, 210.3, { noCol: true }); for (const x of [-3, 3]) B(M.iron, x - .06, x + .06, 0, 7.6, 204, 204.12, { noCol: true });
  L.cage = L.mesh(new THREE.BoxGeometry(5.6, .2, 5.6), M.planks, 0, .1, 207); sign('ELEVADOR PRINCIPAL', 0, 6.2, 211.7, 6, Math.PI, '#2a1a0a', '#ffd070');
  lantern(L, -5, 3.4, 202, 0xffb35a, 18, 12); lantern(L, 5, 3.4, 202, 0xffb35a, 18, 12);
  L.pts.gate = V(0, 1.3, 207); L.pts.gateYaw = 0;
  for (const [id, x, y, z] of [['cA', 9, 0, 66], ['cB', -6, 0, 88], ['cC', -14, 0, 164], ['cD', 3, 0, 146]]) L.barrel('a2m2_' + id, x, y, z);
  // ---------------- recursos, encontros, checkpoints ----------------
  const pickups = [['mouth_ammo', 'ammo9', 30, 2, .35, 6], ['gal_med', 'medkit', 35, -3, .35, 38], ['gal_shell', 'shells', 6, 3, .35, 51], ['cav_armor', 'armor', 35, 12, 3.35, 80], ['cav_ammo', 'ammo9', 30, -6, .35, 66], ['niche_med', 'medkit', 40, 6.2, .35, 121], ['hall_rockets', 'rockets', 2, -14, .35, 146], ['hall_ammo', 'ammo9', 45, 17, 3.55, 152], ['chan_shell', 'shells', 6, -4, -3.25, 186], ['lift_med', 'medkit', 35, 4, .35, 203]];
  for (const p of pickups) L.pickup('a2m2_' + p[0], ...p.slice(1));
  L.groups = {
    eg60: { trigger: (p) => p.z > 5 && p.z < 30, units: [{ type: 'E06', x: 3, y: 0, z: 14, role: 'hold', path: [[3, 11]] }, { type: 'E05', x: -6, y: 0, z: 15, role: 'hold' }] },
    eg61: { trigger: (p) => p.z > 61 && p.z < 90, units: [{ type: 'E05', x: -8, y: 0, z: 78, role: 'hold' }, { type: 'E06', x: 13, y: 3, z: 84, role: 'hold' }, { type: 'E01', x: 4, y: 0, z: 86, role: 'flank', path: [[2, 80]] }, { type: 'DRONE', x: 0, y: 5, z: 78, role: 'hold' }] },
    eg62: { trigger: (p, X) => X.S.flags.chase_done && p.z > 142.5 && p.z < 168, units: [{ type: 'E04', x: 0, y: 0, z: 162, role: 'hold', path: [[0, 154]] }, { type: 'E01', x: -12, y: 0, z: 150, role: 'flank', portal: true, path: [[-8, 148]] }, { type: 'E05', x: 17, y: 3.2, z: 151, role: 'hold' }] },
    eg63: { trigger: (p, X) => X.S.flags.reservoir_drained && p.z > 172 && p.z < 200, units: [{ type: 'E05', x: -3, y: -3.6, z: 190, role: 'hold' }, { type: 'E06', x: 3, y: -3.6, z: 192, role: 'hold' }, { type: 'E04', x: 0, y: 0, z: 205, role: 'hold', path: [[0, 202]] }] },
  };
  L.checkpoints = { cp00: { ...L.pts.spawn }, cp01: { x: 0, y: .01, z: 62.5, yaw: 0, force: true }, cp02: { x: 0, y: .01, z: 146, yaw: 0, force: true }, cp03: { x: 0, y: .01, z: 166.5, yaw: 0, force: true } };
  L.finish(); return L;
}
let lastSafe = V(0, .01, 2), hazardCd = 0;
function applyWorld(X) {
  const { L, S } = X, f = S.flags, m = S.mine;
  for (const [id, t] of Object.entries(L.tanks)) { const alive = m.tanks[id] > 0 && (id[0] === 'A' || !!f.chase_done); t.mesh.visible = alive; t.glow.visible = alive; t.col.enabled = alive; }
  L.panelA.material = f.drill_A ? L.M.lampOn : tanksVented(S, 'A') ? L.M.neonAmber : L.M.lampRed;
  L.drillB.visible = !!f.chase_started; L.drillB.position.set(0, 0, m.chaseZ); L.drillBCol.enabled = !!f.chase_done;
  L.rubble.col.enabled = !f.chase_done; L.rubble.mesh.visible = !f.chase_done;
  L.flood.col.enabled = !f.reservoir_drained; L.water.position.y = f.reservoir_drained ? -3.9 : -.3;
  L.lever.rotation.z = f.reservoir_drained ? -.6 : .6; L.lever.material = f.reservoir_drained ? L.M.lampOn : L.M.lampRed;
  L.oreSeal.visible = !S.seals.includes('seal_a2m2_ore'); L.chaseLight.intensity = 0;
}
function crashDrill(X) {
  const { S, L, P } = X, p = P.body.pos; X.sfx.crash();
  if (Math.abs(p.x) < 2.9 && p.z > 133.4 && p.z < 139.6) p.set(3.0, .01, Math.min(139.3, Math.max(133.6, p.z)));   // nunca prende o jogador dentro da máquina X.sfx.explosion(); X.fx.shake(.6); X.fx.sparks(V(0, 2, 141), 0xffa040, 60, 8, .9);
  applyWorld(X); X.say('ÍRIS-9', 'Ela atravessou o entulho e travou. Os tanques de pressão estão expostos no topo — e o caminho para a represa abriu.');
}
const mission = {
  id: 'A2-M2', name: 'Mina Treze', era: 'VALE DE MERCÚRIO • 1888', act: 2, sectorNames: SECTORS, sectorAt, sealsRequired: 2, sealsAvailable: 3, requiredFlags: ['reservoir_drained'], enemiesTotal: 12, secretsTotal: 2, ambientTrack: 11, build,
  newState: () => ({ mine: newDrillState() }),
  outdoor: (p) => p.z < 20,
  startLoadout: () => ({ weapons: { martelo9: { have: true, mag: 15 }, trovao_duplo: { have: true, mag: 2 }, rompe_casco: { have: true, mag: 1 } }, ammo: { ammo9: 75, shells: 10, rockets: 2 }, current: 'martelo9', holster: false }),
  ecoLocked: () => false, afterReset(X) { X.unlockEco(); },
  apply(X) { lastSafe = V(0, .01, 2); hazardCd = 0; const f = X.S.flags; if (f.chase_started && !f.chase_done) { f.chase_started = false; X.S.mine.chaseZ = CHASE.z0; X.S.mine.chaseT = 0; } applyWorld(X); },
  intro(X) {
    X.say('ÍRIS-9', 'Mina Treze. O mapa de Klein mostra duas perfuratrizes temporais cavando em direção ao veio de mercúrio.');
    X.say('GAEL', 'Máquina do futuro cavando no passado. Clássico. Alguém aqui já ouviu falar de licença ambiental?');
    X.say('ÍRIS-9', 'Desarme as perfuratrizes e drene o reservatório até o elevador principal. Cuidado com os vagões: eles não freiam.');
  },
  onResume(X) { const f = X.S.flags; if (f.reservoir_drained && X.P.body.pos.z > 170 && !X.S.groupsDone.includes('eg63')) X.startGroup('eg63'); },
  objective(X) {
    const f = X.S.flags, S = X.S;
    if (!f.chase_started && !f.chase_done) return f.drill_A ? 'Siga pelo túnel norte em direção à represa' : tanksVented(S, 'A') ? 'Desarme a perfuratriz A no painel lateral' : 'Cruzamento dos trilhos: estoure os 2 tanques da perfuratriz A';
    if (!f.chase_done) return 'CORRA! A perfuratriz vem atrás de você — use o abrigo lateral';
    if (!f.drill_B && !tanksVented(S, 'B')) return 'Perfuratriz B travada: estoure os tanques no topo (ou siga para a represa)';
    if (!f.drill_B) return 'Desarme a perfuratriz B no painel lateral';
    if (!f.reservoir_drained) return 'Salão da represa: abra a comporta na passarela leste';
    if (S.seals.length < 2) return 'Falta um Selo: procure a galeria mineral (passagem baixa a oeste)';
    return 'Desça o canal drenado e atravesse a Fenda no elevador principal';
  },
  waypoint(X) {
    const { S, L } = X, f = S.flags;
    if (!f.chase_started && !f.chase_done) { if (!f.drill_A) return tanksVented(S, 'A') ? L.interact.panelA : V(-11.5, 3.8, 83); return V(0, 1, 120); }
    if (!f.chase_done) return V(6.2, 1, 121);
    if (!f.drill_B && f.chase_done && !f.reservoir_drained) return tanksVented(S, 'B') ? L.interact.panelB : V(0, 4, 135.2);
    if (!f.reservoir_drained) return L.interact.lever;
    if (S.seals.length < 2) return L.interact.ore;
    return L.pts.gate;
  },
  gateHint(X) { return !X.S.flags.reservoir_drained ? 'O canal está inundado: abra a comporta de drenagem.' : 'Confirme dois Selos: perfuratrizes, represa ou galeria mineral.'; },
  exitLine: 'Elevador energizado. A Companhia transporta algo pelos trilhos: o próximo alvo é o trem.',
  deathTips: ['A luz vermelha do cruzamento acende antes do vagão. Atravesse quando ela apagar.', 'Na perseguição, corra para o ABRIGO lateral do túnel ou cole na parede.', 'O Bruto Réptil bloqueia de frente: pernas, costas e explosivos. Quando a minigun gira, procure cobertura.', 'Tanques de pressão das perfuratrizes estouram com tiros; a explosão de barril também ajuda.'],
  interactables(X, add) {
    const { S, L } = X, f = S.flags;
    if (!f.drill_A) add(L.interact.panelA, tanksVented(S, 'A') ? 'Desarmar a perfuratriz A' : 'Painel travado (tanques sob pressão)', () => {
      if (!disarm(S, 'A')) { X.toast('Estoure os dois tanques de pressão no topo da máquina primeiro'); X.sfx.empty(); return; }
      X.sfx.power(); applyWorld(X); X.toast('PERFURATRIZ A DESARMADA', 2);
      if (f.drills_disarmed) X.grantSeal('seal_a2m2_drills', L.interact.panelA); else X.say('ÍRIS-9', 'Uma desligada. A segunda está em movimento, em algum lugar ao norte. Sinto vibrações no túnel.');
    });
    if (f.chase_done && !f.drill_B) add(L.interact.panelB, tanksVented(S, 'B') ? 'Desarmar a perfuratriz B' : 'Painel da perfuratriz B (tanques sob pressão)', () => {
      if (!disarm(S, 'B')) { X.toast('Estoure os dois tanques no topo da perfuratriz B'); X.sfx.empty(); return; }
      X.sfx.power(); X.toast('PERFURATRIZ B DESARMADA', 2); L.drillBLight.material = L.M.lampOn;
      if (f.drills_disarmed) { X.grantSeal('seal_a2m2_drills', L.interact.panelB); X.say('GAEL', 'Duas furadeiras do futuro desligadas. Me sinto o eletricista mais caro de 1888.'); }
      else X.say('ÍRIS-9', 'A perfuratriz A, no cruzamento, ainda funciona. Desligá-la completa este Selo.');
    });
    if (!f.reservoir_drained) add(L.interact.lever, 'Abrir a comporta de drenagem', () => {
      drain(S); X.sfx.water(); X.sfx.door(); X.fx.shake(.15); X.grantSeal('seal_a2m2_reservoir', L.interact.lever); L.flood.col.enabled = false;
      L.lever.rotation.z = -.6; L.lever.material = L.M.lampOn; X.say('ÍRIS-9', 'Reservatório drenando. O canal sob a represa leva ao elevador principal.');
    });
    if (!S.seals.includes('seal_a2m2_ore')) add(L.interact.ore, 'Recolher o núcleo de minério luminescente', () => {
      L.oreSeal.visible = false; S.pecas += 60; if (!S.secrets.includes('mineral_cave')) S.secrets.push('mineral_cave');
      X.grantSeal('seal_a2m2_ore', L.interact.ore); X.toast('+60 PEÇAS CRONAIS • MINÉRIO PARA MELHORIAS', 2.2);
      X.say('GAEL', 'Pedra que brilha e vale dinheiro. Agora entendi por que todo mundo nesse século tem cara de mineiro.');
    });
    if (!f.log_read) add(L.interact.log, 'Ler o diário do capataz', () => {
      f.log_read = true; if (!S.secrets.includes('foreman_log')) S.secrets.push('foreman_log');
      X.openDoc({ k: 'MINA TREZE • DIÁRIO DO CAPATAZ', t: 'Turno da noite', b: 'Os homens da Companhia trouxeram duas máquinas que não fazem barulho de vapor. Fazem barulho de... música.\n\nTreze mineiros desceram ontem. Doze voltaram. O livro de ponto agora diz que sempre foram doze.\n\nEu escrevi o nome do décimo terceiro aqui, para não esquecer: Benedito Sá.' });
    });
  },
  onShootCollider(X, c, dmg) {
    if (!c.drillTank) return 0;
    const { S, L } = X, id = c.drillTank;
    if (hitTank(S, id, dmg)) { const t = L.tanks[id]; X.fx.sparks(t.mesh.position, 0xffc040, 30, 6, .7); X.fx.flash(t.mesh.position, 1.2, .25, 0xffa040); X.sfx.explosion(); X.fx.shake(.12); applyWorld(X); X.toast(tanksVented(S, id[0]) ? 'TANQUES VENTILADOS • PAINEL LIBERADO' : 'TANQUE ESTOURADO • FALTA 1', 1.6); }
    else { X.sfx.hit(); X.fx.sparks(L.tanks[id].mesh.position, 0xffe080, 4, 2, .2); }
    return 1;
  },
  tick(X, dt) {
    const { S, L, P } = X, f = S.flags, p = P.body.pos;
    hazardCd = Math.max(0, hazardCd - dt);
    if (p.y < -8) { X.fallRecover(lastSafe); return; }
    if (P.body.grounded && p.y > -4) lastSafe = p.clone();
    if (S.checkpointId === 'cp00' && p.z > 61 && S.groupsDone.includes('eg60')) X.saveCheckpoint('cp01');
    if (f.chase_done && p.z > 144 && !['cp02', 'cp03'].includes(S.checkpointId)) X.saveCheckpoint('cp02');
    if (f.reservoir_drained && p.z > 164 && S.checkpointId !== 'cp03') X.saveCheckpoint('cp03');
    // vagões
    if (!hazardCd && cartHits(S.stats.time, p)) { hazardCd = 1.2; X.damagePlayer(22, V(cartAt(S.stats.time).x, 1, CART.z)); P.body.vel.z = (p.z < CART.z ? -1 : 1) * 9; P.body.vel.y = 5; X.sfx.crash(); X.toast('VAGÃO! • observe a luz vermelha', 1.6); }
    // perseguição
    if (!f.chase_started && !f.chase_done && p.z > 95 && p.z < 130) {
      f.chase_started = true; S.mine.chaseT = 0; S.mine.chaseZ = CHASE.z0; L.drillB.visible = true; X.sfx.drill(); X.fx.shake(.5); X.fx.flash(V(0, 2, CHASE.z0 + 2), 3, .4, 0xffa040);
      X.say('ÍRIS-9', 'Atrás de você! A segunda perfuratriz rompeu a rocha! CORRA para o abrigo!', 2.6);
    }
    if (f.chase_started && !f.chase_done) {
      if (stepChase(S, dt)) crashDrill(X);
      else if (!hazardCd && chaseHits(S, p)) { hazardCd = 1.0; X.damagePlayer(30, V(0, 1.5, S.mine.chaseZ)); X.sfx.drill(); const nz = S.mine.chaseZ + CHASE.front + .7; if (nz < 139.5) p.z = nz; P.body.vel.set(0, 4, 6); X.fx.shake(.35); }
      if (Math.random() < dt * 4) X.sfx.drill();
    }
    if (!f.reservoir_drained && p.z > 165 && p.z < 168.1 && Math.abs(p.x) < 4 && !hazardCd) { hazardCd = 3; X.toast('Canal inundado • abra a comporta de drenagem', 2); }
  },
  onGroupDone() {},
  frame(X, dt, t, sim) {
    const { S, L } = X, f = S.flags, c = cartAt(S.stats.time);
    L.cart.visible = c.x !== null; if (c.x !== null) L.cart.position.x = c.x;
    for (const w of L.warn) w.material = c.warn && Math.sin(t * 12) > 0 ? L.M.lampRed : L.M.lampOff;
    if (!f.drill_A) L.drillA.rotation.x += (sim ? dt : 0) * 8;
    L.drillB.position.z = S.mine.chaseZ; if (f.chase_started && !f.chase_done) { L.bit.rotation.z += dt * 14; L.drillB.position.y = Math.sin(t * 30) * .04; L.chaseLight.pos.z = S.mine.chaseZ + 4.5; L.chaseLight.intensity = 30; } else L.chaseLight.intensity = 0;
    if (f.reservoir_drained && L.water.position.y > -3.9) L.water.position.y = Math.max(-3.9, L.water.position.y - dt * .9);
    for (const t2 of Object.values(L.tanks)) if (t2.glow.visible) t2.glow.material = Math.sin(t * 5) > 0 ? L.M.neonAmber : L.M.hazard;
    if (L.oreSeal.visible) { L.oreSeal.rotation.y += dt * 1.5; L.oreSeal.position.y = 1.3 + Math.sin(t * 2) * .08; }
  },
  menuCam(t, cam) { cam.position.set(Math.sin(t * .12) * 8, 4.5, 64 + Math.cos(t * .1) * 3); cam.lookAt(-6, 2, 82); return V(0, 3, 75); },
  next: 'A2-M3',
  resultsText: (X) => `${X.S.pecas} Peças Cronais. ${X.S.flags.drills_disarmed ? 'As duas perfuratrizes' : 'Parte das perfuratrizes'} desligadas e a represa drenada. Próxima missão: A2-M3 — O Trem de Ferro.`,
  onComplete(X, campaign) { campaign.flags.mina13_complete = true; },
};
export default mission;
