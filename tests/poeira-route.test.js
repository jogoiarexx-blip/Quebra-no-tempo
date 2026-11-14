import './helpers/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { moveBody, boxFree, colliders } from '../src/physics.js';
const context = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...args) => undefined, set: (o, k, v) => (o[k] = v, true) });
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) };
const { default: mission } = await import('../src/missions/a2m1.js');
const { pressPianoKey, stepDuel, startDuel, PIANO_ORDER } = await import('../src/missions/poeira-state.js');
const stubActor = () => ({ play() {}, current: 'Idle' });
const npc = (o) => ({ o, name: o.name, actor: stubActor(), visible: true, place() {}, reset() {}, talk() {}, panic() {}, hideSafe() { this.visible = false; }, setVisible(v) { this.visible = v; } });
function setup() {
  const X0 = { npc };
  const L = mission.build(new THREE.Scene(), X0), S = { flags: {}, seals: [], pickups: [], groupsDone: [], destroyed: [], oneShots: [], archives: [], secrets: [], checkpointId: 'cp00', pecas: 0, stats: { time: 0 }, ...mission.newState() };
  const P = { body: { pos: new THREE.Vector3(0, .01, 2), vel: new THREE.Vector3(), hw: .33, h: 1.78, grounded: true }, armor: 0, inputLock: 0 };
  const groups = [];
  const X = { L, S, P, settings: { difficulty: 'mercenario' }, sfx: new Proxy({}, { get: () => () => {} }), fx: { shake() {}, tracer() {}, flash() {}, sparks() {} }, say() {}, toast() {}, openDoc() {}, after(t, fn) { fn(); }, startGroup(id) { groups.push(id); }, unlockEco() {}, damagePlayer() {}, setHolster() {}, giveWeapon() {}, groups,
    fallRecover(p) { P.body.pos.copy(p); }, saveCheckpoint(id) { S.checkpointId = id; }, grantSeal(id) { if (!S.seals.includes(id)) S.seals.push(id); },
    setDoor(id, open) { const d = L.doors[id]; d.col.enabled = !open; d.mesh.position.y = open ? 3 : 0; } };
  mission.apply(X); return X;
}
function walk(X, x, z) {
  const b = X.P.body;
  for (let i = 0; i < 2400; i++) { const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz); if (d < .08) return; b.vel.x = dx / d * 3; b.vel.z = dz / d * 3; b.vel.y -= 24 / 60; moveBody(b, 1 / 60); }
  assert.fail(`rota bloqueada antes de (${x},${z}); parou em ${X.P.body.pos.toArray().map((v) => v.toFixed(2))}`);
}
function use(X, text) { const list = []; mission.interactables(X, (pos, name, fn) => list.push({ pos, name, fn })); const a = list.find((a) => a.name.startsWith(text)); assert.ok(a, `interação "${text}" ausente: ${list.map((a) => a.name)}`); assert.ok(a.pos.distanceTo(X.P.body.pos.clone().setY(a.pos.y)) < 2.5, `longe demais de ${text}`); a.fn(); }

test('Poeira Alta: rota principal saloon → relojoaria → duelo → torre é caminhável', () => {
  const X = setup(), p = X.P.body.pos;
  assert.equal(boxFree(0, .01, 2, .33, 1.78), null);
  walk(X, 0, 51); walk(X, -8.5, 51); assert.ok(p.y > .28 && p.y < .35, 'calçada a 0,3 m'); walk(X, -18.3, 51);
  use(X, 'Falar com Irene'); assert.ok(X.groups.includes('eg51'));
  mission.onGroupDone(X, 'eg51'); assert.deepEqual(X.S.seals, ['seal_a2m1_saloon']); assert.ok(X.S.flags.irene_told);
  walk(X, -8.5, 51); walk(X, 0, 51); walk(X, 0, 70); walk(X, 8.5, 70); walk(X, 21.2, 70);
  use(X, 'Acertar o relógio-mestre'); assert.equal(X.S.flags.clock_set, true);
  walk(X, 22.0, 70); use(X, 'Abrir o cofre'); assert.equal(X.S.seals.length, 2); assert.ok(X.groups.includes('eg52'));
  mission.onGroupDone(X, 'eg52'); assert.ok(X.S.flags.duel_ready);
  walk(X, 8.5, 70); walk(X, 0, 70); walk(X, 0, 142); use(X, 'Aceitar o duelo');
  assert.equal(X.S.duel.phase, 'count');
  let t = 0; while (X.S.duel.phase === 'count' && t < 10) { stepDuel(X.S, 1 / 60, false); t += 1 / 60; }
  assert.equal(X.S.duel.phase, 'draw'); assert.ok(t >= 3 && t <= 4.3);
  X.firePressed = () => false; mission.tick(X, 1 / 60); X.firePressed = () => true; mission.tick(X, 1 / 60); assert.equal(X.S.flags.duel_won, true); assert.equal(X.S.flags.duel_resolved, true);
  assert.equal(X.L.doors.tower_gate.col.enabled, false);
  walk(X, 0, 150); walk(X, 5.75, 150); walk(X, 5.75, 168.1); assert.ok(p.y > 3.55, 'chegou ao topo da escada'); walk(X, 5.75, 170.2); walk(X, .6, 170.2);
  assert.ok(Math.abs(p.y - 3.6) < .05); assert.ok(p.distanceTo(X.L.pts.gate) < 2.6);
  assert.equal(mission.requiredFlags.every((k) => X.S.flags[k]), true);
  X.L.dispose();
});
test('Poeira Alta: celeiro (selo alternativo) e caderno destravam a saída sem falar com Irene', () => {
  const X = setup(), p = X.P.body.pos;
  walk(X, 0, 60); walk(X, 0, 104); walk(X, -11.5, 104); walk(X, -11.5, 108); walk(X, -19, 108); assert.ok(p.y > 3.45, 'subiu os fardos até o celeiro');
  walk(X, -22.4, 101); walk(X, -22.4, 99); use(X, 'Abrir a caixa-forte'); assert.deepEqual(X.S.seals, ['seal_a2m1_stable']);
  walk(X, -22.4, 93); use(X, 'Guardar a chapa'); assert.ok(X.S.secrets.includes('photo_record'));
  walk(X, -22.4, 101); walk(X, -19, 108); walk(X, -11.5, 108); walk(X, -11.5, 104); walk(X, 0, 104); walk(X, 0, 70); walk(X, 8.5, 70); walk(X, 17, 65.2);
  use(X, 'Ler o caderno'); walk(X, 21.2, 70); use(X, 'Acertar o relógio-mestre'); walk(X, 22, 70); use(X, 'Abrir o cofre');
  assert.equal(X.S.seals.length, 2); assert.equal(X.S.flags.irene_talked, undefined);
  X.L.dispose();
});
test('Poeira Alta: duelo — atirar antes é desonra, depois da janela é lento; piano exige a ordem do cartaz', () => {
  const S = { flags: { duel_ready: true }, duel: { phase: 'idle' } };
  assert.equal(startDuel(S, () => 0), true); assert.equal(startDuel(S), false);
  for (let i = 0; i < 40; i++) stepDuel(S, 1 / 60, false); assert.deepEqual(stepDuel(S, 1 / 60, true), ['early']);
  const S2 = { flags: { duel_ready: true }, duel: { phase: 'idle' } }; startDuel(S2, () => 0);
  const ev = []; for (let i = 0; i < 60 * 5; i++) ev.push(...stepDuel(S2, 1 / 60, false)); assert.deepEqual(ev, ['bell', 'bell', 'draw', 'slow']);
  const P = { flags: {}, piano: [] };
  assert.equal(pressPianoKey(P, 0), 'wrong');
  for (const k of PIANO_ORDER.slice(0, 3)) assert.equal(pressPianoKey(P, k), 'ok');
  assert.equal(pressPianoKey(P, PIANO_ORDER[3]), 'solved'); assert.equal(P.flags.piano_solved, true); assert.equal(pressPianoKey(P, 1), 'ignored');
});
test('Poeira Alta: limites finitos, encontros dentro dos pools, checkpoints livres', () => {
  const X = setup();
  for (const c of colliders) assert.ok([...c.min, ...c.max].every(Number.isFinite));
  assert.equal(Object.values(X.L.groups).reduce((n, g) => n + g.units.length, 0), mission.enemiesTotal);
  const caps = { E01: 4, E02: 1, E04: 2, E05: 3, E06: 3, DRONE: 1 };
  for (const g of Object.values(X.L.groups)) for (const [type, cap] of Object.entries(caps)) assert.ok(g.units.filter((u) => u.type === type).length <= cap, type);
  for (const cp of Object.values(X.L.checkpoints)) assert.equal(boxFree(cp.x, cp.y, cp.z, .33, 1.78), null, JSON.stringify(cp));
  for (const pk of X.L.pickups) assert.equal(boxFree(pk.pos.x, pk.pos.y - .3, pk.pos.z, .2, .5), null, pk.id);
  X.L.dispose();
});
