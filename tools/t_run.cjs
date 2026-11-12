// Percurso automatizado A1-M1 (teleporte + interações reais + combate real por dano direto).
module.exports = async (p, shot) => {
  const ev = (f, a) => p.evaluate(f, a);
  const tp = (x, y, z, yaw = 0) => ev(([x, y, z, yaw]) => { QNT.P.body.pos.set(x, y, z); QNT.P.body.vel.set(0, 0, 0); QNT.P.yaw = yaw; QNT.P.pitch = -0.05; }, [x, y, z, yaw]);
  const use = (txt) => ev((txt) => { const it = QNT.interactables().find((i) => i.text.includes(txt)); if (!it) return 'NO:' + txt; it.use(); return 'ok'; }, txt);
  const state = () => ev(() => JSON.stringify({ z: +QNT.P.body.pos.z.toFixed(1), y: +QNT.P.body.pos.y.toFixed(2), hp: Math.round(QNT.P.hp), obj: QNT.objective(), seals: QNT.G.S.seals, cp: QNT.G.S.checkpointId, done: QNT.G.S.groupsDone, alive: QNT.enemies.activeAlive(), flags: Object.keys(QNT.G.S.flags).join(',') }));
  const killAll = () => ev(() => QNT.enemies.all.forEach((e) => e.active && e.alive && e.damage(999, 'torso')));
  const w = (ms) => ev((n) => { for (let i = 0; i < n; i++) QNT.tick(1 / 60); }, Math.round(ms * 0.06));   // simulação determinística
  const log = async (l) => console.log(l, await state());
  await p.click('#bNew'); await p.click('[data-diff=mercenario]'); await w(800); await ev(() => (QNT.P.iframe = 1e9));
  await tp(-4.6, 0.01, 8, 1.5); await w(300); console.log(await use('Abrir arm')); await w(600); await log('pistol');
  await tp(0, 0.01, 18, 0); await w(1500); await log('alley trig'); await shot('alley');
  await w(3500); await log('alley fight 3.5s'); await shot('alley2');
  await killAll(); await w(800); await tp(0, 0.01, 42.5); await w(500); await log('cp01');
  await tp(0, 0.01, 47); await w(2500); await shot('avenue'); await tp(0, 0.01, 58); await w(2500); await shot('bus'); await log('avenue');
  await killAll(); await w(500);
  await tp(-5, 0.01, 84); await w(400); await shot('store'); await tp(-11, 0.01, 88); await w(200); console.log(await use('fusível')); await tp(-4.4, 0.01, 91.4); await w(200); console.log(await use('gerador')); await w(1500); await log('generator');
  await tp(-7, 0.01, 99, 0); await w(800); await shot('plaza');
  await tp(-15, 0.01, 109.5, 1.57); await w(300); console.log(await use('interfone')); await w(800); await shot('vespera');
  await tp(-9, 0.01, 117, 1.57); await w(600); await shot('sol');
  await w(11000); await log('ambush'); await tp(4, 0.01, 112, 0); await w(1500); await shot('ambush');
  console.log('eco', await ev(() => JSON.stringify({ ch: QNT.P.eco.charges, buf: QNT.P.eco.buf.length })));
  await killAll(); await w(1500); await log('plaza done');
  await tp(0, 4.01, 134); await w(500); await log('cp02'); await shot('walkway');
  await tp(0, 4.61, 166); await w(1200); await log('yard trig'); await tp(0, 4.01, 173); await w(1500); await shot('yard'); await killAll(); await w(500);
  await tp(0, 4.01, 187); await w(1500); await log('cp03'); await shot('sub'); await killAll(); await w(400);
  // A1M1-014: Fenda sem selos suficientes/energia
  await tp(0, 4.2, 211.5); await w(300); console.log('gate early:', await use('Fenda')); await log('gate early');
  await tp(-10.8, 4.01, 197); await w(200); console.log(await use('disjuntor A')); await tp(10.8, 4.01, 206); await w(200); console.log(await use('disjuntor B')); await w(1200);
  await tp(0, 4.01, 207.6); await w(200); console.log(await use('terminal')); await w(400); await log('armed');
  await tp(0, 4.2, 211.5); await w(500); await shot('gate');
  // A1M1-015: falha de gravação simulada
  await ev(() => QNT.setSimulateSaveFailure(true)); console.log(await use('Fenda')); await w(2600); await log('after failed save'); console.log('ui', await ev(() => JSON.stringify(QNT.ui)));
  await ev(() => QNT.setSimulateSaveFailure(false)); console.log(await use('Fenda')); await w(2800); console.log('ui', await ev(() => JSON.stringify(QNT.ui)), await ev(() => JSON.stringify(QNT.store.campaign))); await shot('results');
};
