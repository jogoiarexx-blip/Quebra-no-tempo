import './helpers/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { moveBody, boxFree, colliders } from '../src/physics.js';
const context = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...args) => undefined, set: (o, k, v) => (o[k] = v, true) });
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) };
const { default: mission, CARS } = await import('../src/missions/a2m3.js');
const { newTrain, stepTrain, depart, startBridge, stopDistance, beamHits, TRAIN } = await import('../src/missions/trem-state.js');
function setup() {
  const L = mission.build(new THREE.Scene()), S = { flags: {}, seals: [], pickups: [], groupsDone: [], destroyed: [], oneShots: [], archives: [], secrets: [], checkpointId: 'cp00', pecas: 0, stats: { time: 0 }, ...mission.newState() };
  const P = { body: { pos: new THREE.Vector3(-6, 1.11, -8), vel: new THREE.Vector3(), hw: .33, h: 1.78, grounded: true }, crouch: false };
  const X = { L, S, P, enemies: { list: [] }, sfx: new Proxy({}, { get: () => () => {} }), fx: { shake() {}, sparks() {}, flash() {} }, say() {}, toast() {}, openDoc() {}, startGroup(id) { X.started.push(id); }, started: [], unlockEco() {}, hurt: 0, damagePlayer() { X.hurt++; },
    fallRecover(p) { P.body.pos.copy(p); X.recovered = (X.recovered || 0) + 1; }, saveCheckpoint(id) { S.checkpointId = id; }, grantSeal(id) { if (!S.seals.includes(id)) S.seals.push(id); } };
  mission.apply(X); return X;
}
function walk(X, x, z, tick = false) {
  const b = X.P.body;
  for (let i = 0; i < 2400; i++) { const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz); if (d < .08) return; b.vel.x = dx / d * 3; b.vel.z = dz / d * 3; b.vel.y -= 24 / 60; moveBody(b, 1 / 60); b.grounded = true; if (tick) mission.tick(X, 1 / 60); }
  assert.fail(`rota bloqueada antes de (${x},${z}); parou em ${X.P.body.pos.toArray().map((v) => v.toFixed(2))}`);
}
function use(X, text) { const list = []; mission.interactables(X, (pos, name, fn) => list.push({ pos, name, fn })); const a = list.find((a) => a.name.startsWith(text)); assert.ok(a, `interação "${text}" ausente: ${list.map((a) => a.name)}`); assert.ok(a.pos.distanceTo(X.P.body.pos.clone().setY(a.pos.y)) < 2.5, `longe de ${text}`); a.fn(); }

test('Trem: embarque, vagões, teto, escotilha, cabine, ponte e estação de chegada formam uma rota completa', () => {
  const X = setup(), p = X.P.body.pos, T = X.S.train;
  assert.equal(boxFree(-6, 1.11, -8, .33, 1.78), null);
  walk(X, -3, -5); walk(X, -3, -.8); assert.equal(T.phase, 'station');
  walk(X, 0, -.8, true); assert.equal(T.phase, 'run'); assert.equal(X.S.checkpointId, 'cp01');
  assert.ok(X.L.st0.userData.cols.every((c) => !c.enabled), 'a plataforma de partida fica para trás');
  walk(X, 0, 2); walk(X, 0, 13); walk(X, 0, 16); walk(X, 0, 29); walk(X, 0, 31.5); walk(X, 0, 35);
  use(X, 'Sabotar a carga'); assert.deepEqual(X.S.seals, ['seal_a2m3_cargo']);
  walk(X, -1, 39.6); walk(X, -1, 44.6); assert.ok(p.y > 4.0, 'subiu os caixotes'); walk(X, -1, 47); walk(X, 0, 52.6);
  use(X, 'Descer pela escotilha'); assert.ok(p.y < 1.4); walk(X, .5, 55.6); use(X, 'Pegar o selo'); assert.equal(X.S.seals.length, 2);
  walk(X, -.4, 50.2); use(X, 'Ler as cartas'); walk(X, 0, 53.6); use(X, 'Subir pela escotilha'); assert.ok(p.y > 4);
  walk(X, 0, 60); walk(X, 0, 62); walk(X, 0, 70.3); assert.ok(Math.abs(p.y - 1.2) < .05, 'desceu o carvão até o engate');
  walk(X, 1, 74.2); use(X, 'Núcleo do reator'); assert.equal(X.S.flags.loco_neutralized, undefined);
  walk(X, -1.1, 74.2); use(X, 'Fechar a válvula'); walk(X, 1, 74.2); use(X, 'Arrancar o núcleo'); assert.equal(X.S.seals.length, 3); assert.equal(T.phase, 'bridge'); assert.ok(X.started.includes('eg75'));
  for (let i = 0; i < 60 * 25 && T.phase !== 'stopped'; i++) mission.tick(X, 1 / 60);
  assert.equal(T.phase, 'stopped'); assert.equal(X.S.flags.train_stopped, true); assert.equal(T.car1, 'gone');
  assert.ok(X.L.st1.userData.cols.every((c) => c.enabled)); assert.ok(X.L.car1.userData.cols.every((c) => !c.enabled));
  walk(X, 0, 70.3); walk(X, 2.6, 70.3); assert.ok(p.y > 1.05 && p.y < 1.15, 'desceu na plataforma'); walk(X, 6, 50);
  assert.ok(p.distanceTo(X.L.pts.gate) < 2.6); assert.equal(mission.requiredFlags.every((k) => X.S.flags[k]), true);
  X.L.dispose();
});
test('Trem: viga só fere em pé no teto, queda volta ao vagão e o vagão de trás nunca leva Gael junto', () => {
  const X = setup(), T = X.S.train, p = X.P.body.pos;
  depart(T); T.speed = 16; T.beamZ = 50; p.set(0, 4.11, 50);
  X.P.crouch = true; mission.tick(X, 1 / 60); assert.equal(X.hurt, 0);
  T.beamZ = 50; X.P.crouch = false; mission.tick(X, 1 / 60); assert.equal(X.hurt, 1);
  p.set(0, 1.21, 20); X.P.body.grounded = true; mission.tick(X, 1 / 60); p.set(5, .01, 20); mission.tick(X, 1 / 60); assert.equal(X.recovered, 1); assert.ok(Math.abs(p.x) < 2);
  startBridge(T); p.set(0, 1.21, 6); for (let i = 0; i < 60 * 5; i++) mission.tick(X, 1 / 60); assert.ok(p.z > CARS.c1[1], 'teleportado para o vagão 2'); assert.notEqual(T.car1, 'attached');
  X.L.dispose();
});
test('Trem: regras puras — partida, vigas com aviso e chegada alinhada', () => {
  const T = newTrain(); assert.deepEqual(stepTrain(T, 1), []); assert.equal(T.dist, 0); depart(T);
  const ev = []; for (let i = 0; i < 60 * 40; i++) ev.push(...stepTrain(T, 1 / 60, true, () => 0));
  assert.ok(ev.indexOf('beamWarn') >= 0 && ev.indexOf('beamWarn') < ev.indexOf('beamStart'));
  assert.ok(Math.abs(T.speed - TRAIN.cruise) < 1e-6);
  assert.equal(beamHits({ beamZ: 10 }, { z: 10, y: 4.11 }, false), true); assert.equal(beamHits({ beamZ: 10 }, { z: 10, y: 1.21 }, false), false);
  startBridge(T); let left = null, d0 = null;
  for (let i = 0; i < 60 * 30 && T.phase !== 'stopped'; i++) { const e = stepTrain(T, 1 / 60); if (e.includes('arrive')) { left = T.arriveLeft; d0 = T.dist; } }
  assert.equal(T.phase, 'stopped'); assert.ok(Math.abs((T.dist - d0) - left) < .3, 'a estação desliza exatamente a distância de frenagem');
  assert.ok(Math.abs(stopDistance(12) - 48) < 1e-9);
});
test('Trem: limites finitos, encontros dentro dos pools, checkpoints e recursos sobre piso', () => {
  const X = setup();
  for (const c of colliders) assert.ok([...c.min, ...c.max].every(Number.isFinite));
  assert.equal(Object.values(X.L.groups).reduce((n, g) => n + g.units.length, 0), mission.enemiesTotal);
  const caps = { E01: 4, E02: 1, E04: 2, E05: 3, E06: 3, DRONE: 1 };
  for (const g of Object.values(X.L.groups)) for (const [type, cap] of Object.entries(caps)) assert.ok(g.units.filter((u) => u.type === type).length <= cap, type);
  X.S.train.phase = 'stopped'; mission.apply(X);
  for (const cp of Object.values(X.L.checkpoints)) assert.equal(boxFree(cp.x, cp.y, cp.z, .33, 1.78), null, JSON.stringify(cp));
  X.S.train.phase = 'station'; mission.apply(X);
  for (const g of Object.values(X.L.groups)) for (const u of g.units) if (u.type !== 'DRONE') assert.equal(boxFree(u.x, u.y + .01, u.z, .36, 1.8), null, `${u.type} preso em ${u.x},${u.y},${u.z}`);
  for (const pk of X.L.pickups) assert.equal(boxFree(pk.pos.x, pk.pos.y - .3, pk.pos.z, .2, .5), null, pk.id);
  X.L.dispose();
});
