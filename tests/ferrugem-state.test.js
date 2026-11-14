import test from 'node:test';
import assert from 'node:assert/strict';
import { createFerrugem, startFerrugem, exposeFerrugem, hitFerrugem, stepFerrugem, attackHits, createFort, stepFort, disableCannon, shellHits, FERRUGEM } from '../src/missions/ferrugem-state.js';
const P = { x: 0, y: 0, z: 140 };
const run = (b, s, p = P) => { const ev = []; for (let t = 0; t < s; t += 1 / 30) ev.push(...stepFerrugem(b, 1 / 30, p)); return ev; };
test('Ferrugem: blindado até abrir a válvula; janela limita o dano e válvula esfria', () => {
  const b = createFerrugem(); assert.equal(hitFerrugem(b, 'joint', 100), 0); startFerrugem(b);
  assert.equal(hitFerrugem(b, 'joint', 100), 0, 'fechado');
  assert.ok(exposeFerrugem(b, 'valve0')); assert.equal(exposeFerrugem(b, 'valve0'), false);
  assert.equal(hitFerrugem(b, 'joint', 100), 100); assert.equal(hitFerrugem(b, 'joint', 100), 30); assert.equal(hitFerrugem(b, 'joint', 100), 0);
  assert.equal(b.hp, FERRUGEM.hp - 130);
});
test('Ferrugem: ataques são avisados antes e cobrem os padrões da fase', () => {
  const b = createFerrugem(); startFerrugem(b); const seen = new Set(); let warned = 0;
  for (let i = 0; i < 600; i++) { if (b.mode === 'warning') warned++; for (const e of stepFerrugem(b, 1 / 30, P)) if (e.kind === 'attack') seen.add(e.pattern); }
  assert.ok(warned > 20); assert.deepEqual([...seen].sort(), ['cannon', 'stomp']);
});
test('Ferrugem: pisão e correntes são desviados pulando; canhão e vapor por distância', () => {
  assert.ok(attackHits({ pattern: 'stomp', x: 0, y: 0, z: 160, radius: 9 }, { x: 0, y: 0, z: 155 }));
  assert.equal(attackHits({ pattern: 'stomp', x: 0, y: 0, z: 160, radius: 9 }, { x: 0, y: 1.2, z: 155 }), false);
  assert.ok(attackHits({ pattern: 'chain', x: 0, y: 0, z: 140, radius: 1.5 }, { x: 10, y: 0, z: 140.5 }));
  assert.equal(attackHits({ pattern: 'chain', x: 0, y: 0, z: 140, radius: 1.5 }, { x: 10, y: 1.1, z: 140 }), false);
  assert.ok(attackHits({ pattern: 'cannon', x: 3, y: 0, z: 140, radius: 3.5 }, { x: 4, y: 0, z: 141 }));
  assert.equal(attackHits({ pattern: 'cannon', x: 3, y: 0, z: 140, radius: 3.5 }, { x: 9, y: 0, z: 141 }), false);
  const v = { pattern: 'vent', y: 0, radius: 4.2, spots: [[0, 140], [-11, 140], [11, 140]] };
  assert.ok(attackHits(v, { x: 11, y: 0, z: 140 })); assert.equal(attackHits(v, { x: 5.5, y: 0, z: 140 }), false);
});
test('Ferrugem: três fases, vapor na fase 2, acumuladores na 3 e duelo final até a derrota', () => {
  const b = createFerrugem(); startFerrugem(b);
  const window = () => { b.mode = 'recover'; b.valveCooldown = [0, 0]; assert.ok(exposeFerrugem(b, 'valve0')); };
  for (let n = 0; n < 4; n++) { window(); hitFerrugem(b, 'joint', 130); }
  assert.equal(b.phase, 2); assert.equal(b.mode, 'transition'); assert.ok(b.steam);
  assert.equal(run(b, 4).find((e) => e.kind === 'phase').phase, 2);
  for (let n = 0; n < 4; n++) { window(); hitFerrugem(b, 'joint', 130); }
  assert.equal(b.phase, 3); assert.equal(b.hp, FERRUGEM.hp - 2 * FERRUGEM.phaseHp);
  run(b, 4); assert.equal(exposeFerrugem(b, 'valve0'), false, 'fase 3 não usa válvula');
  b.mode = 'recover'; assert.equal(hitFerrugem(b, 'joint', 50), 0, 'motor protegido');
  assert.equal(hitFerrugem(b, 'accum0', 60), 60); assert.equal(hitFerrugem(b, 'accum0', 60), 40); assert.equal(hitFerrugem(b, 'accum0', 60), 0);
  assert.equal(b.duel, false); hitFerrugem(b, 'accum1', 100); assert.ok(b.duel); assert.equal(b.mode, 'stagger');
  assert.ok(run(b, 3).some((e) => e.kind === 'duel'));
  for (let i = 0; i < 20 && b.mode !== 'dead'; i++) hitFerrugem(b, 'joint', 60);
  assert.equal(b.mode, 'dead'); assert.equal(b.hp, 0); assert.equal(b.active, false);
  assert.deepEqual(stepFerrugem(b, .1, P), []);
});
test('Canhões de muralha: avisam, disparam no local marcado e silenciam ao desativar', () => {
  const F = createFort(); const ev = []; for (let t = 0; t < 12; t += .1) ev.push(...stepFort(F, .1, { x: 0, y: 0, z: 30 }, true));
  const warn = ev.find((e) => e.kind === 'warn'), shell = ev.find((e) => e.kind === 'shell');
  assert.ok(warn && shell && shell.x === warn.x); assert.ok(shellHits(shell, { x: 1, y: 0, z: 30 })); assert.equal(shellHits(shell, { x: 9, y: 0, z: 30 }), false);
  assert.ok(disableCannon(F, 0)); assert.equal(disableCannon(F, 0), false); disableCannon(F, 1);
  const none = []; for (let t = 0; t < 12; t += .1) none.push(...stepFort(F, .1, { x: 0, y: 0, z: 30 }, true)); assert.equal(none.length, 0);
});
