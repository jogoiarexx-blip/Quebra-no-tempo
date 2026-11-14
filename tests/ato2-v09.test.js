import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from '../src/save.js';
import { createQuips, QUIP_LINES } from '../src/quips.js';
import { BRIEF, TIPS } from '../src/loading.js';
const data = new Map(); globalThis.localStorage = { getItem: (k) => data.get(k) || null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
test('save v0.9: Ato I concluído libera A2-M1; Poeira Alta libera Mina Treze sem perder flags', () => {
  data.set('quebra_no_tempo_v1', JSON.stringify({ saveSchemaVersion: 1, campaign: { completed: { 'A1-M4': { time: 900, seals: 1 } }, unlocked: ['A1-M1', 'A1-M2', 'A1-M3', 'A1-M4'], flags: { act1_complete: true, intro_seen: true }, pecasCronais: 10, rewardsGranted: {} } }));
  let s = loadAll(); assert.ok(s.campaign.unlocked.includes('A2-M1')); assert.ok(!s.campaign.unlocked.includes('A2-M2')); assert.equal(s.campaign.flags.intro_seen, true);
  data.set('quebra_no_tempo_v1', JSON.stringify({ saveSchemaVersion: 1, campaign: { completed: { 'A1-M4': {}, 'A2-M1': {} }, unlocked: ['A1-M1'], flags: { photo_saved_1888: true } } }));
  s = loadAll(); assert.ok(s.campaign.unlocked.includes('A2-M2')); assert.equal(s.campaign.flags.photo_saved_1888, true);
});
test('frases do Gael: respeitam o intervalo, abates múltiplos furam a fila e o interruptor desliga tudo', () => {
  const said = []; let on = true, now = 0, r = 0;
  const q = createQuips((w, t) => said.push(t), { enabled: () => on, now: () => now, random: () => (r = (r + .37) % 1), gap: 9 });
  q.tick(5); for (let i = 0; i < 10; i++) { q.onKill('E01'); now += 3; q.tick(.01); }
  const first = said.length; assert.ok(first >= 1 && first <= 3, String(first));
  q.tick(20); now += 20; q.onKill('E04'); q.onKill('E04'); assert.ok(said.length > first);
  for (let i = 1; i < said.length; i++) assert.notEqual(said[i], said[i - 1]);
  on = false; const n = said.length; q.tick(30); now += 30; q.onKill('E01'); q.onKill('E01'); assert.equal(said.length, n);
  for (const k of ['E04', 'E05', 'E06', 'multi']) assert.ok(QUIP_LINES[k].length >= 2);
});
test('telas de carregamento cobrem as seis missões e as dicas são curtas', () => {
  for (const id of ['A1-M1', 'A1-M2', 'A1-M3', 'A1-M4', 'A2-M1', 'A2-M2']) assert.ok(BRIEF[id] && BRIEF[id][1].length > 40, id);
  assert.ok(TIPS.length >= 12); for (const t of TIPS) assert.ok(t.length < 120, t);
});
test('Ferrovia: arma, munição própria, captura limitada e drop só depois de adquirir', async () => {
  const { WEAPONS, AMMO_CAP, normalizeArsenal, nextWeaponId } = await import('../src/weapon-data.js');
  const { applyResourcePickup, chooseEnemyDrop } = await import('../src/loot.js');
  assert.equal(WEAPONS.ferrovia.ammo, 'rifle'); assert.ok(WEAPONS.ferrovia.dmg > WEAPONS.martelo9.dmg * 2); assert.ok(WEAPONS.ferrovia.pierce > 0 && WEAPONS.ferrovia.pierce < 1);
  const p = normalizeArsenal({ weapons: { martelo9: { have: true } }, current: 'martelo9' }); assert.equal(p.ammo.rifle, 0); assert.equal(p.weapons.ferrovia.have, false);
  p.current = 'martelo9'; assert.equal(nextWeaponId(p), 'martelo9');
  const lim = { maxHealth: 100, maxArmor: 100, ammoCaps: AMMO_CAP, res: 1 }, P = { hp: 100, armor: 100, ammo: { ammo9: 135, shells: 0, rockets: 0, rifle: 38 }, weapons: p.weapons };
  assert.equal(applyResourcePickup(P, 'rifle', 12, lim), 2); assert.equal(P.ammo.rifle, 40);
  P.ammo.rifle = 0; assert.equal(chooseEnemyDrop('E06', P, lim, () => 0), null);
  P.weapons.ferrovia.have = true; assert.equal(chooseEnemyDrop('E06', P, lim, () => 0).type, 'rifle');
});
