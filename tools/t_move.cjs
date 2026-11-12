// Travessia real por entrada simulada (A1M1-004) + Eco + queda + checkpoint (A1M1-002/013) + mira.
module.exports = async (p, shot) => {
  const ev = (f, a) => p.evaluate(f, a);
  await p.click('#bNew'); await p.click('[data-diff=mercenario]');
  await ev(() => { window.T = { sim(n, fn) { for (let i = 0; i < n; i++) { if (fn) fn(i); QNT.tick(1 / 60); QNT.input.pressed.clear(); } },
    pos() { const q = QNT.P.body.pos; return [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), QNT.P.state]; } }; });
  // --- passarela: 10 tentativas
  const res = await ev(() => { const out = []; const I = QNT.input;
    for (let k = 0; k < 10; k++) {
      QNT.P.body.pos.set((k % 3 - 1) * 0.4, 4.01, 137.5); QNT.P.body.vel.set(0, 0, 0); QNT.P.yaw = 0; QNT.P.hp = 100; I.keys.clear(); I.keys.add('KeyW'); QNT.G.S.groupsDone.push('eg05');
      let fell = false, hp0 = QNT.P.hp, jumps = [143.2 - k * 0.05, 152.0 - k * 0.04, 159.3 - k * 0.05], ji = 0, hold = 0;
      T.sim(60 * 9, () => { const z = QNT.P.body.pos.z; if (ji < 3 && z > jumps[ji] && QNT.P.body.grounded) { I.pressed.add('Space'); I.keys.add('Space'); hold = 40; ji++; } if (hold > 0 && --hold === 0) I.keys.delete('Space'); if (QNT.P.hp < hp0) fell = true; });
      out.push((fell ? 'FELL ' : 'ok ') + T.pos().join(','));
    } I.keys.clear(); return out; });
  console.log('walkway runs:\n ' + res.join('\n '));
  // --- queda no fosso
  console.log('pit:', await ev(() => { QNT.P.body.pos.set(0, 4.01, 141); T.sim(30); QNT.P.body.pos.set(0, 3.9, 145.3); QNT.P.hp = 100; T.sim(120); return T.pos().join(',') + ' hp ' + QNT.P.hp; }));
  // --- Eco Cronal
  console.log('eco:', await ev(() => { const I = QNT.input; QNT.P.body.pos.set(0, 0.01, 104); QNT.P.yaw = 0; T.sim(10); QNT.P.eco.charges = 1; I.keys.add('KeyW'); T.sim(150); I.keys.clear(); const a = T.pos(); I.pressed.add('KeyQ'); T.sim(2); const b = T.pos(); I.pressed.add('KeyQ'); T.sim(2); return JSON.stringify({ a, b, charges: QNT.P.eco.charges, hp: QNT.P.hp }); }));
  // --- checkpoint: salvar, recarregar página, continuar
  await ev(() => { QNT.G.S.flags.got_pistol = true; QNT.G.S.flags.alley_open = true; QNT.P.weapons.martelo9.have = true; QNT.P.current = 'martelo9'; QNT.P.ammo.ammo9 = 33; QNT.grantSeal('seal_a1m1_shop', QNT.P.body.pos); QNT.grantSeal('seal_a1m1_shop', QNT.P.body.pos); QNT.G.S.pickups.push('pk_alley_ammo'); QNT.P.body.pos.set(1, 0.01, 60); QNT.saveCheckpoint('cp01'); });
  await p.reload(); await p.waitForFunction('window.QNT && window.QNT.ui.mode==="menu"');
  console.log('continue info:', await p.textContent('#contInfo'));
  await p.click('#bCont'); await p.waitForTimeout(500);
  console.log('after reload:', await ev(() => JSON.stringify({ pos: QNT.P.body.pos, seals: QNT.G.S.seals, ammo: QNT.P.ammo, cur: QNT.P.current, door: QNT.L.doors.door_alley.col.enabled, pk: QNT.G.S.pickups })));
  // --- pause/doc 30x (A1M1-006)
  console.log('overlay:', await ev(() => { for (let i = 0; i < 30; i++) { QNT.back(); QNT.back(); } QNT.back(); const a = QNT.ui.stack.join(); QNT.back(); return a + ' -> ' + QNT.ui.stack.join() + ' layers on: ' + document.querySelectorAll('.layer.on').length; }));
  // --- postura de mira e tiro
  await ev(() => { window.T = { sim(n, fn) { for (let i = 0; i < n; i++) { if (fn) fn(i); QNT.tick(1 / 60); QNT.input.pressed.clear(); } } }; QNT.P.body.pos.set(0, 0.01, 47); QNT.P.yaw = 0.25; QNT.P.iframe = 1e9; QNT.input.rmb = true; T.sim(90); QNT.input.lmb = true; T.sim(20); });
  await p.waitForTimeout(700); await shot('aim');
  console.log('shots', await ev(() => JSON.stringify(QNT.G.S.stats)));
  await ev(() => { QNT.input.rmb = false; QNT.input.lmb = false; QNT.P.yaw = -1.57; QNT.P.body.pos.set(-8.5, 0.01, 117.8); QNT.enemies.clear(); T.sim(30); }); await p.waitForTimeout(900); await shot('sol');
};
