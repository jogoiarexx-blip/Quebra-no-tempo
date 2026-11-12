module.exports = async (p, shot) => {
  const ev = (f, a) => p.evaluate(f, a);
  await p.click('#bNew'); await p.click('[data-diff=mercenario]'); await p.waitForTimeout(500);
  await ev(() => { const P = QNT.P; QNT.G.S.flags.got_pistol = true; P.weapons.martelo9.have = true; P.current = 'martelo9'; P.ammo.ammo9 = 60; P.body.pos.set(0, 0.01, 6); });
  for (const [name, pitch, rmb] of [['down', -0.7, true], ['level', 0, true], ['up', 0.7, true], ['released', -0.7, false]]) {
    await ev((pitch) => { window.__aim = setInterval(() => { QNT.input.rmb = pitch[1]; QNT.P.pitch = pitch[0]; QNT.P.yaw = 0.9; QNT.input.mouseDX = 0; QNT.input.mouseDY = 0; while (QNT.ui.stack.length) QNT.back(); }, 5); }, [pitch, rmb]);
    await p.waitForTimeout(1200);
    console.log(name, await ev(() => JSON.stringify({ ads: QNT.P.ads, aimW: +QNT.P.actor.aimW.toFixed(2), lock: QNT.P.inputLock })));
    await shot('aim_' + name); await ev(() => clearInterval(window.__aim));
  }
};
