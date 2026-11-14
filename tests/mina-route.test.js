import './helpers/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { moveBody, boxFree, raycast, colliders } from '../src/physics.js';
const context = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...args) => undefined, set: (o, k, v) => (o[k] = v, true) });
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) };
const { default: mission } = await import('../src/missions/a2m2.js');
const { cartAt, cartHits, CART, CHASE, hitTank, TANK_HP } = await import('../src/missions/mina-state.js');
function setup() {
  const L = mission.build(new THREE.Scene()), S = { flags: {}, seals: [], pickups: [], groupsDone: [], destroyed: [], oneShots: [], archives: [], secrets: [], checkpointId: 'cp00', pecas: 0, stats: { time: 0 }, ...mission.newState() };
  const P = { body: { pos: new THREE.Vector3(0, .01, 2), vel: new THREE.Vector3(), hw: .33, h: 1.78, grounded: true } };
  const X = { L, S, P, sfx: new Proxy({}, { get: () => () => {} }), fx: { shake() {}, sparks() {}, flash() {} }, say() {}, toast() {}, openDoc() {}, startGroup() {}, unlockEco() {}, damagePlayer() {}, fallRecover(p) { P.body.pos.copy(p); }, saveCheckpoint(id) { S.checkpointId = id; }, grantSeal(id) { if (!S.seals.includes(id)) S.seals.push(id); } };
  mission.apply(X); return X;
}
function walk(X, x, z, onStep) {
  const b = X.P.body;
  for (let i = 0; i < 2400; i++) { const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz); if (d < .08) return; b.vel.x = dx / d * 3; b.vel.z = dz / d * 3; b.vel.y -= 24 / 60; moveBody(b, 1 / 60); if (onStep) onStep(); }
  assert.fail(`rota bloqueada antes de (${x},${z}); parou em ${X.P.body.pos.toArray().map((v) => v.toFixed(2))}`);
}
function use(X, text) { const list = []; mission.interactables(X, (pos, name, fn) => list.push({ pos, name, fn })); const a = list.find((a) => a.name.startsWith(text)); assert.ok(a, `interação "${text}" ausente: ${list.map((a) => a.name)}`); assert.ok(a.pos.distanceTo(X.P.body.pos.clone().setY(a.pos.y)) < 2.5, `longe de ${text}`); a.fn(); }
const shoot = (X, id) => { for (let i = 0; i < 3; i++) mission.onShootCollider(X, { drillTank: id }, 24); };

test('Mina Treze: tanques, perseguição, represa, canal e elevador formam uma rota completa', () => {
  const X = setup(), p = X.P.body.pos;
  walk(X, 0, 45); walk(X, 2.4, 46.5); walk(X, 2.4, 50.5); walk(X, 0, 52); walk(X, 0, 60); walk(X, 0, 70); assert.equal(boxFree(0, .01, CART.z, .33, 1.78), null, 'trilho atravessável');
  walk(X, 0, 83); walk(X, -7.6, 83);
  use(X, 'Painel travado'); assert.equal(X.S.flags.drill_A, undefined);
  shoot(X, 'A0'); shoot(X, 'A1'); use(X, 'Desarmar a perfuratriz A'); assert.equal(X.S.flags.drill_A, true); assert.equal(X.S.seals.length, 0);
  walk(X, 0, 83); walk(X, 0, 96, () => mission.tick(X, 1 / 60)); assert.equal(X.S.flags.chase_started, true);
  walk(X, 0, 121, () => mission.tick(X, 1 / 60)); walk(X, 6.2, 121, () => mission.tick(X, 1 / 60));
  for (let i = 0; i < 60 * 14 && !X.S.flags.chase_done; i++) mission.tick(X, 1 / 60);
  assert.equal(X.S.flags.chase_done, true); assert.equal(X.L.rubble.col.enabled, false); assert.ok(X.L.drillBCol.enabled);
  walk(X, 3.0, 121); walk(X, 3.0, 135.5); assert.equal(hitTank(X.S, 'B0', 0), false);
  shoot(X, 'B0'); shoot(X, 'B1'); use(X, 'Desarmar a perfuratriz B'); assert.deepEqual(X.S.seals, ['seal_a2m2_drills']);
  walk(X, 3.0, 143); walk(X, 12, 166); walk(X, 18, 166); walk(X, 18, 150); assert.ok(p.y > 3.15, 'subiu à passarela'); walk(X, 17, 148);
  assert.ok(boxFree(0, .01, 168.2, .33, 1.78), 'canal bloqueado antes de drenar');
  use(X, 'Abrir a comporta'); assert.equal(X.S.seals.length, 2); assert.equal(X.L.flood.col.enabled, false);
  walk(X, 18, 150); walk(X, 18, 166); walk(X, 0, 166); walk(X, 0, 175); assert.ok(p.y < -3.5, 'desceu ao canal');
  walk(X, 0, 195); walk(X, 0, 205.4); assert.ok(Math.abs(p.y) < .05, 'subiu à plataforma do elevador');
  assert.ok(p.distanceTo(X.L.pts.gate) < 3.2); assert.equal(mission.requiredFlags.every((k) => X.S.flags[k]), true);
  X.L.dispose();
});
test('Mina Treze: galeria mineral exige agachar e conta como selo alternativo', () => {
  const X = setup();
  assert.ok(boxFree(-23, .01, 153, .33, 1.78)); assert.equal(boxFree(-23, .01, 153, .33, 1.05), null);
  X.S.flags.chase_done = true; mission.apply(X); X.P.body.pos.set(0, .01, 146); X.P.body.h = 1.05;
  walk(X, -18, 153); walk(X, -27, 153); walk(X, -32.2, 154); use(X, 'Recolher o núcleo'); assert.deepEqual(X.S.seals, ['seal_a2m2_ore']); assert.equal(X.S.pecas, 60);
  X.L.dispose();
});
test('Mina Treze: vagão tem aviso antes de passar; perseguição fere quem fica na pista e poupa o abrigo', () => {
  assert.equal(cartAt(CART.period - .5).warn, true); assert.equal(cartAt(CART.period - .5).x, null);
  assert.equal(cartAt(CART.travel + .5).warn, false);
  assert.equal(cartHits(CART.travel / 2, { x: 0, y: 0, z: CART.z }), true); assert.equal(cartHits(CART.travel / 2, { x: 0, y: 0, z: CART.z + 2 }), false);
  const X = setup(); const S = X.S; S.flags.chase_started = true; S.mine.chaseT = (110 - CHASE.z0) / CHASE.speed;
  let hurt = 0; X.damagePlayer = () => hurt++;
  X.P.body.pos.set(0, .01, 113); mission.tick(X, 1 / 60); assert.equal(hurt, 1);
  X.P.body.pos.set(6.2, .01, 121); S.mine.chaseT = (119 - CHASE.z0) / CHASE.speed; for (let i = 0; i < 120; i++) mission.tick(X, 1 / 60); assert.equal(hurt, 1);
  assert.equal(hitTank({ flags: {}, mine: { tanks: { A0: TANK_HP } } }, 'A0', TANK_HP), true);
  X.L.dispose();
});
test('Mina Treze: limites finitos, encontros dentro dos pools, checkpoints e recursos livres', () => {
  const X = setup();
  for (const c of colliders) assert.ok([...c.min, ...c.max].every(Number.isFinite));
  assert.equal(Object.values(X.L.groups).reduce((n, g) => n + g.units.length, 0), mission.enemiesTotal);
  const caps = { E01: 4, E02: 1, E04: 2, E05: 3, E06: 3, DRONE: 1 };
  for (const g of Object.values(X.L.groups)) for (const [type, cap] of Object.entries(caps)) assert.ok(g.units.filter((u) => u.type === type).length <= cap, type);
  for (const cp of Object.values(X.L.checkpoints)) assert.equal(boxFree(cp.x, cp.y, cp.z, .33, 1.78), null, JSON.stringify(cp));
  for (const pk of X.L.pickups) assert.equal(boxFree(pk.pos.x, pk.pos.y - .3, pk.pos.z, .2, .5), null, pk.id);
  for (const g of Object.values(X.L.groups)) for (const u of g.units) if (u.type !== 'DRONE') { const hit = raycast(u.x, u.y + 1, u.z, 0, -1, 0, 3); assert.ok(hit && hit.t > .9 && hit.t < 1.1, `${u.type} sem piso em ${u.x},${u.y},${u.z}`); }
  X.L.dispose();
});
