module.exports = async (p, shot) => {
  const ev = (f, a) => p.evaluate(f, a);
  await p.click('#bNew'); await p.click('[data-diff=mercenario]');
  await ev(() => { window.T = { sim(n) { for (let i = 0; i < n; i++) { QNT.tick(1 / 60); QNT.input.pressed.clear(); } } };
    QNT.G.S.flags.got_pistol = true; QNT.G.S.flags.alley_open = true; QNT.P.weapons.martelo9.have = true; QNT.P.current = 'martelo9'; QNT.P.ammo.ammo9 = 60; QNT.P.iframe = 1e9;
    QNT.P.body.pos.set(0, 0.01, 47); QNT.P.yaw = 0.25; QNT.input.rmb = true; T.sim(100); QNT.input.lmb = true; T.sim(14); QNT.input.lmb = false; while (QNT.ui.stack.length) QNT.back(); });
  await p.waitForTimeout(1200); await ev(() => { while (QNT.ui.stack.length) QNT.back(); }); await p.waitForTimeout(600); await shot('aim');
  await ev(() => { QNT.input.rmb = false; QNT.enemies.clear(); QNT.G.S.groupsDone.push('eg02'); QNT.P.yaw = -1.25; QNT.P.pitch = 0.22; QNT.P.body.pos.set(-7.5, 0.01, 116.2); T.sim(20); while (QNT.ui.stack.length) QNT.back(); });
  await p.waitForTimeout(1500); await ev(() => { while (QNT.ui.stack.length) QNT.back(); }); await p.waitForTimeout(500); await shot('stage');
  console.log(await ev(() => JSON.stringify({ stack: QNT.ui.stack, locked: QNT.input.locked, free: QNT.input.freeLook })));
};
