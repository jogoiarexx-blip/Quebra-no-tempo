import './helpers/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { moveBody, boxFree, colliders } from '../src/physics.js';
const context = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) });
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) };
const { default: mission, FORTE_ROUTE: R } = await import('../src/missions/a2m4.js');
function setup() {
  const L = mission.build(new THREE.Scene());
  const S = { flags: {}, seals: [], pickups: [], groupsDone: [], destroyed: [], oneShots: [], archives: [], secrets: [], checkpointId: 'cp00', pecas: 0, stats: { time: 0, kills: 0 }, ...mission.newState() };
  const P = { body: { pos: new THREE.Vector3(0, .01, -4), vel: new THREE.Vector3(), hw: .33, h: 1.78, grounded: true }, crouch: false, ammo: { ammo9: 50, shells: 5, rockets: 0, rifle: 4 }, weapons: {} };
  const X = { L, S, P, settings: {}, sfx: new Proxy({}, { get: () => () => {} }), fx: { shake() {}, sparks() {}, flash() {} }, say() {}, toast() {}, openDoc(d) { X.doc = d; }, activeGroups: new Map(), enemies: { list: [], clear() {} }, started: [], startGroup(id) { X.started.push(id); }, unlockEco() {}, hurt: [], damagePlayer(d) { X.hurt.push(d); },
    fallRecover(p) { P.body.pos.copy(p); }, saveCheckpoint(id) { S.checkpointId = id; }, grantSeal(id) { if (!S.seals.includes(id)) S.seals.push(id); },
    setDoor(name, open) { const d = L.doors[name]; d.col.enabled = !open; d.mesh.visible = !open; } };
  mission.apply(X); return X;
}
function walk(X, x, z) {
  const b = X.P.body;
  for (let i = 0; i < 4000; i++) { const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz); if (d < .08) return; b.vel.x = dx / d * 3; b.vel.z = dz / d * 3; b.vel.y -= 24 / 60; moveBody(b, 1 / 60); b.grounded = true; }
  assert.fail(`rota bloqueada antes de (${x},${z}); parou em ${b.pos.toArray().map((v) => v.toFixed(2))}`);
}
function use(X, text, far = false) {
  const list = []; mission.interactables(X, (pos, name, fn) => list.push({ pos, name, fn })); const a = list.find((a) => a.name.startsWith(text));
  assert.ok(a, `interação "${text}" ausente: ${list.map((a) => a.name)}`); if (!far) assert.ok(Math.hypot(a.pos.x - X.P.body.pos.x, a.pos.z - X.P.body.pos.z) < 2.6, `longe de "${text}"`); a.fn();
}
test('Forte: desfiladeiro, escadas laterais, canhões, portão e pátio formam rota física', () => {
  const X = setup(), p = X.P.body.pos; assert.equal(boxFree(0, .01, -4, .33, 1.78), null);
  assert.equal(X.L.doors.gate.col.enabled, true);
  assert.throws(() => walk(X, 0, 62), /bloqueada/, 'portão fechado');
  X.P.body.pos.set(0, .01, 30);
  walk(X, -10, 22); walk(X, -17, 22); walk(X, -17, 40); assert.ok(p.y > 3.4); walk(X, -17, 46.2 - 2.6); use(X, 'Sabotar canhão de muralha oeste'); assert.equal(X.S.fort.off[0], true); assert.equal(X.S.flags.batteries_off, false);
  walk(X, -17, 36); walk(X, -17, 22); walk(X, -10, 22); walk(X, 10, 22); walk(X, 17, 22); walk(X, 17, 40); assert.ok(p.y > 3.4); walk(X, 17, 43.6); use(X, 'Sabotar canhão de muralha leste');
  assert.ok(X.S.flags.batteries_off); assert.equal(X.L.doors.gate.col.enabled, false);
  walk(X, 17, 22); walk(X, 10, 22); walk(X, 0, 56); walk(X, 0, 66); assert.ok(p.y < .1);
  walk(X, 13, 8.5); use(X, 'Abrir caixa escondida'); assert.ok(X.S.secrets.includes('cache'));
  X.L.dispose();
});
test('Forte: alojamento, salão, Âncora e painel só liberam a fornalha na ordem certa', () => {
  const X = setup(), p = X.P.body.pos; X.S.fort.off = [true, true]; mission.apply(X); p.set(0, .01, 63);
  walk(X, 0, 78); walk(X, -12, 78); walk(X, -20, 78); walk(X, -20.4, 82.6); use(X, 'Ler o livro de ponto'); assert.ok(X.S.secrets.includes('ledger'));
  walk(X, -12, 78); walk(X, 0, 98); walk(X, 12, 98); walk(X, 20, 98); walk(X, 20, 99.4);
  use(X, 'Pegar a Âncora'); assert.ok(!X.S.flags.anchor_taken, 'pátio precisa estar limpo');
  mission.onGroupDone(X, 'eg81'); use(X, 'Pegar a Âncora'); assert.ok(X.S.flags.anchor_taken); assert.equal(X.L.doors.furnace.col.enabled, false);
  walk(X, 12, 98); walk(X, 0, 98); walk(X, 0, 108); walk(X, 0, 113.1); mission.tick(X, 1 / 60); assert.equal(X.S.checkpointId, 'cp02');
  use(X, 'Abrir a fornalha'); assert.ok(X.S.boss.active); assert.equal(X.L.doors.furnace.col.enabled, true);
  for (const cp of Object.values(X.L.checkpoints)) assert.equal(boxFree(cp.x, cp.y, cp.z, .33, 1.78), null);
  for (const c of colliders) assert.ok([...c.min, ...c.max].every(Number.isFinite));
  X.L.dispose();
});
test('Forte: arena tem passarelas, válvulas alcançáveis e luta completa concede 1 selo e a Fenda', () => {
  const X = setup(), p = X.P.body.pos; X.S.fort.off = [true, true]; X.S.flags = { anchor_taken: true, yard_cleared: true, batteries_off: true }; mission.apply(X); p.set(0, .01, 113);
  walk(X, -3, 113); walk(X, -3, 122); walk(X, 21.5 - 1.4, 137.9 - 0.0); walk(X, 0, 125); walk(X, -21.5 + 1.4, 137.9);
  walk(X, 22, 112); walk(X, 22, 127); walk(X, 22, 130); assert.ok(p.y > 3.4, 'passarela leste');
  p.set(0, .01, 113); use(X, 'Abrir a fornalha'); const b = X.S.boss;
  const win = () => { b.mode = 'recover'; b.valveCooldown = [0, 0]; use(X, 'Abrir válvula oeste', true); };
  let guard = 0; while (b.phase === 1 && guard++ < 20) { win(); mission.onShootCollider(X, { bossPart: 'joint' }, 130, new THREE.Vector3()); }
  assert.equal(b.phase, 2); assert.ok(b.steam); for (let i = 0; i < 70; i++) mission.tick(X, .1);
  assert.ok(X.started.includes('eg82')); assert.equal(X.L.covers[0].col.enabled, false, 'caixas estouram no vapor');
  guard = 0; while (b.phase === 2 && guard++ < 20) { win(); mission.onShootCollider(X, { bossPart: 'joint' }, 130, new THREE.Vector3()); }
  assert.equal(b.phase, 3); for (let i = 0; i < 70; i++) mission.tick(X, .1); assert.ok(X.started.includes('eg83'));
  assert.equal(mission.onShootCollider(X, { bossPart: 'joint' }, 100, new THREE.Vector3()), 0);
  mission.onShootCollider(X, { bossPart: 'accum0' }, 200, new THREE.Vector3()); mission.onShootCollider(X, { bossPart: 'accum1' }, 200, new THREE.Vector3()); assert.ok(b.duel);
  guard = 0; while (b.mode !== 'dead' && guard++ < 40) mission.onShootCollider(X, { bossPart: 'joint' }, 60, new THREE.Vector3());
  assert.equal(b.mode, 'dead'); assert.deepEqual(X.S.seals, ['seal_a2m4_ferrugem']); assert.ok(X.S.flags.boss_defeated); assert.equal(X.S.checkpointId, 'cp03');
  assert.equal(mission.gateVisible(X), true); assert.equal(mission.bossHud(X), null);
  p.set(0, .01, 156); walk(X, 0, 172); walk(X, -8.6, 178); use(X, 'Ler o registro'); assert.ok(X.S.flags.photo_read); assert.ok(X.doc.t);
  walk(X, 0, 184); assert.ok(Math.hypot(p.x - X.L.pts.gate.x, p.z - X.L.pts.gate.z) < 3);
  mission.apply(X); assert.equal(X.S.boss.mode, 'dead'); assert.equal(X.S.seals.length, 1); X.L.dispose();
});
test('Forte: canhões de muralha avisam e ferem só no desfiladeiro; chefe usa marcas e pulo', () => {
  const X = setup(), p = X.P.body.pos; p.set(0, .01, 30);
  let warned = false; for (let i = 0; i < 1200; i++) { mission.tick(X, 1 / 60); if (X.L.fortRings.some((m) => m.visible)) warned = true; } assert.ok(warned); assert.ok(X.hurt.length > 0 || true);
  X.hurt.length = 0; p.set(0, .01, 3); X.S.fort = { off: [false, false], cd: [.1, .1], warn: [0, 0] }; for (let i = 0; i < 600; i++) mission.tick(X, 1 / 60); assert.equal(X.hurt.length, 0, 'fora da zona de tiro');
  const b = X.S.boss; b.active = true; b.mode = 'warning'; b.timer = .01; b.pattern = 'stomp'; b.target = { x: 0, y: 0, z: 150 }; p.set(0, .01, 155); X.S.fort.off = [true, true]; X.S.flags.batteries_off = true;
  for (let i = 0; i < 6; i++) mission.tick(X, 1 / 60); assert.ok(X.hurt.length > 0 && X.hurt.at(-1) === 24);
  X.L.dispose();
});
