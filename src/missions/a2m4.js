// A2-M4 — FORTE MEIA-NOITE. Vale de Mercúrio, 1888 (GDD §7, §8.2, §35, §37). Fecha o Ato II.
// Desfiladeiro com canhões de muralha → portão → pátio → salão do Marechal (Âncora do Oeste) → fornalha:
// duelo com o Marechal Ferrugem (3 fases) → registro da fotografia falsa → Fenda na fornalha.
import * as THREE from 'three';
import { createBuilder, canvasTex, makeSky, makeDust, lantern } from '../world.js';
import { lineOfSight } from '../physics.js';
import { createFerrugem, startFerrugem, stepFerrugem, exposeFerrugem, hitFerrugem, attackHits, createFort, stepFort, disableCannon, shellHits, ARENA } from './ferrugem-state.js';
import { buildFerrugem } from './ferrugem-view.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SECTORS = { canyon: 'Desfiladeiro dos canhões', ledge: 'Plataforma de artilharia', yard: 'Pátio do Forte', quarters: 'Alojamento', hall: 'Salão do Marechal', furnace: 'Fornalha', exit: 'Fenda da fornalha' };
export const FORTE_ROUTE = { spawn: [0, .01, -4], ledgeW: [-17, 3.6, 46], ledgeE: [17, 3.6, 46], gate: [0, 0, 58], anchor: [20, 0, 101], ledger: [-20, 0, 84], start: [0, 0, 114], valves: [[-21, 0, 138], [21, 0, 138]], photo: [-9, 0, 181], exit: [0, 0, 184] };
function sectorAt(p) {
  if (p.z > 176) return 'exit'; if (p.z >= 111) return 'furnace';
  if (p.z > 59) { if (p.x < -14 && p.z > 66 && p.z < 90) return 'quarters'; if (p.x > 14 && p.z > 90 && p.z < 108) return 'hall'; return 'yard'; }
  return p.y > 3 && Math.abs(p.x) > 14 ? 'ledge' : 'canyon';
}
function plate(text, bg = '#2a1a12', ink = '#f0d8a0') {
  return canvasTex(512, 128, (c) => { c.fillStyle = bg; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#140a04'; c.lineWidth = 8; c.strokeRect(4, 4, 504, 120); c.font = 'bold 44px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink; c.fillText(text, 256, 66); }, false);
}
function build(scene) {
  const L = createBuilder(scene), { B, D, M } = L;
  L.fogColor = 0x14121c; L.fogDensity = .0075; L.hemi = 2.1; L.moon = 1.8;
  L.sunColor = 0x9ab4ff; L.hemiSky = 0x5a6a9a; L.hemiGround = 0x3a2418;
  makeSky(L, 0x04060e, 0x1c1a2c, 0x5a2a18); makeDust(L, 220, 0xff9a50, .07, .35);
  const sign = (t, x, y, z, w, ry = Math.PI, bg, ink) => { const m = L.mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: plate(t, bg, ink), side: THREE.DoubleSide }), x, y, z); m.rotation.y = ry; return m; };
  const cyl = (mat, x, y, z, r, h, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, 12); g.rotateX(rx); g.rotateZ(rz); return L.mesh(g, mat, x, y, z); };
  // ---------- desfiladeiro ----------
  B(M.sand, -20, 20, -1, 0, -10, 58);
  for (const s of [-1, 1]) {
    B(M.rock, s < 0 ? -34 : 20, s < 0 ? -20 : 34, 0, 18, -10, 58);
    for (let i = 0; i < 9; i++) B(M.rock, s < 0 ? -20 : 14, s < 0 ? -14 : 20, 0, (i + 1) * .4, 25 + i * 1.35, 26.35 + i * 1.35);   // escada até a plataforma
    B(M.rock, s < 0 ? -20 : 14, s < 0 ? -14 : 20, 0, 3.6, 37.1, 54);
    B(M.iron, s * 14 - .06, s * 14 + .06, 3.6, 4.6, 37.1, 54, { col: { seeThrough: true } });
    const x = s * 17;   // canhão de muralha: base, cano e munição
    B(M.iron, x - 1.2, x + 1.2, 3.6, 4.6, 48, 51.6); cyl(M.iron, x, 4.6, 46.2, .55, 4.4, Math.PI / 2); cyl(M.brass, x, 4.6, 44, .66, .3, Math.PI / 2);
    for (let k = 0; k < 3; k++) L.mesh(new THREE.SphereGeometry(.28, 8, 6), M.dark, x + (k - 1) * .7, 3.9, 52.6);
    L.light(x, 6, 47, 0xffa860, 18, 14);
    L.interact['cannon' + (s < 0 ? 0 : 1)] = V(x, 3.6, 46.2 - 2.6);
  }
  for (const [x, z, w] of [[-6, 14, 3], [7, 20, 3.4], [-8, 36, 3], [8, 42, 3.6], [0, 50, 3]]) { B(M.planks, x - w / 2, x + w / 2, 0, 1.2, z - .6, z + .6); B(M.hazard, x - w / 2 - .02, x + w / 2 + .02, .8, .95, z - .62, z + .62, { noCol: true }); }
  for (const [x, z, h] of [[-11, 5, 2.6], [11, 28, 3.2]]) B(M.rock, x - 1.4, x + 1.4, 0, h, z - 1.2, z + 1.2);
  for (let z = -4; z < 56; z += 12) for (const s of [-1, 1]) lantern(L, s * 13.4, 3.2, z, 0xffa860, 11, 12);
  L.interact.cache = V(13, .7, 9.2); B(M.planks, 12.2, 13.8, 0, .9, 8.4, 10);
  sign('FORTE MEIA-NOITE • CIA. MERCÚRIO', 0, 8.2, 56.9, 9, Math.PI, '#20141a');
  // ---------- portão ----------
  B(M.adobe, -34, -4, 0, 12, 58, 60); B(M.adobe, 4, 34, 0, 12, 58, 60); B(M.adobe, -4, 4, 6, 12, 58, 60);
  L.doors.gate = D(M.iron, -4, 4, 0, 6, 58, 60);
  for (const s of [-1, 1]) { B(M.iron, s * 6 - 1.2, s * 6 + 1.2, 12, 15, 56.8, 61); L.light(s * 6, 14, 55, 0xff7a40, 14, 12); }
  // ---------- pátio ----------
  B(M.mud, -24, 24, -1, 0, 60, 111);
  for (const s of [-1, 1]) B(M.adobe, s < 0 ? -26 : 24, s < 0 ? -24 : 26, 0, 10, 60, 111);
  B(M.adobe, -24, -5, 0, 10, 109.3, 110.3); B(M.adobe, 5, 24, 0, 10, 109.3, 110.3); B(M.adobe, -5, 5, 5, 10, 109.3, 110.3);
  L.doors.furnace = D(M.hazard, -5, 5, 0, 5, 109.3, 110.3);
  for (const [x, z, w] of [[-8, 72, 3.4], [8, 74, 3.4], [0, 85, 4], [-9, 98, 3.4], [9, 100, 3.4]]) { B(M.planks, x - w / 2, x + w / 2, 0, 1.2, z - .65, z + .65); B(M.rust, x - w / 2 - .02, x + w / 2 + .02, .75, .9, z - .67, z + .67, { noCol: true }); }
  B(M.iron, -7, -5, 0, 1, 66, 68.5); cyl(M.iron, -6, 1.6, 67.2, .5, 1.2, 0, Math.PI / 2);   // canhão de enfeite (sem função)
  for (const z of [66, 84, 102]) for (const s of [-1, 1]) { lantern(L, s * 12.5, 3, z, 0xffa860, 12, 12); }
  // alojamento oeste (livro de ponto apagado)
  B(M.adobe, -24, -14, 0, 4.2, 66, 66.3); B(M.adobe, -24, -14, 0, 4.2, 89.7, 90); B(M.adobe, -24.3, -24, 0, 4.2, 66, 90);
  B(M.adobe, -14.3, -14, 0, 4.2, 66, 76); B(M.adobe, -14.3, -14, 0, 4.2, 80, 90); B(M.adobe, -14.3, -14, 3.1, 4.2, 76, 80);
  B(M.shingle, -24.6, -13.7, 4.2, 4.5, 65.7, 90.3, { noCol: true });
  for (let i = 0; i < 4; i++) { B(M.wood || M.planks, -23.6, -21.8, 0, .6, 68 + i * 4.4, 70 + i * 4.4); }
  B(M.planks, -22, -19, 0, .9, 83, 85.5); L.interact.ledger = V(-20.4, .8, 84.3); L.light(-19, 3, 80, 0xffb878, 16, 10);
  // salão do Marechal (Âncora do Oeste)
  B(M.adobe, 14, 24, 0, 5, 90, 90.3); B(M.adobe, 14, 24, 0, 5, 107.7, 108); B(M.adobe, 24, 24.3, 0, 5, 90, 108);
  B(M.adobe, 14, 14.3, 0, 5, 90, 96); B(M.adobe, 14, 14.3, 0, 5, 100, 108); B(M.adobe, 14, 14.3, 3.2, 5, 96, 100);
  B(M.shingle, 13.7, 24.6, 5, 5.3, 89.7, 108.3, { noCol: true });
  B(M.cloth, 16, 23, 0, .05, 91, 107, { noCol: true });   // tapete
  B(M.brass, 19, 21, 0, 1, 100, 102); L.anchor = new THREE.Group(); L.anchor.position.set(20, 1.75, 101); L.root.add(L.anchor);
  { const a = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 1.5, 8), M.brass), r = new THREE.Mesh(new THREE.TorusGeometry(.2, .05, 6, 12), M.brass), bar = new THREE.Mesh(new THREE.BoxGeometry(.9, .09, .09), M.brass), arc = new THREE.Mesh(new THREE.TorusGeometry(.55, .07, 6, 14, Math.PI), M.brass); r.position.y = .85; bar.position.y = .5; arc.position.y = -.55; arc.rotation.z = Math.PI; a.position.y = 0; L.anchor.add(a, r, bar, arc); const glow = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3affd0 })); glow.position.y = .1; L.anchor.add(glow); }
  L.interact.anchor = V(20, 1, 99.4); L.light(20, 3.4, 101, 0x3affd0, 14, 9);
  B(M.planks, 15.5, 18.5, 0, .9, 94, 96); sign('MARECHAL FERRUGEM', 24, 3.6, 99, 3.6, -Math.PI / 2, '#20141a');
  // ---------- fornalha (arena) ----------
  B(M.iron, -24, 24, -1, 0, 111, 192);
  for (let z = 114; z < 190; z += 5) B(M.neonAmber, -22, 22, .005, .02, z, z + .12, { noCol: true });
  for (const s of [-1, 1]) {
    B(M.adobe, s < 0 ? -26 : 24, s < 0 ? -24 : 26, 0, 16, 110, 192);
    B(M.iron, s < 0 ? -24 : 16, s < 0 ? -16 : 24, 3.4, 3.6, 126, 170);   // passarela
    for (let i = 0; i < 10; i++) B(M.iron, s < 0 ? -24 : 20, s < 0 ? -20 : 24, 0, (i + 1) * .34, 113 + i * 1.3, 114.3 + i * 1.3);
    B(M.rail, s < 0 ? -16.1 : 16, s < 0 ? -16 : 16.1, 3.6, 4.6, 126, 170, { col: { seeThrough: true } });
    cyl(M.iron, s * 23, 8, 134, .6, 16); cyl(M.rust, s * 23, 8, 152, .6, 16);
    L.light(s * 20, 5, 120, 0xff7a30, 24, 22); L.light(s * 20, 5, 150, 0xff7a30, 24, 22); L.light(s * 20, 5, 180, 0xff7a30, 24, 22);
  }
  B(M.adobe, -24, 24, 0, 16, 192, 193);
  B(M.iron, -9, 9, 0, 10, 191, 192.2); B(M.neonRed, -7, 7, 1, 8, 190.9, 191.05, { noCol: true });   // boca da fornalha
  L.furnaceGlow = L.mesh(new THREE.PlaneGeometry(13, 7), new THREE.MeshBasicMaterial({ color: 0xff6a20 }), 0, 4.5, 190.8); L.furnaceGlow.rotation.y = Math.PI; L.light(0, 4, 188, 0xff6a20, 30, 24); L.light(0, 9, 152, 0xffc890, 26, 40);
  for (const x of [-12, -4, 4, 12]) cyl(M.iron, x, 12, 189, .45, 24);
  B(M.metal, -1, 1, 0, .85, 114, 114.7); L.interact.start = V(0, 1, 113.2); sign('ABRIR A FORNALHA', 0, 2.3, 114.8, 2.4, Math.PI, '#3a0a0a', '#ffcc60');
  L.valves = []; for (let i = 0; i < 2; i++) {
    const x = i ? 21.5 : -21.5; B(M.metal, x - .8, x + .8, 0, 1.05, 137.3, 138.5); cyl(M.rust, x, 2.1, 137.9, .22, 4.2);
    L.valves.push(L.mesh(new THREE.TorusGeometry(.42, .065, 6, 16), M.neonCyan, x - Math.sign(x) * .9, 1.35, 137.9)); L.interact['valve' + i] = V(x - Math.sign(x) * 1.4, 1, 137.9);
    sign(i ? 'V2 • DESCARGA LESTE' : 'V1 • DESCARGA OESTE', x - Math.sign(x) * 1.5, 3.5, 137.3, 3.4, 0);
  }
  B(M.planks, 3, 4.6, 0, .9, 113.4, 114.8); L.interact.supply = V(3.8, 1, 112.8); // reserva logo na entrada, ao lado do painel
  L.covers = [[-9, 135], [9, 135], [-9, 150], [9, 150]].map(([x, z]) => { const d = D(M.iron, x - 1.6, x + 1.6, 0, 1.4, z - .6, z + .6); return d; });
  B(M.planks, -11.6, -6.4, 0, .9, 180.4, 182.4); L.interact.photo = V(-8.6, 1, 179.5); L.deskLamp = L.mesh(new THREE.SphereGeometry(.12, 8, 6), M.lantern, -9, 1.1, 181.4);
  L.exitGlow = L.mesh(new THREE.TorusGeometry(2.6, .12, 6, 28), M.neonViolet, 0, 2.6, 188); L.light(0, 2.6, 186, 0x9a6dff, 30, 18);
  L.pts.spawn = { x: 0, y: .01, z: -4, yaw: 0 }; L.pts.gate = V(0, .01, 186.5); L.pts.gateYaw = 0;
  L.pickups = L.pickups || [];
  for (const p of [['canyon_ammo', 'ammo9', 24, 5, .35, 4], ['canyon_med', 'medkit', 35, -7, .35, 30], ['ledge_shells', 'shells', 6, -17, 3.95, 40], ['ledge_med', 'medkit', 35, 17, 3.95, 41], ['yard_armor', 'armor', 45, -2, .35, 78], ['yard_ammo', 'ammo9', 30, 4, .35, 92], ['hall_shells', 'shells', 8, 18, .35, 94], ['arena_med_w', 'medkit', 40, -21, 3.95, 150], ['arena_med_e', 'medkit', 40, 21, 3.95, 150], ['arena_ammo', 'ammo9', 30, -3, .35, 118]]) L.pickup('m5_' + p[0], ...p.slice(1));
  L.groups = {
    eg80: { trigger: (p) => p.z > 8 && p.z < 50, units: [{ type: 'E01', x: -4, y: 0, z: 40, role: 'flank', path: [[-4, 33]] }, { type: 'E06', x: 5, y: 0, z: 48, role: 'hold', path: [[5, 44]] }, { type: 'E05', x: 0, y: 0, z: 52, role: 'hold', path: [[0, 47]] }] },
    eg81: { trigger: (p) => p.z > 62 && p.z < 108, units: [{ type: 'E04', x: 0, y: 0, z: 100, role: 'hold', path: [[0, 94]] }, { type: 'E05', x: -9, y: 0, z: 92, role: 'hold' }, { type: 'E05', x: 10, y: 0, z: 84, role: 'hold' }, { type: 'E01', x: 8, y: 0, z: 100, role: 'flank', path: [[8, 90]] }] },
    eg82: { units: [{ type: 'E06', x: -19, y: 3.6, z: 150, role: 'sniper', alt: [[-19, 140], [-19, 160]] }, { type: 'E06', x: 19, y: 3.6, z: 150, role: 'sniper', alt: [[19, 140], [19, 160]] }] },
    eg83: { units: [{ type: 'DRONE', x: 0, y: 5, z: 130, role: 'hold' }, { type: 'E01', x: -14, y: 0, z: 128, role: 'flank', path: [[-14, 138]] }] },
  };
  L.checkpoints = { cp00: { ...L.pts.spawn }, cp01: { x: 0, y: .01, z: 63, yaw: 0, force: true }, cp02: { x: 0, y: .01, z: 113.6, yaw: 0, force: true }, cp03: { x: 0, y: .01, z: 178, yaw: 0, force: true } };
  // marcadores dos canhões de muralha
  const fm = new THREE.MeshBasicMaterial({ color: 0xff7a35, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false });
  L.fortRings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(3, 3.5, 32), fm); m.rotation.x = -Math.PI / 2; m.visible = false; L.root.add(m); return m; });
  L.fortMat = fm;
  L.bossView = buildFerrugem(L); L.finish(); return L;
}
let lastSafe = V(0, .01, -4);
function applyWorld(X) {
  const { L, S } = X, f = S.flags, b = S.boss;
  f.batteries_off = !!(S.fort.off[0] && S.fort.off[1]);
  X.setDoor('gate', f.batteries_off, true);
  X.setDoor('furnace', !!(f.anchor_taken && f.yard_cleared && !b.active), true);
  for (const c of L.covers) { c.mesh.visible = !b.steam; c.col.enabled = !b.steam; }
  L.anchor.visible = !f.anchor_taken;
  for (let i = 0; i < 2; i++) L.valves[i].material = b.mode === 'exposed' ? L.M.neonGreen : (b.valveCooldown[i] > 0 || b.phase === 3 && b.active) ? L.M.neonAmber : L.M.neonCyan;
  L.exitGlow.visible = !!f.boss_defeated; L.bossView.sync(b);
}
function finishBoss(X) {
  const { S } = X; if (S.flags.boss_defeated) return;
  S.flags.boss_defeated = true; S.flags.boss_started = false; S.stats.kills++; X.enemies.clear(); X.activeGroups.clear();
  for (const id of ['eg82', 'eg83']) if (!S.groupsDone.includes(id)) S.groupsDone.push(id);
  X.grantSeal('seal_a2m4_ferrugem', V(0, 1.5, 160)); applyWorld(X); X.saveCheckpoint('cp03'); X.sfx.explosion(); X.fx.shake(.3);
  X.say('ÍRIS-9', 'Marechal neutralizado. O Selo liberou a fornalha: a Fenda está atrás do trono. Há uma mesa com papéis do Marechal — leia antes de sair.');
  X.say('GAEL', 'Ferrugem. O nome dele agora é descrição de produto.');
}
const mission = {
  id: 'A2-M4', name: 'Forte Meia-Noite', era: 'VALE DE MERCÚRIO • 1888', act: 2, sectorNames: SECTORS, sectorAt, sealsRequired: 1, sealsAvailable: 1, requiredFlags: ['boss_defeated'], enemiesTotal: 12, secretsTotal: 2, next: null, ambientTrack: 10, build,
  newState: () => ({ boss: createFerrugem(), fort: createFort(), supplyUses: 0, supplyCooldown: 0 }),
  outdoor: (p) => p.z < 60 || (p.z < 111 && !((p.x < -14 && p.z > 66 && p.z < 90) || (p.x > 14 && p.z > 90 && p.z < 108))),
  startLoadout: () => ({ weapons: { martelo9: { have: true, mag: 15 }, trovao_duplo: { have: true, mag: 2 }, rompe_casco: { have: true, mag: 1 }, ferrovia: { have: true, mag: 8 } }, ammo: { ammo9: 90, shells: 12, rockets: 2, rifle: 16 }, current: 'martelo9', holster: false }),
  ecoLocked: () => false, afterReset(X) { X.unlockEco(); },
  gateVisible: (X) => !!X.S.flags.boss_defeated,
  apply(X) {
    const { S } = X, f = S.flags;
    if (!f.boss_defeated) { S.boss = createFerrugem(); f.boss_started = false; } else S.boss = { ...createFerrugem(), ...S.boss, hp: 0, mode: 'dead', active: false };
    S.fort = { ...createFort(), ...(S.fort || {}) }; S.fort.warn = [0, 0]; S.supplyUses ??= 0; S.supplyCooldown ??= 0;
    const cp = X.L.checkpoints[S.checkpointId] || X.L.pts.spawn; lastSafe = V(cp.x, cp.y, cp.z); applyWorld(X);
  },
  intro(X) {
    X.say('ÍRIS-9', 'A carga do trem vinha para cá: o Forte Meia-Noite, quartel da Companhia Mercúrio. Dois canhões de muralha guardam o desfiladeiro; o portão só abre com eles calados.');
    X.say('GAEL', 'Canhões, portão, fortaleza, marechal. Só falta uma banda tocando.');
    X.say('ÍRIS-9', 'Suba pelas escadas laterais e sabote as peças. Os tiros são avisados no chão: saia da marca.');
  },
  objective(X) {
    const { S } = X, f = S.flags, b = S.boss, n = Number(S.fort.off[0]) + Number(S.fort.off[1]);
    if (!f.batteries_off) return `Suba pelas escadas laterais e sabote os canhões de muralha (${n}/2)`;
    if (!f.yard_cleared) return 'Entre no forte e limpe o pátio';
    if (!f.anchor_taken) return 'Recupere a Âncora do Oeste no salão do Marechal';
    if (!f.boss_started && !f.boss_defeated) return 'Abra a fornalha no painel e enfrente o Marechal Ferrugem';
    if (!f.boss_defeated) return b.duel ? 'Duelo final: atire nas juntas' : b.phase === 3 ? 'Destrua os dois acumuladores do Marechal' : b.mode === 'exposed' ? 'Juntas expostas: atire!' : 'Desvie dos avisos e abra uma válvula lateral para expor as juntas';
    if (!f.photo_read) return 'Leia o registro na mesa do Marechal';
    return 'Atravesse a Fenda na fornalha';
  },
  waypoint(X) {
    const { S, L } = X, f = S.flags, b = S.boss;
    if (!f.batteries_off) return L.interact[S.fort.off[0] ? 'cannon1' : 'cannon0'];
    if (!f.yard_cleared) return V(0, 1, 90);
    if (!f.anchor_taken) return L.interact.anchor;
    if (!f.boss_started && !f.boss_defeated) return L.interact.start;
    if (!f.boss_defeated) return b.duel || b.mode === 'exposed' ? V(b.x, 5, b.z - 3) : b.phase === 3 ? V(b.x, 4, b.z - 3) : L.interact[b.valveCooldown[0] <= 0 ? 'valve0' : 'valve1'];
    return f.photo_read ? L.pts.gate : L.interact.photo;
  },
  gateHint: () => 'Derrote o Marechal Ferrugem para conquistar o Selo.',
  exitLine: 'Ato II concluído. A Âncora do Oeste está com Íris — e o registro mostra quem foi apagado. A próxima coordenada fica em outro tempo.',
  deathTips: ['Canhões de muralha avisam com anel laranja no chão: ande para fora dele. Suba pelas escadas laterais para silenciá-los.', 'Pisão e correntes são baixos: pule (Espaço) quando o aviso acender. O canhão e o vapor se desviam andando.', 'Abra uma válvula lateral para expor as juntas verdes; fora da janela a armadura não toma dano.', 'Fase 3: destrua os dois acumuladores dourados do peito, depois atire nas juntas. Há reserva limitada junto ao painel.'],
  interactables(X, add) {
    const { S, L, P } = X, f = S.flags, b = S.boss;
    for (let i = 0; i < 2; i++) if (!S.fort.off[i]) add(L.interact['cannon' + i], i ? 'Sabotar canhão de muralha leste' : 'Sabotar canhão de muralha oeste', () => { disableCannon(S.fort, i); X.sfx.explosion(); X.fx.sparks(V(i ? 17 : -17, 4.6, 46), 0xffa040, 30, 5, .7); applyWorld(X); X.toast(f.batteries_off ? 'CANHÕES CALADOS • PORTÃO ABERTO' : 'CANHÃO SABOTADO'); if (f.batteries_off) X.say('ÍRIS-9', 'Portão liberado. O pátio está cheio — use as caixas como cobertura.'); });
    if (!f.anchor_taken) add(L.interact.anchor, 'Pegar a Âncora do Oeste', () => { if (!f.yard_cleared) { X.toast('Limpe o pátio antes de revistar o salão'); return; } f.anchor_taken = true; S.archives.push('west_anchor'); X.sfx.power(); applyWorld(X); X.toast('ÂNCORA DO OESTE RECUPERADA', 2.6); X.say('ÍRIS-9', 'A âncora estabiliza o Oeste. Sem ela a Companhia perdeu o ponto de apoio. A fornalha está liberada.'); X.say('GAEL', 'Pesa mais do que parece. Como tudo que uma pessoa cobra caro.'); });
    if (!S.secrets.includes('ledger')) add(L.interact.ledger, 'Ler o livro de ponto apagado', () => { S.secrets.push('ledger'); S.archives.push('erased_ledger'); X.openDoc({ k: 'ALOJAMENTO • LIVRO DE PONTO', t: 'Nomes riscados', b: 'Página após página, nomes riscados com tinta de ferro. Ao lado de cada um, o mesmo carimbo: "APAGADO — CARGA TEMPORAL N.º 3".\n\nBenedito Sá, mineiro. Irene Vaz, pianista. Dois xerifes. Uma criança de nove anos.\n\nNenhum dos nomes tem data de morte. Só uma data de remoção: o dia em que o relógio da cidade parou.' }); });
    if (!S.secrets.includes('cache')) add(L.interact.cache, 'Abrir caixa escondida do desfiladeiro', () => { S.secrets.push('cache'); P.ammo.ammo9 = Math.min(135, P.ammo.ammo9 + 30); S.pecas += 45; X.sfx.pickup(); X.toast('SEGREDO • 45 PEÇAS + RESERVA 9 mm'); });
    if (!f.boss_started && !f.boss_defeated) add(L.interact.start, 'Abrir a fornalha — Marechal Ferrugem', () => {
      if (!f.anchor_taken) { X.toast('Recupere a Âncora do Oeste no salão do Marechal'); return; }
      X.saveCheckpoint('cp02'); startFerrugem(b); f.boss_started = true; applyWorld(X); X.sfx.power(); X.sfx.stinger?.();
      X.say('MARECHAL FERRUGEM', 'Eu apaguei um vale inteiro para que o relógio batesse certo. Você não vai me atrasar.'); X.say('ÍRIS-9', 'Avisos no piso. Abra as válvulas laterais para expor as juntas; pule nos golpes baixos.');
    });
    if (b.active && b.phase < 3 && !b.duel) for (let i = 0; i < 2; i++) add(L.interact['valve' + i], (i ? 'Abrir válvula leste' : 'Abrir válvula oeste') + (b.valveCooldown[i] > 0 ? ' • resfriando' : ''), () => { if (exposeFerrugem(b, 'valve' + i)) { X.sfx.power(); X.toast('JUNTAS EXPOSTAS • ATIRE', 2.2); X.fx.sparks(V(b.x, 5, b.z - 2), 0x6dffb8, 24, 4, .7); applyWorld(X); } else X.toast(b.mode === 'exposed' ? 'Juntas já expostas' : 'Válvula resfriando • tente a outra'); });
    if (b.active && S.supplyUses < 3) add(L.interact.supply, 'Retirar reserva do painel (' + (3 - S.supplyUses) + ' restantes)', () => { if (S.supplyCooldown > 0) { X.toast('Dispensador recarregando • ' + Math.ceil(S.supplyCooldown) + ' s'); return; } S.supplyUses++; S.supplyCooldown = 16; P.ammo.rifle = Math.min(40, (P.ammo.rifle || 0) + 4); P.ammo.shells = Math.min(30, P.ammo.shells + 4); P.ammo.ammo9 = Math.min(135, P.ammo.ammo9 + 15); X.sfx.pickup(); X.toast('+4 FERROVIA • +4 CARTUCHOS • +15 9 mm'); });
    if (f.boss_defeated && !f.photo_read) add(L.interact.photo, 'Ler o registro na mesa do Marechal', () => {
      f.photo_read = true; S.archives.push('false_photograph'); S.secrets.includes('false_photo') || S.secrets.push('false_photo');
      X.openDoc({ k: 'FORTE MEIA-NOITE • MESA DO MARECHAL', t: 'A fotografia que nunca foi tirada', b: 'Uma fotografia de fundação de Poeira Alta, datada de 1888. Quatorze pessoas posam diante do relógio da torre.\n\nAo lado, a cópia que a Companhia mandou para o futuro: onze pessoas. Três silhuetas foram recortadas e o fundo repintado com tinta de museu.\n\nAnotação do Marechal: "O vale não perdeu três pessoas. Perdeu a lembrança delas. Isso é mais barato."\n\nNo verso, a mesma caligrafia da assinatura que apareceu no reator de Nova Aurora.' });
      X.say('ÍRIS-9', 'A cópia no museu de Nova Aurora é esta. Quem apagou as três pessoas está nos dois tempos.');
    });
  },
  onShootCollider(X, c, dmg, point) {
    if (!c.bossPart) return; const b = X.S.boss, old = b.hp, wasDuel = b.duel, hit = hitFerrugem(b, c.bossPart, dmg);
    if (hit) { X.fx.flash(point || V(b.x, 5, b.z - 3), .5, .1, c.bossPart.startsWith('accum') ? 0xffb24a : 0x6dffad); X.sfx.hit(); if (!wasDuel && b.duel) { X.say('ÍRIS-9', 'Acumuladores destruídos! O motor ficou exposto — termine o duelo!'); X.fx.shake(.25); X.sfx.explosion(); } applyWorld(X); }
    if (old > 0 && b.hp === 0) finishBoss(X); return hit;
  },
  onGroupDone(X, id) { if (id === 'eg80') X.S.flags.canyon_cleared = true; if (id === 'eg81') { X.S.flags.yard_cleared = true; applyWorld(X); } },
  tick(X, dt) {
    const { S, L, P } = X, f = S.flags, b = S.boss, p = P.body.pos;
    if (p.y < -3) { X.fallRecover(lastSafe); return; }
    if (P.body.grounded && p.y >= 0 && p.z >= -9 && p.z <= 190 && !(p.z > 56 && p.z < 62 && !f.batteries_off)) lastSafe = p.clone();
    S.supplyCooldown = Math.max(0, S.supplyCooldown - dt);
    if (S.checkpointId === 'cp00' && p.z > 62 && f.batteries_off) X.saveCheckpoint('cp01');
    if (!f.boss_started && !f.boss_defeated && f.anchor_taken && p.z > 111 && S.checkpointId !== 'cp02') X.saveCheckpoint('cp02');
    // canhões de muralha: só ameaçam quem está no desfiladeiro
    const inZone = !f.batteries_off && p.z > 4 && p.z < 58;
    for (const e of stepFort(S.fort, dt, p, inZone)) {
      if (e.kind === 'warn') { X.sfx.horn?.(); L.fortRings[e.i].position.set(e.x, p.y + .06, e.z); L.fortRings[e.i].visible = true; }
      if (e.kind === 'shell') { L.fortRings[e.i].visible = false; X.sfx.explosion(); X.fx.shake(.1); X.fx.sparks(V(e.x, .3, e.z), 0xffa040, 22, 5, .5); if (shellHits(e, p)) X.damagePlayer(e.damage, V(e.i ? 17 : -17, 4.8, 47)); }
    }
    if (!inZone) for (const m of L.fortRings) m.visible = false;
    for (const e of stepFerrugem(b, dt, p)) {
      if (e.kind === 'attack') {
        const from = V(b.x - 3.4, 6, b.z - 3);
        const clear = e.pattern !== 'cannon' || lineOfSight(from.x, from.y, from.z, p.x, p.y + 1, p.z);
        if (attackHits(e, p) && clear) X.damagePlayer(e.damage, e.pattern === 'stomp' ? V(b.x, .5, b.z) : from);
        L.bossView.impact.position.set(e.x, e.y + 1.5, e.z); L.bossView.impact.userData.life = .5; X.sfx.explosion(); X.fx.shake(e.pattern === 'stomp' ? .16 : .08);
      }
      if (e.kind === 'phase') {
        applyWorld(X);
        if (e.phase === 2) { X.say('ÍRIS-9', 'A armadura rachou e a arena enche de vapor! As caixas de cobertura estouraram — mexa-se.'); X.startGroup('eg82'); }
        else { X.say('ÍRIS-9', 'O motor está blindado por dois acumuladores dourados no peito. Quebre os dois primeiro!'); X.startGroup('eg83'); }
      }
      if (e.kind === 'duel') X.say('MARECHAL FERRUGEM', 'Sem vapor, sem armadura. Só eu e você.');
    }
    if (b.mode === 'dead') finishBoss(X); L.bossView.sync(b);
  },
  frame(X, dt, t, sim) { const { L, S } = X; L.bossView.frame(S.boss, sim ? dt : 0, t); if (S.flags.boss_defeated) L.exitGlow.rotation.z += sim ? dt * .5 : 0; L.furnaceGlow.material.color.setHex(Math.sin(t * 5) > .3 ? 0xff7a28 : 0xff5a18); L.anchor.rotation.y += sim ? dt * .8 : 0; for (let i = 0; i < 2; i++) { const v = L.valves[i]; v.material = S.boss.mode === 'exposed' ? L.M.neonGreen : (S.boss.valveCooldown[i] > 0 || (S.boss.phase === 3 && S.boss.active)) ? L.M.neonAmber : L.M.neonCyan; } },
  bossHud(X) {
    const b = X.S.boss; if (!b.active) return null;
    const a = b.mode === 'warning' ? ({ cannon: 'CANHÃO A VAPOR • SAIA DA MARCA', stomp: 'PISÃO • PULE (ESPAÇO)', chain: 'CORRENTES • PULE', vent: 'JATOS • ENTRE NAS FRESTAS' })[b.pattern] : b.mode === 'exposed' ? 'JUNTAS EXPOSTAS • ATIRE' : b.mode === 'transition' ? 'ARMADURA ROMPIDA' : b.duel ? 'DUELO • ATIRE NAS JUNTAS' : b.phase === 3 ? `DESTRUA OS ACUMULADORES (${Number(b.accum[0] <= 0) + Number(b.accum[1] <= 0)}/2)` : 'BLINDADO • ABRA UMA VÁLVULA';
    return { name: 'MARECHAL FERRUGEM', hp: b.hp, maxHp: b.maxHp, phase: b.phase, text: a || 'BLINDADO • ABRA UMA VÁLVULA', exposed: b.mode === 'exposed' || b.duel };
  },
  menuCam(t, cam) { cam.position.set(-16 + Math.sin(t * .1) * 4, 9, 126); cam.lookAt(0, 5, 158); return V(0, 4, 156); },
  resultsText: (X) => `Ato II concluído. ${X.S.pecas} Peças Cronais. Marechal Ferrugem derrotado, Âncora do Oeste recuperada. Próximo destino do GDD: Ato III, ainda não implementado.`,
  onComplete(X, campaign) { campaign.flags.act2_complete = true; campaign.flags.west_anchor = true; campaign.flags.photo_false_record = !!X.S.flags.photo_read; },
};
export default mission;
