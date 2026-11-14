// A2-M1 — POEIRA ALTA. Vale de Mercúrio, 1888 (GDD §8 Ato II, §8.2, §29, §35).
// Cidade de madeira: Saloon Rosa de Ferro (Irene Vidal), relojoaria com cofre, estábulos, telhados,
// duelo sob o relógio da praça e Fenda de Saída na torre do relógio.
import * as THREE from 'three';
import { createBuilder, canvasTex, makeSky, makeDust, lantern } from '../world.js';
import { PIANO_KEYS, pressPianoKey, knowsClockCode, setMasterClock, openSafe, startDuel, stepDuel } from './poeira-state.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SECTORS = { entry: 'Entrada do Vale', street: 'Rua Principal', saloon: 'Saloon Rosa de Ferro', watch: 'Relojoaria Klein', stable: 'Estábulos', plaza: 'Praça do Relógio', tower: 'Torre do Relógio' };
export const POEIRA_ROUTE = { spawn: [0, .01, 2], irene: [-18.4, .31, 52], notebook: [17, .31, 65.2], clock: [21.2, .31, 70], duel: [0, .01, 142], gate: [0, 3.61, 170.2] };
function sectorAt(p) {
  if (p.z < 14) return 'entry';
  if (p.x < -10.2 && p.z > 37.7 && p.z < 66.3) return 'saloon';
  if (p.x > 10.2 && p.z > 59.7 && p.z < 80.3) return 'watch';
  if (p.x < -10.2 && p.z > 87.7 && p.z < 110.3) return 'stable';
  if (p.z > 156 && p.y > 3) return 'tower';
  if (p.z >= 134) return 'plaza';
  return 'street';
}
// Placas pintadas à mão (fonte serifada do sistema; nada de identidade de outra obra).
function boardTex(text, w = 512, h = 128, bg = '#5a3a20', ink = '#f3e2b6') {
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y, w, 2); }
    c.strokeStyle = '#2a170a'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.font = `bold ${Math.floor(h * 0.42)}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(text, w / 2 + 3, h / 2 + 4); c.fillStyle = ink; c.fillText(text, w / 2, h / 2);
  }, false);
}
function clockTex() {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = '#efe4c4'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill();
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#2a1d10'; c.font = 'bold 26px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    R.forEach((r, i) => { const a = i / 12 * Math.PI * 2; c.fillText(r, 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); });
  }, false);
}
function build(scene, X) {
  const L = createBuilder(scene), { B, D, M, root } = L;
  L.fogColor = 0xc08658; L.fogDensity = 0.0062; L.hemi = 1.85; L.moon = 1.55;
  L.sunColor = 0xffc890; L.hemiSky = 0xffd9b0; L.hemiGround = 0x6a4a30;
  makeSky(L, 0x23305a, 0xe98a4c, 0xff5a1e); makeDust(L, 380, 0xe8c890, 0.07, 0.12);
  const sign = (text, x, y, z, w, ry, bg, ink) => { const m = L.mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: boardTex(text, 512, 128, bg, ink), side: THREE.DoubleSide }), x, y, z); m.rotation.y = ry; return m; };
  const cyl = (mat, x, y, z, r, h, seg = 10) => L.mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z);
  // ---------------- terreno e limites ----------------
  B(M.sand, -34, 34, -1, 0, -10, 194, { tile: 7 });
  const rut = new THREE.MeshLambertMaterial({ color: 0x7a5a3a, transparent: true, opacity: .45, depthWrite: false });   // sulcos de carroça discretos
  for (let z = 16; z < 120; z += 9) B(rut, -3.0 + Math.sin(z) * .4, -2.4 + Math.sin(z) * .4, 0, .012, z, z + 8, { noCol: true });
  for (let z = 16; z < 120; z += 9) B(rut, 2.4 + Math.cos(z) * .4, 3.0 + Math.cos(z) * .4, 0, .012, z + 3, z + 10, { noCol: true });
  B(M.rock, -40, -34, 0, 14, -12, 196); B(M.rock, 34, 40, 0, 14, -12, 196); B(M.rock, -40, 40, 0, 14, -12, -10); B(M.rock, -40, 40, 0, 24, 190, 196);
  for (const [x, z, w, h] of [[-26, -4, 8, 9], [24, 2, 10, 7], [-20, 8, 6, 4], [20, 10, 5, 3]]) B(M.rock, x - w / 2, x + w / 2, 0, h, z - w / 2, z + w / 2);
  // mesetas distantes (sem colisão) e o sol baixo
  for (const [x, z, w, h, d] of [[-90, 60, 50, 38, 30], [95, 120, 60, 30, 40], [-60, 260, 80, 46, 30], [70, 250, 50, 34, 30], [0, 300, 120, 26, 30]]) B(M.rock, x - w / 2, x + w / 2, -1, h, z - d / 2, z + d / 2, { noCol: true, tile: 12 });
  const sun = L.mesh(new THREE.CircleGeometry(26, 32), new THREE.MeshBasicMaterial({ color: 0xffd28a, fog: false }), -260, 34, 140); sun.lookAt(0, 0, 100);
  // ---------------- entrada: carroça tombada e arco ----------------
  L.pts.spawn = { x: 0, y: 0.01, z: 2, yaw: 0 }; L.pts.portal = V(0, 2.2, -2.5);
  for (const s of [-1, 1]) B(M.boards, s * 6 - .3, s * 6 + .3, 0, 6.2, 13.7, 14.3);
  B(M.planks, -6.6, 6.6, 5.2, 6.3, 13.75, 14.25, { noCol: true });
  sign('POEIRA ALTA • 1888', 0, 5.75, 13.7, 9, Math.PI);
  B(M.planks, -11, -6.5, .5, 1.6, 6, 8.5); cyl(M.boards, -9.8, .6, 5.85, .6, .16).rotation.x = Math.PI / 2; cyl(M.boards, -7.6, .6, 5.85, .6, .16).rotation.x = Math.PI / 2;
  B(M.hay, 7, 8.4, 0, .9, 4, 5.6); B(M.hay, 7.2, 8.2, .9, 1.7, 4.3, 5.3);
  // ---------------- calçadas, toldos e postes ----------------
  for (const s of [-1, 1]) {
    B(M.planks, s < 0 ? -10.3 : 7, s < 0 ? -7 : 10.3, 0, .3, 16, 132, { tile: 3 });
    for (let z = 20; z < 132; z += 8) { if (s > 0 && z > 100 && z < 112) continue; B(M.boards, s * 7.15 - .1, s * 7.15 + .1, .3, 3.3, z - .1, z + .1); }
    for (const [z0, z1] of [[16, 34], [38, 66], [70, 84], [114, 132]]) { if (s > 0 && z0 === 114) continue; B(M.shingle, s < 0 ? -10.3 : 6.9, s < 0 ? -6.9 : 10.3, 3.3, 3.42, z0, z1, { noCol: true }); }
  }
  // fachadas: bloco sólido + falsa frente alta (estilo de cidade de fronteira)
  const shop = (side, z0, z1, h, front, label, bg, mat = M.planks) => {
    const x0 = side < 0 ? -24 : 10.3, x1 = side < 0 ? -10.3 : 24;
    B(mat, x0, x1, 0, h, z0, z1); B(M.boards, side < 0 ? -10.3 : 10.3, side < 0 ? -10.1 : 10.5, h, front, z0, z1, { noCol: true });
    B(M.shingle, x0, x1, h, h + .2, z0, z1, { noCol: true });
    if (label) sign(label, side * 10.05 + side * .5 * (side > 0 ? 0 : 0), h - .2 + (front - h) / 2 + .2, (z0 + z1) / 2, Math.min(9, (z1 - z0) - 1), side < 0 ? Math.PI / 2 : -Math.PI / 2, bg);
    for (let z = z0 + 2; z < z1 - 1.5; z += 4) B(M.glass, side < 0 ? -10.32 : 10.28, side < 0 ? -10.28 : 10.32, 1.1, 2.6, z, z + 1.6, { noCol: true });
  };
  shop(-1, 16, 34, 5.5, 7.6, 'ARMAZÉM', '#4a3020');
  shop(-1, 70, 84, 5, 7, 'BARBEARIA', '#3a2a40');
  shop(-1, 114, 132, 6.5, 8.6, 'PENSÃO DA VIÚVA', '#304030');
  shop(1, 16, 34, 5.2, 7, 'XERIFE', '#40281a', M.adobe);
  shop(1, 38, 56, 5, 6.2, 'TELÉGRAFO', '#203040');
  shop(1, 84, 104, 7.5, 9, 'CAPELA', '#e8dcc0', M.adobe);
  shop(1, 108, 132, 7.2, 8.4, 'HOTEL MERCÚRIO', '#5a1e20');
  B(M.adobe, 17, 20, 7.5, 12, 92, 95, { noCol: true }); B(M.shingle, 16.6, 20.4, 12, 12.4, 91.6, 95.4, { noCol: true }); B(M.boards, 18.45, 18.55, 12.4, 14, 93.45, 93.55, { noCol: true }); B(M.boards, 17.9, 19.1, 13.4, 13.5, 93.45, 93.55, { noCol: true });
  // varanda do hotel (rota elevada) com escada a partir da calçada
  for (let i = 0; i < 9; i++) B(M.planks, 7, 10.3, 0, .3 + (i + 1) * .4, 101.2 + i * .98, 102.18 + i * .98, { tile: 1 });
  B(M.planks, 7, 10.3, 3.6, 3.9, 110.02, 130); B(M.rail, 7, 7.1, 3.9, 4.9, 110.02, 130, { invisible: true, col: { seeThrough: true } }); B(M.boards, 7, 7.12, 4.8, 4.92, 110.02, 130, { noCol: true });
  for (let z = 112; z < 130; z += 4) B(M.boards, 7.1, 7.3, .3, 3.6, z, z + .2);
  // cartaz de PROCURADO na porta do xerife
  sign('PROCURADO', 10.28, 2.6, 25, 1.6, -Math.PI / 2, '#d8c79a', '#3a1a0a');
  const wanted = L.mesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshBasicMaterial({ map: canvasTex(128, 160, (c) => { c.fillStyle = '#d8c79a'; c.fillRect(0, 0, 128, 160); c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(64, 62, 30, 0, 7); c.fill(); c.fillRect(28, 92, 72, 40); c.fillStyle = '#c03020'; c.fillRect(70, 52, 22, 4); c.font = 'bold 16px Georgia'; c.textAlign = 'center'; c.fillStyle = '#2a1a10'; c.fillText('G. ROCHA', 64, 150); }, false) }), 10.28, 1.55, 25);
  wanted.rotation.y = -Math.PI / 2; L.interact.wanted = V(9.2, 1.3, 25);
  // ---------------- SALOON ROSA DE FERRO ----------------
  B(M.planks, -24, -10.3, 0, .3, 38, 66, { tile: 3 });
  B(M.boards, -10.3, -10, 0, 5, 37.7, 50); B(M.boards, -10.3, -10, 0, 5, 54, 66.3); B(M.boards, -10.3, -10, 3, 5, 50, 54);
  B(M.boards, -10.3, -10.1, 5, 8.6, 37.7, 66.3, { noCol: true });
  B(M.boards, -24.3, -24, 0, 5, 37.7, 66.3); B(M.boards, -24.3, -10, 0, 5, 37.7, 38); B(M.boards, -24.3, -10, 0, 5, 66, 66.3);
  B(M.shingle, -24.3, -10, 5, 5.3, 37.7, 66.3);
  sign('SALOON ROSA DE FERRO', -9.95, 6.8, 52, 11, Math.PI / 2, '#5a1420', '#ffd7a0');
  for (const z of [41.5, 59]) B(M.glass, -10.32, -10.28, 1.1, 2.7, z, z + 3, { noCol: true });
  for (const z of [50.15, 52.05]) B(M.planks, -10.25, -10.12, 1.0, 2.4, z, z + 1.8, { noCol: true });   // portas de vaivém
  // palco, cortinas e ribalta
  B(M.planks, -24, -19.5, .3, 1.0, 45, 59); B(M.planks, -19.5, -18.8, .3, .65, 49.5, 54.5);
  B(M.cloth, -23.98, -23.85, 1.0, 4.9, 45, 59, { noCol: true }); for (const z of [45, 58.6]) B(M.cloth, -23.8, -21.5, 1.0, 4.9, z, z + .4, { noCol: true });
  B(M.cloth, -23.8, -19.5, 4.4, 4.95, 45, 59, { noCol: true });
  for (let z = 45.6; z < 59; z += 1.3) B(M.lantern, -19.65, -19.5, .95, 1.05, z, z + .3, { noCol: true });
  L.trap = L.mesh(new THREE.BoxGeometry(.12, .55, 1.4), M.boards, -19.47, .66, 46.8);
  // bar e prateleiras
  B(M.bar, -22, -13, .3, 1.45, 62, 63.2); B(M.wood, -22.1, -12.9, 1.45, 1.55, 61.9, 63.3, { noCol: true });
  B(M.bar, -23.8, -14, .3, 3.3, 65.4, 66); for (let x = -23.4; x < -14.4; x += .45) for (const y of [1.6, 2.4]) B(x % .9 < .45 ? M.neonAmber : M.glass, x, x + .14, y, y + .42, 65.25, 65.39, { noCol: true });
  const mirror = L.mesh(new THREE.PlaneGeometry(4, 1.2), M.mirror, -18.5, 3.0, 65.38); mirror.rotation.y = Math.PI;
  // piano de armário: quatro teclas marcadas (puzzle opcional das quatro notas)
  B(M.bar, -22, -18.4, .3, 1.6, 38, 39.3); B(M.white, -21.9, -18.5, 1.12, 1.18, 39.3, 39.75, { noCol: true }); B(M.bar, -22, -18.4, 1.6, 2.3, 38, 38.6, { noCol: true });
  L.keys = []; L.keyPos = [];
  for (let i = 0; i < 4; i++) { const x = -21.45 + i * .95; L.keys.push(L.mesh(new THREE.BoxGeometry(.5, .05, .4), M.neonAmber, x, 1.2, 39.55)); L.keyPos.push(V(x, 1.2, 40.0)); }
  const keyLabel = L.mesh(new THREE.PlaneGeometry(3.4, .42), new THREE.MeshBasicMaterial({ map: canvasTex(512, 64, (c) => { c.fillStyle = '#1a120a'; c.fillRect(0, 0, 512, 64); c.fillStyle = '#ffd890'; c.font = 'bold 30px Georgia'; c.textAlign = 'center'; PIANO_KEYS.forEach((k, i) => c.fillText(k.toUpperCase(), 64 + i * 128, 42)); }, false) }), -20, 1.9, 38.62);
  keyLabel.rotation.y = 0;
  const poster = L.mesh(new THREE.PlaneGeometry(1.4, 1.9), new THREE.MeshBasicMaterial({ map: canvasTex(140, 190, (c) => { c.fillStyle = '#e8d3a0'; c.fillRect(0, 0, 140, 190); c.fillStyle = '#5a1420'; c.font = 'bold 18px Georgia'; c.textAlign = 'center'; c.fillText('HOJE À NOITE', 70, 28); c.font = 'bold 22px Georgia'; c.fillText('IRENE', 70, 58); c.fillText('VIDAL', 70, 82); c.fillStyle = '#2a1a10'; c.font = 'italic 13px Georgia'; ['O sino chama,', 'o rio corre,', 'a lua escuta,', 'o ferro fecha.'].forEach((l, i) => c.fillText(l, 70, 112 + i * 18)); }, false) }), -15.6, 2.1, 38.05);
  L.interact.poster = V(-15.6, 1.4, 38.9);
  // mesas redondas com colisor simples
  for (const [x, z] of [[-14.5, 44], [-15, 60], [-17.6, 57.6]]) { B(M.bar, x - .55, x + .55, .3, 1.1, z - .55, z + .55, { invisible: true }); cyl(M.bar, x, 1.06, z, .75, .08, 14); cyl(M.wood, x, .68, z, .09, .76, 6); for (const a of [0, 2.1, 4.2]) B(M.wood, x + Math.cos(a) * 1.05 - .22, x + Math.cos(a) * 1.05 + .22, .3, .75, z + Math.sin(a) * 1.05 - .22, z + Math.sin(a) * 1.05 + .22, { noCol: true }); }
  L.chips = L.mesh(new THREE.CylinderGeometry(.09, .09, .06, 10), M.neonCyan, -15.2, 1.13, 60.1);   // ficha com logotipo de 2275 (piada do GDD §29.1)
  L.light(-16, 4.3, 45, 0xffb060, 22, 12); L.light(-16, 4.3, 59, 0xffb060, 22, 12); L.light(-21.5, 4.3, 52, 0xffd8a0, 26, 10);
  L.interact.irene = V(-19.6, 1.6, 52); L.interact.ireneBar = V(-16, 1.3, 61.8); L.interact.trap = V(-19, .8, 46.8);
  // ---------------- RELOJOARIA KLEIN ----------------
  B(M.planks, 10.3, 24, 0, .3, 60, 80, { tile: 3 });
  B(M.boards, 10, 10.3, 0, 5, 59.7, 68); B(M.boards, 10, 10.3, 0, 5, 72, 80.3); B(M.boards, 10, 10.3, 3, 5, 68, 72);
  B(M.boards, 10.1, 10.3, 5, 8, 59.7, 80.3, { noCol: true });
  B(M.boards, 24, 24.3, 0, 5, 59.7, 80.3); B(M.boards, 10, 24.3, 0, 5, 59.7, 60); B(M.boards, 10, 24.3, 0, 5, 80, 80.3);
  B(M.shingle, 10, 24.3, 5, 5.3, 59.7, 80.3);
  sign('RELOJOARIA KLEIN', 9.95, 6.5, 70, 9, -Math.PI / 2, '#20304a', '#f0e0a8');
  for (const z of [62, 75]) B(M.glass, 10.28, 10.32, 1.1, 2.7, z, z + 3, { noCol: true });
  B(M.bar, 14, 20, .3, 1.3, 62.6, 63.6); B(M.glass, 14.1, 19.9, 1.3, 1.9, 62.7, 63.5, { noCol: true });
  B(M.wood, 16.6, 17.4, 1.3, 1.36, 63.6, 64.2, { noCol: true });
  const ct = clockTex(), clockMat = new THREE.MeshBasicMaterial({ map: ct });
  for (const [x, z, ry] of [[13, 79.94, Math.PI], [16.5, 79.94, Math.PI], [20, 79.94, Math.PI], [14, 60.06, 0], [21, 60.06, 0]]) { const m = L.mesh(new THREE.CircleGeometry(.42, 20), clockMat, x, 2.6, z); m.rotation.y = ry; }
  B(M.iron, 23.6, 24, .3, 1.7, 69.1, 70.9); L.safeDoor = L.mesh(new THREE.BoxGeometry(.06, 1.2, 1.5), M.brass, 23.57, 1.0, 70);
  L.master = D(M.bar, 22.4, 23.6, .3, 3.5, 69, 71); L.masterBase = { min2: 69, max2: 71 };
  const face = new THREE.Mesh(new THREE.CircleGeometry(.48, 20), clockMat); face.position.set(22.38, 2.7, 70); face.rotation.y = -Math.PI / 2; L.master.mesh.add(face);
  const handH = new THREE.Mesh(new THREE.BoxGeometry(.02, .26, .04), M.dark); handH.position.set(22.36, 2.7 + .1, 70 - .06); handH.rotation.x = -.9; L.master.mesh.add(handH);
  const handM = new THREE.Mesh(new THREE.BoxGeometry(.02, .4, .03), M.dark); handM.position.set(22.35, 2.7 + .14, 70 + .12); handM.rotation.x = 1.0; L.master.mesh.add(handM);
  L.pendulum = new THREE.Mesh(new THREE.BoxGeometry(.04, .9, .04), M.brass); L.pendulum.position.set(22.36, 1.3, 70); L.master.mesh.add(L.pendulum);
  L.interact.notebook = V(17, 1.45, 64.4); L.interact.clock = V(22.1, 1.3, 70); L.interact.safe = V(22.9, 1.0, 70.1);
  L.light(17, 4.3, 70, 0xffc88a, 22, 12);
  // ---------------- ESTÁBULOS (rota alternativa: celeiro com o terceiro selo) ----------------
  B(M.boards, -10.3, -10, 0, 7, 87.7, 92); B(M.boards, -10.3, -10, 0, 7, 106, 110.3); B(M.boards, -10.3, -10, 4.2, 7, 92, 106);
  B(M.boards, -26.3, -26, 0, 7, 87.7, 110.3); B(M.boards, -26.3, -10, 0, 7, 87.7, 88); B(M.boards, -26.3, -10, 0, 7, 110, 110.3);
  B(M.shingle, -26.3, -10, 7, 7.3, 87.7, 110.3);
  sign('ESTÁBULOS', -9.95, 5.6, 99, 6, Math.PI / 2, '#5a2a14');
  B(M.planks, -26, -18, 3.2, 3.5, 88, 110); B(M.rail, -18, -17.9, 3.5, 4.5, 88, 106.4, { invisible: true, col: { seeThrough: true } }); B(M.boards, -18, -17.88, 4.4, 4.52, 88, 106.4, { noCol: true });
  for (let z = 90; z < 106; z += 4) B(M.boards, -18.1, -17.9, 0, 3.2, z, z + .2);
  for (let i = 0; i < 8; i++) B(i % 2 ? M.boards : M.hay, -11 - (i + 1) * .875, -11 - i * .875, 0, (i + 1) * .4375, 106.5, 109.5, { tile: 1 });
  for (const z of [93, 98, 103]) B(M.boards, -26, -20.5, 0, 1.5, z, z + .15);
  const horse = new THREE.MeshLambertMaterial({ color: 0x5a3820 }), mane = new THREE.MeshLambertMaterial({ color: 0x1a120c });
  L.horses = [];
  for (const z of [95.6, 100.6]) {
    const g = new THREE.Group(); g.position.set(-23, 0, z); root.add(g);
    const add = (geo, mat, x, y, zz, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, zz); m.rotation.z = rz; g.add(m); return m; };
    add(new THREE.BoxGeometry(1.9, .75, .7), horse, 0, 1.35, 0);
    for (const [x, zz] of [[-.7, -.22], [-.7, .22], [.7, -.22], [.7, .22]]) add(new THREE.BoxGeometry(.18, 1.0, .18), horse, x, .5, zz);
    const neck = add(new THREE.BoxGeometry(.35, .9, .4), horse, 1.05, 1.85, 0, -.55); add(new THREE.BoxGeometry(.6, .32, .32), horse, 1.42, 2.2, 0); add(new THREE.BoxGeometry(.5, .12, .08), mane, .9, 2.1, 0, -.55);
    add(new THREE.BoxGeometry(.12, .7, .1), mane, -1.0, 1.25, 0, .4); L.horses.push({ g, neck });
    B(M.boards, -24, -22, 0, 1.6, z - .4, z + .4, { invisible: true });
  }
  B(M.hay, -25.8, -24.4, 0, .8, 104, 109.5); B(M.hay, -25.8, -23.6, 3.5, 4.3, 104.5, 109.5, { noCol: true });
  B(M.iron, -25, -23.8, 3.5, 4.1, 98.4, 99.6); L.lockbox = L.mesh(new THREE.BoxGeometry(1.24, .1, 1.24), M.brass, -24.4, 4.14, 99);
  B(M.wood, -25.4, -24.4, 3.5, 4.0, 91.5, 92.5); L.plate = L.mesh(new THREE.BoxGeometry(.5, .04, .4), M.glass, -24.9, 4.03, 92);
  L.interact.lockbox = V(-23.2, 4.3, 99); L.interact.plate = V(-23.6, 4.3, 92);
  lantern(L, -14, 3.0, 96, 0xffb35a, 16, 11); lantern(L, -22, 5.5, 100, 0xffb35a, 14, 10);
  // ---------------- PRAÇA DO RELÓGIO ----------------
  B(M.adobe, -34, -22, 0, 7, 136, 190); B(M.adobe, 22, 34, 0, 7, 136, 190);
  sign('BANCO DO VALE', -21.95, 5.2, 162, 7, Math.PI / 2, '#2a3a2a'); sign('ESCRITÓRIO DA CIA. MERCÚRIO', 21.95, 5.2, 162, 9, -Math.PI / 2, '#3a1010', '#ffcc60');
  B(M.adobe, -13.2, -10.8, 0, 1.0, 148.8, 151.2); for (const [x, z] of [[-13.1, 148.9], [-10.9, 151.1]]) B(M.boards, x - .1, x + .1, 1, 3, z - .1, z + .1, { noCol: true }); B(M.shingle, -13.6, -10.4, 3, 3.2, 148.4, 151.6, { noCol: true });
  B(M.boards, 10.5, 13.5, 0, .8, 145.4, 146.6); B(M.water, 10.6, 13.4, .7, .74, 145.5, 146.5, { noCol: true });
  for (const [x, z, w, d] of [[13, 160, 3, 6], [-15, 166, 6, 3]]) { B(M.planks, x - w / 2, x + w / 2, .6, 1.5, z - d / 2, z + d / 2); B(M.planks, x - w / 2, x + w / 2, 0, .6, z - d / 2, z + d / 2, { invisible: true }); }
  for (const [x, z, a] of [[11.4, 158, 0], [14.6, 158, 0], [11.4, 162, 0], [14.6, 162, 0]]) { const w = cyl(M.boards, x, .6, z, .6, .12, 12); w.rotation.z = Math.PI / 2; }
  for (const [x, z] of [[-17.5, 165], [-17.5, 167], [-12.5, 165], [-12.5, 167]]) { const w = cyl(M.boards, x, .6, z, .6, .12, 12); w.rotation.x = Math.PI / 2; }
  for (const z of [140, 154]) B(M.boards, -20, -16, .9, 1.0, z, z + .12, { noCol: true });
  L.duelRing = [L.mesh(new THREE.RingGeometry(.9, 1.05, 32), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: .6, side: THREE.DoubleSide }), 0, .03, 142), L.mesh(new THREE.RingGeometry(.9, 1.05, 32), new THREE.MeshBasicMaterial({ color: 0xff3048, transparent: true, opacity: .6, side: THREE.DoubleSide }), 0, .03, 158)];
  for (const r of L.duelRing) r.rotation.x = -Math.PI / 2;
  // torre do relógio, varanda, escada (com portão) e campanário
  B(M.adobe, -4, 4, 0, 18, 172, 180); B(M.planks, -4.4, 4.4, 18, 18.3, 171.6, 180.4);
  for (const [x, z] of [[-4, 172], [4, 172], [-4, 180], [4, 180]]) B(M.boards, x - .2, x + .2, 18.3, 21.5, z - .2, z + .2, { noCol: true });
  const roofCone = L.mesh(new THREE.ConeGeometry(6.2, 3.2, 4), M.shingle, 0, 23.1, 176); roofCone.rotation.y = Math.PI / 4;
  L.bell = L.mesh(new THREE.CylinderGeometry(.35, 1.0, 1.5, 14, 1, true), M.brass, 0, 19.6, 176);
  const tf = L.mesh(new THREE.CircleGeometry(2.2, 28), clockMat, 0, 12, 171.96); tf.rotation.y = Math.PI;
  L.towerHands = [L.mesh(new THREE.BoxGeometry(.12, 1.25, .05), M.dark, 0, 12, 171.9), L.mesh(new THREE.BoxGeometry(.08, 1.85, .05), M.dark, 0, 12, 171.88)];
  B(M.planks, -6, 7, 3.3, 3.6, 168.5, 172);
  for (const [x0, x1, z0, z1] of [[-6, 4.5, 168.5, 168.62], [-6, -5.88, 168.5, 172], [7, 7.12, 168.5, 172]]) { B(M.rail, x0, x1, 3.6, 4.6, z0, z1, { invisible: true, col: { seeThrough: true } }); B(M.boards, x0, x1, 4.5, 4.62, z0, z1, { noCol: true }); for (let k = 0; k <= 1; k += 1 / Math.max(1, Math.round(Math.max(x1 - x0, z1 - z0) / 1.5))) B(M.boards, x0 + (x1 - x0) * k - .05, x0 + (x1 - x0) * k + .05, 3.6, 4.5, z0 + (z1 - z0) * k - .05, z0 + (z1 - z0) * k + .05, { noCol: true }); }
  for (let i = 0; i < 9; i++) B(M.planks, 4.5, 7, 0, (i + 1) * .4, 157.7 + i * 1.2, 158.9 + i * 1.2, { tile: 1 });
  B(M.rail, 4.35, 4.5, 0, 5, 157.2, 168.5, { invisible: true }); B(M.rail, 7, 7.15, 0, 5, 157.2, 168.5, { invisible: true });
  for (const x of [4.42, 7.08]) for (let i = 0; i < 9; i++) B(M.boards, x - .05, x + .05, (i + 1) * .4, (i + 1) * .4 + .95, 158 + i * 1.2, 158.12 + i * 1.2, { noCol: true });
  L.doors.tower_gate = D(M.boards, 4.5, 7, 0, 3, 156.9, 157.2); L.doors.tower_gate.openH = 3.2;
  sign('TORRE • FECHADA', 5.75, 3.4, 156.85, 2.5, Math.PI, '#3a1a0a');
  L.pts.gate = V(0, 4.9, 170.2); L.pts.gateYaw = Math.PI / 2;
  for (const [x, z] of [[-20, 138], [20, 138], [-20, 186], [20, 186]]) lantern(L, x, 3.4, z, 0xffb35a, 18, 14);
  L.light(0, 8, 166, 0xffc88a, 24, 22); L.light(0, 5, 150, 0xffa060, 18, 18);
  for (const [x, z] of [[-8.6, 24], [8.6, 46], [-8.6, 76], [8.6, 96], [-8.6, 118]]) lantern(L, x, 3.0, z, 0xffb35a, 14, 10);
  // barris de pólvora (área de 5,5 m)
  for (const [id, x, z] of [['kegA', 4.5, 61], ['kegB', -4.5, 94], ['kegC', 9, 164], ['kegD', -9, 140], ['kegE', -5.5, 36]]) L.barrel('a2m1_' + id, x, 0, z);
  // ---------------- recursos ----------------
  const pickups = [['entry_ammo', 'ammo9', 30, 3, .35, 8], ['street_shell', 'shells', 6, -8.5, .65, 30], ['saloon_med', 'medkit', 35, -12, .65, 46], ['watch_armor', 'armor', 35, 20, .65, 77], ['loft_parts', 'pecas', 40, -24, 3.85, 106], ['loft_ammo', 'ammo9', 30, -21, 3.85, 90], ['plaza_med', 'medkit', 35, -12, .35, 144], ['plaza_shell', 'shells', 6, 12, .35, 151], ['hotel_armor', 'armor', 35, 8.5, 4.25, 124], ['rockets', 'rockets', 2, -8.5, .65, 126], ['chapel_ammo', 'ammo9', 30, 8.5, .65, 90]];
  for (const p of pickups) L.pickup('a2m1_' + p[0], ...p.slice(1));
  // ---------------- encontros (dentro dos pools: E01 4, E02 1, E04 Bruto Réptil 2, E05 3, E06 3, drone 1) ----------------
  L.groups = {
    eg50: { trigger: (p) => p.z > 24 && p.z < 70, units: [{ type: 'E06', x: 4, y: 0, z: 44, role: 'hold', path: [[4, 40]] }, { type: 'E06', x: -4, y: 0, z: 58, role: 'flank', path: [[-4, 54]] }, { type: 'E05', x: 2, y: 0, z: 66, role: 'hold', path: [[2, 62]] }, { type: 'E02', x: 12.5, y: 5, z: 47, role: 'sniper', alt: [[12.5, 43], [12.5, 52]] }] },
    eg51: { units: [{ type: 'E05', x: -3, y: 0, z: 47, role: 'hold', path: [[-8.5, 51], [-12, 51]] }, { type: 'E06', x: -3, y: 0, z: 57, role: 'flank', path: [[-8.5, 53], [-13, 55]] }, { type: 'E06', x: 4, y: 0, z: 52, role: 'hold', path: [[-8.5, 52], [-12, 49]] }] },
    eg52: { units: [{ type: 'E01', x: 2, y: 0, z: 64, role: 'flank', portal: true, path: [[4, 68]] }, { type: 'E01', x: -2, y: 0, z: 77, role: 'hold', portal: true, path: [[0, 73]] }, { type: 'E04', x: 0, y: 0, z: 88, role: 'hold', portal: true, path: [[2, 79]] }, { type: 'E05', x: -8.5, y: .3, z: 80, role: 'hold' }, { type: 'DRONE', x: 0, y: 5, z: 70, role: 'hold' }] },
    eg53: { trigger: (p) => p.x < -10.6 && p.z > 88 && p.z < 110, units: [{ type: 'E05', x: -22, y: 3.5, z: 104, role: 'hold' }, { type: 'E06', x: -20, y: 0, z: 90, role: 'hold', path: [[-16, 92]] }] },
    eg_duel: { units: [{ type: 'E06', x: 0, y: 0, z: 158, role: 'hold' }, { type: 'E05', x: -10, y: 0, z: 168, role: 'flank', path: [[-8, 160]] }, { type: 'E05', x: 10, y: 0, z: 167, role: 'flank', path: [[8, 152]] }] },
  };
  L.checkpoints = { cp00: { ...L.pts.spawn }, cp01: { x: -8.5, y: .31, z: 52, yaw: -Math.PI / 2, force: true }, cp02: { x: -13, y: .31, z: 52, yaw: Math.PI / 2, force: true }, cp03: { x: 0, y: .01, z: 138, yaw: 0, force: true } };
  // ---------------- elenco ----------------
  L.irene = X.npc({ name: 'Irene', asset: 'sol', outfit: 'ambar', x: -21.6, y: 1.0, z: 52, yaw: Math.PI / 2, anim: 'Sing', endAnim: 'Idle' });
  L.pianist = X.npc({ name: 'Teodoro', outfit: 'pianista', x: -17.7, y: .3, z: 40.3, yaw: -2.4, anim: 'BartenderIdle', endAnim: 'Idle' });
  L.players = [X.npc({ outfit: 'p1', hat: 0x4a3a2a, x: -15, y: .3, z: 61.3, yaw: Math.PI, anim: 'Talk' }), X.npc({ outfit: 'xerife', hat: 0x8a6a3a, x: -15, y: .3, z: 58.8, yaw: 0 })];
  L.quincas = X.npc({ name: 'Quincas', outfit: 'pistoleiro', hat: 0x17130f, x: 0, y: 0, z: 158, yaw: Math.PI, anim: 'Idle' });
  L.finish(); return L;
}
let lastSafe = V(0, .01, 2), firePrev = false;
function placeMaster(X) {
  const { L, S } = X, open = !!S.flags.clock_set, dz = open ? 2.3 : 0;
  L.master.mesh.position.z = dz; L.master.col.min[2] = L.masterBase.min2 + dz; L.master.col.max[2] = L.masterBase.max2 + dz;
  L.safeDoor.visible = !S.flags.map_taken; L.safeDoor.rotation.y = 0;
}
function applyWorld(X) {
  const { L, S } = X, f = S.flags;
  X.setDoor('tower_gate', !!f.duel_resolved, true);
  placeMaster(X); L.trap.visible = !f.piano_solved; L.lockbox.visible = !S.seals.includes('seal_a2m1_stable'); L.plate.visible = !f.photo_saved;
  for (let i = 0; i < 4; i++) L.keys[i].material = f.piano_solved ? L.M.neonGreen : L.M.neonAmber;
  if (f.irene_talked && !f.saloon_cleared) { L.irene.place(-16.8, .3, 64.6, Math.PI); L.irene.actor.play('Idle', 0); for (const n of L.players) n.hideSafe(); L.pianist.place(-22.6, 1.0, 47, Math.PI / 2); }
  if (f.saloon_cleared) { L.irene.place(-16, .3, 64.4, Math.PI); L.irene.actor.play('RelaxedIdle', 0); for (const n of L.players) n.hideSafe(); L.pianist.place(-22.6, 1.0, 47, Math.PI / 2); }
  L.quincas.setVisible(!!f.duel_ready && !f.duel_resolved);
  if (f.duel_won) { L.quincas.setVisible(true); L.quincas.actor.play('DeathSpin', 0, 1, { once: true, restart: true }); }
  for (const r of L.duelRing) r.visible = !!f.duel_ready && !f.duel_resolved;
}
function bellSay(X, n) { X.sfx.bell(); X.fx.shake(.06); X.toast(n === 3 ? '■ SAQUE! ■' : `${n}ª BADALADA`, n === 3 ? 1.2 : .9); }
function finishDuelBad(X, slow) {
  const { L, S, P } = X, f = S.flags;
  X.say('QUINCAS', slow ? 'Lento demais, forasteiro.' : 'Trapaceiro! Sem honra, sem regra!');
  L.quincas.actor.play('Draw', .04, 1, { once: true, restart: true }); X.sfx.revolver();
  X.damagePlayer(slow ? 28 : 18, V(0, 1.5, 158));
  X.after(.6, () => { L.quincas.setVisible(false); X.setHolster(false); P.inputLock = .2; f.duel_fight = true; X.startGroup('eg_duel'); X.toast(slow ? 'DUELO PERDIDO • A GANGUE ATACA' : 'DESONRA • A GANGUE ATACA', 2.2); });
}
function winDuel(X) {
  const { L, S, P } = X, f = S.flags;
  X.setHolster(false); X.giveWeapon('martelo9');
  const hand = V(P.body.pos.x + .3, P.body.pos.y + 1.4, P.body.pos.z + .4), head = V(0, 1.6, 158);
  X.fx.tracer(hand, head, 0xfff0b0); X.fx.flash(hand, .3, .06); X.fx.sparks(head, 0xff4030, 14, 3, .5); X.sfx.revolver();
  L.quincas.actor.play('DeathSpin', .08, 1, { once: true, restart: true });
  f.duel_won = true; f.duel_resolved = true; P.armor = Math.min(100, P.armor + 25); P.inputLock = .5;
  X.toast('DUELO VENCIDO • +25 ARMADURA', 2.4); X.setDoor('tower_gate', true);
  X.say('GAEL', 'No meu século isso se chama reflexo. No seu, vira lenda.');
  X.say('ÍRIS-9', 'A torre do relógio está aberta. A Fenda pulsa na varanda.');
  for (const r of L.duelRing) r.visible = false;
}
const mission = {
  id: 'A2-M1', name: 'Poeira Alta', era: 'VALE DE MERCÚRIO • 1888', act: 2, sectorNames: SECTORS, sectorAt, sealsRequired: 2, sealsAvailable: 3, requiredFlags: ['duel_resolved'], enemiesTotal: 17, secretsTotal: 3, next: 'A2-M2', ambientTrack: 10, build,
  newState: () => ({ duel: { phase: 'idle', t: 0, drawAt: 0, bells: 0, result: null }, piano: [] }),
  outdoor: (p) => !['saloon', 'watch', 'stable'].includes(sectorAt(p)),
  startLoadout: () => ({ weapons: { martelo9: { have: true, mag: 15 }, trovao_duplo: { have: true, mag: 2 }, rompe_casco: { have: true, mag: 1 } }, ammo: { ammo9: 75, shells: 10, rockets: 2 }, current: 'martelo9', holster: false }),
  ecoLocked: () => false, afterReset(X) { X.unlockEco(); },
  apply(X) { lastSafe = V(0, .01, 2); firePrev = false; const d = X.S.duel; if (d && d.phase !== 'idle' && !X.S.flags.duel_resolved && !X.S.flags.duel_fight) X.S.duel = { phase: 'idle', t: 0, drawAt: 0, bells: 0, result: null }; applyWorld(X); },
  onResume(X) {
    const f = X.S.flags;
    if (f.irene_talked && !f.saloon_cleared) X.startGroup('eg51');
    if (f.map_taken && !f.ambush_cleared) X.startGroup('eg52');
    if (f.duel_fight && !f.duel_resolved) X.startGroup('eg_duel');
  },
  intro(X) {
    X.say('ÍRIS-9', 'Coordenada confirmada: Vale de Mercúrio, 1888. A âncora do Oeste está perto, e a fenda deixou rastros por toda a cidade.');
    X.say('GAEL', 'Poeira, cavalos e ninguém olhando o celular. Já gosto mais daqui do que de 2039.');
    X.say('ÍRIS-9', 'A informante é Irene Vidal, cantora do Saloon Rosa de Ferro. Dois Selos bastam para estabilizar a saída na torre do relógio.');
  },
  objective(X) {
    const f = X.S.flags, S = X.S;
    if (!f.irene_talked && !f.map_taken) return 'Encontre a cantora Irene Vidal no Saloon Rosa de Ferro';
    if (f.irene_talked && !f.saloon_cleared) return 'Proteja Irene: derrube os pistoleiros no saloon';
    if (!f.map_taken) return f.clock_set ? 'Abra o cofre atrás do relógio-mestre' : knowsClockCode(S) ? 'Relojoaria Klein: acerte o relógio-mestre para 11:47' : 'Relojoaria Klein: descubra a hora do relógio-mestre';
    if (!f.ambush_cleared) return 'Emboscada temporal na rua principal: sobreviva';
    if (!f.duel_resolved) return S.duel?.phase === 'count' || S.duel?.phase === 'draw' ? 'Duelo: atire na TERCEIRA badalada — nem antes, nem depois' : f.duel_fight ? 'Derrube a gangue do pistoleiro' : 'Encare o pistoleiro sob o relógio da praça';
    if (S.seals.length < 2) return 'Falta um Selo: celeiro dos estábulos ou Irene, no saloon';
    return 'Suba a torre do relógio e atravesse a Fenda de Saída';
  },
  waypoint(X) {
    const { S, L } = X, f = S.flags;
    if (!f.irene_talked && !f.map_taken) return L.interact.irene;
    if (f.irene_talked && !f.saloon_cleared) return null;
    if (!f.map_taken) return f.clock_set ? L.interact.safe : knowsClockCode(S) ? L.interact.clock : L.interact.notebook;
    if (!f.ambush_cleared) return null;
    if (!f.duel_resolved) return f.duel_fight || S.duel?.phase !== 'idle' ? null : V(0, 1, 142);
    if (S.seals.length < 2) return !S.seals.includes('seal_a2m1_stable') ? L.interact.lockbox : L.interact.ireneBar;
    return L.pts.gate;
  },
  gateHint(X) { return !X.S.flags.duel_resolved ? 'O pistoleiro guarda a torre: resolva o duelo na praça.' : 'Confirme dois Selos: saloon, relojoaria ou estábulos.'; },
  exitLine: 'Selos de 1888 confirmados. A fenda aponta para baixo da terra: Mina Treze.',
  deathTips: ['O Bruto Réptil tem placa frontal: atire nas pernas, nas costas ou use explosivos. A minigun gira antes de atirar.', 'Dinamite acesa mostra um anel no chão: saia do raio antes do pavio acabar.', 'O Pistoleiro brilha o cano antes do tiro forte. Quebre a linha de visão nessa hora.', 'No duelo, atire exatamente na terceira badalada. Atirar antes é desonra.'],
  interactables(X, add) {
    const { S, L, P } = X, f = S.flags;
    if (!f.irene_talked && !f.map_taken) add(L.interact.irene, 'Falar com Irene Vidal', () => {
      f.irene_talked = true; L.irene.talk(5); X.sfx.ui();
      X.say('IRENE', 'Você é o homem do cartaz do xerife. O retrato chegou antes de você.');
      X.say('GAEL', 'Eu causo esse efeito. Em pessoas e em cartazes.');
      X.say('IRENE', 'A Companhia Mercúrio está apagando famílias dos registros. Eu guardei os nomes — e eles sabem.');
      X.after(5.2, () => {
        X.sfx.glass(); X.sfx.bang(); X.fx.shake(.12); X.say('IRENE', 'Pistoleiros na porta! Atrás do balcão, Teodoro!');
        L.irene.panic([[-18.6, .3, 52], [-12.4, .3, 57.2], [-12.3, .3, 64.6], [-16.8, .3, 64.6]], .2, false);
        L.pianist.panic([[-17.4, .3, 44], [-20.2, 1.0, 46], [-22.6, 1.0, 47]], .1, false);
        L.players.forEach((n, i) => n.panic([[-11.2, .3, 52], [-8.5, .3, 52], [-8.5, .3, 18]], .15 * i, true));
        X.startGroup('eg51');
      });
    });
    if (f.saloon_cleared) add(L.interact.ireneBar, f.ireneChat ? 'Conversar com Irene' : 'Ouvir o recado de Irene', () => {
      L.irene.talk(4); f.ireneChat = (f.ireneChat || 0) + 1;
      const lines = [['IRENE', 'O cofre do Klein abre às onze e quarenta e sete. O relógio-mestre esconde a porta.'], ['IRENE', 'E o piano? Ele toca sozinho quando ninguém olha. A ordem está no meu cartaz.'], ['GAEL', 'Depois disso tudo, eu te devo uma música. Aviso: eu canto mal.'], ['IRENE', 'Então volte vivo e cante mal aqui. É uma promessa.']];
      const [w, t] = lines[(f.ireneChat - 1) % lines.length]; X.say(w, t);
    });
    for (let i = 0; i < 4; i++) add(L.keyPos[i], `Tocar a tecla ${PIANO_KEYS[i].toUpperCase()}`, () => {
      const r = pressPianoKey(S, i); X.sfx.piano(i); L.keys[i].position.y = 1.16; X.after(.2, () => { L.keys[i].position.y = 1.2; });
      if (r === 'wrong') X.toast('Nota fora da ordem • o piano volta ao começo', 1.4);
      if (r === 'solved') { X.sfx.door(); L.trap.visible = false; for (const k of L.keys) k.material = L.M.neonGreen; X.toast('UM ALÇAPÃO SE ABRIU NO PALCO', 2); X.say('GAEL', 'Piano com compartimento secreto. Esse século tem senso de humor.'); }
    });
    if (!f.piano_solved) add(L.interact.poster, 'Ler cartaz do espetáculo', () => X.openDoc({ k: 'SALOON ROSA DE FERRO', t: 'Hoje à noite: Irene Vidal', b: 'Canção de abertura, escrita a giz na margem do cartaz:\n\n"O sino chama,\n o rio corre,\n a lua escuta,\n o ferro fecha."\n\nAlguém sublinhou as quatro palavras-chave e desenhou um piano ao lado.' }));
    if (f.piano_solved && !f.trap_open) add(L.interact.trap, 'Abrir o alçapão do palco', () => {
      f.trap_open = true; S.pecas += 40; if (!S.secrets.includes('piano_trap')) S.secrets.push('piano_trap'); X.sfx.pickup(); X.toast('+40 PEÇAS CRONAIS • SEGREDO', 2);
      X.openDoc({ k: 'ALÇAPÃO DO PALCO', t: 'Um gramofone impossível', b: 'Dentro do alçapão há um gramofone com bateria recarregável e uma etiqueta: "Fabricado em 2275".\n\nAo girar a manivela, ele toca um anúncio: "Cansado do passado? Assine o Futuro Premium."\n\nGael: "Até em 1888 eu não escapo de propaganda."' });
    });
    add(L.interact.wanted, 'Ler cartaz de PROCURADO', () => {
      if (!S.secrets.includes('wanted_poster')) S.secrets.push('wanted_poster');
      X.openDoc({ k: 'ESCRITÓRIO DO XERIFE', t: 'PROCURADO: G. ROCHA', b: 'Recompensa: 500 dólares em ouro.\nCrime: "explodir a usina municipal de uma cidade que ainda não existe".\n\nO desenho é idêntico ao rosto de Gael — inclusive a cicatriz.\nA data de impressão: daqui a três semanas.\n\nGael: "Pelo menos acertaram o meu lado bom."' });
    });
    if (!f.notebook_read) add(L.interact.notebook, 'Ler o caderno do relojoeiro', () => { f.notebook_read = true; X.openDoc({ k: 'RELOJOARIA KLEIN', t: 'Caderno de A. Klein', b: 'Os retratos da cidade estão mudando. Os Albuquerque sumiram da foto da igreja, e ninguém lembra deles além de mim e da Irene.\n\nGuardei o mapa da Mina Treze no cofre. Se eu também sumir, o relógio-mestre abre a porta quando marcar 11:47 — a hora em que esta cidade esqueceu a primeira família.' }); });
    if (!f.clock_set) add(L.interact.clock, knowsClockCode(S) ? 'Acertar o relógio-mestre para 11:47' : 'Relógio-mestre parado', () => {
      if (!setMasterClock(S)) { X.toast('Que horas? Irene ou o caderno do relojoeiro devem saber.'); X.sfx.empty(); return; }
      X.sfx.bell(); X.sfx.door(); placeMaster(X); X.toast('O RELÓGIO DESLIZA • HÁ UM COFRE ATRÁS', 2.2);
    });
    if (f.clock_set && !f.map_taken) add(L.interact.safe, 'Abrir o cofre do relojoeiro', () => {
      if (!openSafe(S)) return;
      placeMaster(X); X.sfx.pickup(); X.grantSeal('seal_a2m1_watch', L.interact.safe); X.toast('MAPA DA MINA TREZE RECUPERADO', 2.4);
      X.say('ÍRIS-9', 'Mapa recuperado. E... leituras de fenda na rua! Saqueadores cronais — e algo grande, escamoso e com uma minigun.');
      X.after(1.4, () => X.startGroup('eg52'));
    });
    if (!S.seals.includes('seal_a2m1_stable')) add(L.interact.lockbox, 'Abrir a caixa-forte do celeiro', () => { X.sfx.door(); L.lockbox.visible = false; X.grantSeal('seal_a2m1_stable', L.interact.lockbox); X.say('GAEL', 'Um Selo escondido no feno. Os cavalos sabiam e ninguém perguntou.'); });
    if (!f.photo_saved) add(L.interact.plate, 'Guardar a chapa fotográfica', () => {
      f.photo_saved = true; L.plate.visible = false; if (!S.secrets.includes('photo_record')) S.secrets.push('photo_record'); X.sfx.pickup();
      X.openDoc({ k: 'CHAPA FOTOGRÁFICA • 1888', t: 'A família que sumiu', b: 'Uma chapa de vidro mostra a família Albuquerque diante da capela — a mesma foto em que, na cidade, o espaço deles agora está vazio.\n\nÍris-9: "Registro original preservado. Isso vai mudar uma exposição em Nova Aurora."\n\n(Efeito entre eras: revisite A1-M1.)' });
    });
    if (f.duel_ready && !f.duel_resolved && !f.duel_fight && S.duel.phase === 'idle') add(V(0, 1, 142), 'Aceitar o duelo', () => {
      if (!startDuel(S)) return;
      P.body.pos.set(0, .01, 142); P.body.vel.set(0, 0, 0); P.yaw = 0; P.pitch = -.02; P.inputLock = 99; X.setHolster(true); firePrev = true;
      X.say('QUINCAS', 'Na terceira badalada, forasteiro. Nem antes. Nem depois.', 3.2);
    });
  },
  firePressed: null,
  tick(X, dt) {
    const { S, L, P } = X, f = S.flags, p = P.body.pos;
    if (p.y < -3) { X.fallRecover(lastSafe); return; }
    if (P.body.grounded && p.y >= 0) lastSafe = p.clone();
    if (S.checkpointId === 'cp00' && S.groupsDone.includes('eg50') && p.x < -7 && p.z > 46 && p.z < 58) X.saveCheckpoint('cp01');
    if (f.saloon_cleared && !['cp02', 'cp03'].includes(S.checkpointId)) X.saveCheckpoint('cp02');
    if (f.duel_ready && !f.duel_resolved && !f.duel_fight && p.z > 134 && S.checkpointId !== 'cp03' && S.duel.phase === 'idle') X.saveCheckpoint('cp03');
    // duelo
    const d = S.duel;
    if (d && (d.phase === 'count' || d.phase === 'draw')) {
      const fire = X.firePressed ? X.firePressed() : false, edge = fire && !firePrev; firePrev = fire;
      P.body.vel.set(0, 0, 0);
      for (const e of stepDuel(S, dt, edge, X.settings.difficulty)) {
        if (e === 'bell') bellSay(X, d.bells);
        if (e === 'draw') { bellSay(X, 3); L.quincas.actor.play('Aim', .05); }
        if (e === 'win') winDuel(X);
        if (e === 'early') finishDuelBad(X, false);
        if (e === 'slow') finishDuelBad(X, true);
      }
    }
  },
  onGroupDone(X, id) {
    const { S, L } = X, f = S.flags;
    if (id === 'eg51') {
      f.saloon_cleared = true; f.irene_told = true; L.irene.place(-16, .3, 64.4, Math.PI); L.irene.talk(5);
      X.grantSeal('seal_a2m1_saloon', V(-16, 1.6, 63));
      X.say('IRENE', 'Ainda estou aqui. Obrigada. O mapa da Mina Treze está no cofre do relojoeiro Klein.');
      X.say('IRENE', 'O velho escondeu a porta atrás do relógio-mestre. Onze e quarenta e sete.');
      X.say('GAEL', 'A mesma hora do meu noticiário falso. Coincidência é uma palavra que esse século ainda não inventou.');
    }
    if (id === 'eg52') {
      f.ambush_cleared = true; f.duel_ready = true; L.quincas.setVisible(true); L.quincas.actor.play('Idle', 0); for (const r of L.duelRing) r.visible = true;
      X.sfx.bell(); X.say('QUINCAS', 'Forasteiro do futuro! Debaixo do relógio. Só eu, você e três badaladas.');
      X.say('GAEL', 'Vim de 2039 pra levar desafio de caubói. Tá bom. Eu topo.');
    }
    if (id === 'eg_duel') { f.duel_resolved = true; X.setDoor('tower_gate', true); for (const r of L.duelRing) r.visible = false; X.say('ÍRIS-9', 'Gangue dispersa. A torre do relógio está aberta.'); }
  },
  frame(X, dt, t, sim) {
    const { L } = X;
    if (L.pendulum) L.pendulum.rotation.x = Math.sin(t * 2.4) * .25;
    for (const h of L.horses) h.neck.rotation.z = -.55 + Math.sin(t * .9 + h.g.position.z) * .08;
    L.bell.rotation.z = X.S.duel && (X.S.duel.phase === 'count' || X.S.duel.phase === 'draw') ? Math.sin(t * 6) * .25 : L.bell.rotation.z * .95;
    const ah = (11 + 47 / 60) / 12 * Math.PI * 2, am = 47 / 60 * Math.PI * 2;
    L.towerHands[0].rotation.z = ah; L.towerHands[0].position.set(-Math.sin(ah) * .55, 12 + Math.cos(ah) * .55, 171.9);
    L.towerHands[1].rotation.z = am; L.towerHands[1].position.set(-Math.sin(am) * .82, 12 + Math.cos(am) * .82, 171.88);
    L.chips.rotation.y += dt;
    for (const r of L.duelRing) r.material.opacity = .4 + .3 * Math.sin(t * 4);
  },
  menuCam(t, cam) { cam.position.set(Math.sin(t * .1) * 5, 5.5, 20 + Math.sin(t * .07) * 6); cam.lookAt(0, 4, 90); return V(0, 3, 60); },
  resultsText: (X) => `${X.S.pecas} Peças Cronais. Irene ${X.S.flags.saloon_cleared ? 'protegida' : 'à espera no saloon'}, mapa da Mina Treze recuperado${X.S.flags.duel_won ? ' e duelo vencido no saque' : ''}. Próxima missão: A2-M2 — Mina Treze.`,
  onComplete(X, campaign) { if (X.S.flags.photo_saved) campaign.flags.photo_saved_1888 = true; },
};
export default mission;
