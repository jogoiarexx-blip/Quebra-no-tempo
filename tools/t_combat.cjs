// Combate real: mira no inimigo por yaw/pitch e atira com a Martelo-9 e a Trovão Duplo; barril; tiro contra parede (A1M1-003).
module.exports = async (p) => {
  const ev = (f, a) => p.evaluate(f, a);
  await p.click('#bNew'); await p.click('[data-diff=mercenario]');
  console.log(await ev(() => {
    const I = QNT.input, P = QNT.P, out = {};
    const sim = (n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); QNT.tick(1 / 60); I.pressed.clear(); } };
    const aimAt = (e, h) => { const c = P.camPos, t = e.body.pos; const dx = t.x - c.x, dy = t.y + h - c.y, dz = t.z - c.z; P.yaw = Math.atan2(dx, dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz)); };
    QNT.G.S.flags.got_pistol = true; P.weapons.martelo9.have = true; P.current = 'martelo9'; P.ammo.ammo9 = 90; P.iframe = 1e9;
    P.body.pos.set(0, 0.01, 18); sim(30);
    const es = QNT.enemies.all.filter((e) => e.active && e.alive); out.spawned = es.length;
    let t = 0; I.lmb = true;
    for (const e of es) { let n = 0; while (e.alive && n++ < 900) { QNT.updateCamera(1 / 60); aimAt(e, 1.15); QNT.updateCamera(1 / 60); P.inputLock = 0; sim(1); } t += n; }
    I.lmb = false; out.ticksToKillBoth = t; out.stats = { ...QNT.G.S.stats }; out.mag = P.weapons.martelo9.mag; out.done = QNT.G.S.groupsDone.slice(); sim(5); out.doorOpen = !QNT.L.doors.door_alley.col.enabled;
    // tiro colado na parede: não pode atravessar
    P.body.pos.set(-3.5, 0.01, 22); P.yaw = -1.57; P.pitch = 0; sim(20); QNT.updateCamera(0.1); const s0 = QNT.G.S.stats.hits; I.lmb = true; sim(30); I.lmb = false; out.wallShotHits = QNT.G.S.stats.hits - s0;
    return JSON.stringify(out);
  }));
};
