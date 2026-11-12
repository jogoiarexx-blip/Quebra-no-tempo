// A1-M2 de ponta a ponta: conversa, painel, apagão, Eco, invasão (combate real), corredor (agachar/saltar com teclas),
// câmera, backup, elevador, relés, trem, Fenda; e rotas opcionais (jukebox → VIP → cofre; banheiro → grade → duto).
module.exports = async (p, shot) => {
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => {
    const I = QNT.input, P = QNT.P;
    window.T = {
      sim(n, fn) { for (let i = 0; i < n; i++) { if (fn) fn(i); QNT.tick(1 / 60); I.pressed.clear(); } },
      tp(x, y, z, yaw = 0) { P.body.pos.set(x, y, z); P.body.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = -0.05; QNT.updateCamera(1 / 60); },
      use(t) { const it = QNT.interactables().find((i) => i.text.includes(t)); if (!it) return 'NO:' + t; it.use(); return 'ok'; },
      st() { const S = QNT.G.S, q = P.body.pos; return JSON.stringify({ pos: [+q.x.toFixed(1), +q.y.toFixed(2), +q.z.toFixed(1)], hp: Math.round(P.hp), obj: QNT.objective(), seals: S.seals, cp: S.checkpointId, done: S.groupsDone, alive: QNT.enemies.activeAlive(), eco: [P.eco.unlocked, P.eco.charges], holster: P.holster }); },
      fight(maxTicks = 3000) {   // mira de verdade (yaw/pitch a partir da câmera) e atira
        let n = 0; I.lmb = true;
        while (n++ < maxTicks) {
          const es = QNT.enemies.all.filter((e) => e.active && e.alive && e.spawnT <= 0); if (!es.length) break;
          const e = es.sort((a, b) => a.body.pos.distanceTo(P.body.pos) - b.body.pos.distanceTo(P.body.pos))[0];
          QNT.updateCamera(1 / 60); const c = P.camPos, t = e.body.pos, h = e.type === 'DRONE' ? 0 : 1.15;
          P.yaw = Math.atan2(t.x - c.x, t.z - c.z); P.pitch = Math.atan2(t.y + h - c.y, Math.hypot(t.x - c.x, t.z - c.z)); QNT.updateCamera(1 / 60); P.inputLock = 0;
          if (P.weapons.martelo9.mag === 0 && P.ammo.ammo9 === 0) P.ammo.ammo9 = 60;
          T.sim(1);
        }
        I.lmb = false; if (n >= maxTicks) return 'TIMEOUT ' + QNT.enemies.all.filter((e) => e.active && e.alive).map((e) => `${e.type}@${e.group}(${e.body.pos.x.toFixed(1)},${e.body.pos.y.toFixed(1)},${e.body.pos.z.toFixed(1)}) st=${e.state} spawnT=${e.spawnT.toFixed(1)}`).join(' ; '); return n;
      },
      shootAt(v, ticks = 90) { I.lmb = true; for (let i = 0; i < ticks; i++) { QNT.updateCamera(1 / 60); const c = P.camPos; P.yaw = Math.atan2(v.x - c.x, v.z - c.z); P.pitch = Math.atan2(v.y - c.y, Math.hypot(v.x - c.x, v.z - c.z)); QNT.updateCamera(1 / 60); P.inputLock = 0; T.sim(1); } I.lmb = false; },
    };
  });
  const log = async (l) => console.log(l.padEnd(18), await ev(() => T.st()));
  await ev(() => { QNT.startMission('A1-M2', null); QNT.P.iframe = 1e9; });
  // 01 entrada → Basso → Sol → painel
  console.log('basso', await ev(() => { T.tp(-9.6, 0.01, 31, -Math.PI / 2); T.sim(5); return T.use('Falar com Basso'); }));
  console.log('fire while holstered:', await ev(() => { const s0 = QNT.G.S.stats.shots; QNT.input.lmb = true; T.sim(30); QNT.input.lmb = false; return QNT.G.S.stats.shots - s0; }));
  console.log('sol', await ev(() => { T.tp(0, 0.01, 34.3, 0); T.sim(5); return T.use('Falar com Sol'); }));
  await ev(() => { T.tp(4, 0.01, 30, 0.1); QNT.P.pitch = 0.18; T.sim(30); }); await p.waitForTimeout(800); await shot('m2_show');
  console.log('panel', await ev(() => { T.tp(13.2, 2.41, 44.5, Math.PI / 2); T.sim(5); const sig = QNT.G.S.signal, wrong = (sig + 1) % 4, names = ['CIANO', 'ÂMBAR', 'MAGENTA', 'VERDE'];
    const a = T.use('Cortar canal ' + names[wrong]); const b = T.use('Cortar canal ' + names[sig]); T.sim(60); return [a, b, QNT.G.S.flags.panel_solved, QNT.L.spots[wrong].cut > 0].join(','); }));
  await log('panel solved');
  await ev(() => T.sim(60 * 6)); await log('blackout');
  console.log('npcs', await ev(() => QNT.L.npcs.map((n) => n.state[0]).join('')));
  console.log('stabilize', await ev(() => { T.tp(10.6, 2.41, 45.8, 0); T.sim(3); return T.use('Estabilizar'); }));
  await log('stabilized');
  await ev(() => T.sim(60 * 5)); await log('invasion start');
  await ev(() => { T.tp(-9.2, 0.01, 32.5, Math.PI); T.sim(10); }); await p.waitForTimeout(700); await shot('m2_invasion');
  console.log('ticks fight1', await ev(() => T.fight(1500)));
  console.log('transmitter', await ev(() => { T.tp(0, 0.01, 31, Math.PI); T.sim(5); T.shootAt(new (QNT.L.transmitter.group.position.constructor)(0, 0.8, 27), 200); return [QNT.L.transmitter.alive, QNT.L.transmitter.hp].join(','); }));
  await ev(() => T.sim(60 * 3));
  console.log('ticks fight2', await ev(() => { let t = 0; for (let k = 0; k < 4; k++) { t += T.fight(1500); T.sim(60 * 2); } return t; }));
  await log('after invasion');
  console.log('flags', await ev(() => JSON.stringify({ cleared: QNT.G.S.flags.invasion_cleared, door: !QNT.L.doors.door_service.col.enabled, kills: QNT.G.S.stats.kills, hits: QNT.G.S.stats.hits, shots: QNT.G.S.stats.shots })));
  // corredor de serviço com teclado: agachar sob a viga, levantar, saltar a estante
  console.log('corridor', await ev(() => { const I = QNT.input, P = QNT.P; T.tp(16.8, 0.01, 30.5, 0); T.sim(5); I.keys.add('KeyW'); let crouched = 0, stood = 0, jumped = 0, maxZ = 0;
    T.sim(60 * 12, () => { const z = P.body.pos.z; maxZ = Math.max(maxZ, z);
      if (z > 36.6 && !crouched) { I.pressed.add('KeyC'); crouched = 1; }
      if (z > 39.4 && crouched && !stood) { I.pressed.add('KeyC'); stood = 1; }
      if (z > 43.2 && !jumped && P.body.grounded) { I.pressed.add('Space'); I.keys.add('Space'); jumped = 1; }
      if (jumped === 1 && z > 44.6) { I.keys.delete('Space'); jumped = 2; } });
    I.keys.clear(); return JSON.stringify({ maxZ: +maxZ.toFixed(1), crouch: P.crouch, y: +P.body.pos.y.toFixed(2) }); }));
  console.log('standing under beam blocked:', await ev(() => { const I = QNT.input, P = QNT.P; T.tp(16.8, 0.01, 36.5, 0); P.crouch = false; P.body.h = 1.8; I.keys.add('KeyW'); T.sim(90); I.keys.clear(); return P.body.pos.z.toFixed(2); }));
  // câmera de segurança: ser visto chama dois inimigos
  console.log('camera', await ev(() => { T.tp(8, 0.01, 53, -Math.PI / 2); T.sim(240); return JSON.stringify({ alarm: !!QNT.G.S.flags.cam_alarm, active: [...QNT.X.activeGroups.keys()] }); }));
  await p.waitForTimeout(500); await shot('m2_backstage');
  console.log('fight cam', await ev(() => { T.sim(120); return T.fight(2000); }));
  console.log('backup', await ev(() => { T.tp(15.8, 0.01, 61.2, Math.PI / 2); T.sim(5); return T.use('backup'); }));
  await ev(() => T.sim(90)); await log('backup');
  console.log('elevator', await ev(() => { T.tp(-12, 0.01, 62, 0); T.sim(30); const r = T.use('elevador'); T.sim(60 * 5); return r; }));
  await log('metro');
  await ev(() => { T.tp(-12.5, -8.99, 70, 0); QNT.P.pitch = 0.05; T.sim(30); }); await p.waitForTimeout(600); await shot('m2_tunnel');
  for (const [i, z] of [[1, 80], [2, 104], [3, 128]]) {
    console.log('relay' + i, await ev(([i, z]) => { T.tp(-15.0, -8.99, z, -Math.PI / 2); T.sim(20); return T.use('Religar relé ' + i); }, [i, z]));
    if (i === 2) console.log('fight tunnel', await ev(() => { T.tp(-12, -8.99, 98, 0); T.sim(60); return T.fight(3000); }));
  }
  await ev(() => { T.tp(-12, -8.99, 120, 0); T.sim(60 * 7); }); await log('train');
  console.log('fight platform', await ev(() => { T.sim(90); return T.fight(3000); }));
  await ev(() => { T.tp(-12, -8.84, 147.5, 0); T.sim(10); }); await p.waitForTimeout(600); await shot('m2_gate');
  console.log('gate', await ev(() => T.use('Fenda')));
  await ev(() => T.sim(60 * 2.5)); await p.waitForTimeout(800); await shot('m2_results');
  console.log('end', await ev(() => JSON.stringify({ ui: QNT.ui.stack, camp: QNT.store.campaign })));
  // ---- rotas opcionais numa nova partida ----
  await ev(() => { QNT.startMission('A1-M2', null); QNT.P.iframe = 1e9; });
  console.log('vip', await ev(() => { T.tp(6.4, 0.01, 16.1, Math.PI / 2); T.sim(5); const a = T.use('Teclado'); T.tp(12.5, 0.01, 24.2, Math.PI); T.sim(5); for (let k = 0; k < 5; k++) T.use('Jukebox'); const tr = QNT.G.S.jukebox; T.tp(6.4, 0.01, 16.1, Math.PI / 2); T.sim(5); const b = T.use('3-0-1'); T.sim(60); T.tp(13.4, 0.01, 15.5, Math.PI / 2); T.sim(5); const c = T.use('cofre'); QNT.back(); T.sim(60); return [a, tr, b, c, QNT.G.S.seals.join('+'), QNT.G.S.secrets.join('+')].join(' | '); }));
  console.log('vent', await ev(() => { const I = QNT.input, P = QNT.P; T.tp(-19.4, 0.01, 46.8, 0); T.sim(10); T.use('Arrancar a grade'); T.sim(10); const gr = QNT.G.S.destroyed.includes('grate');
    I.pressed.add('KeyC'); T.sim(5); I.keys.add('KeyW'); T.sim(60 * 3.2); P.yaw = Math.PI / 2; T.sim(60 * 3.0); I.keys.clear(); return JSON.stringify({ grate: gr, pos: [P.body.pos.x.toFixed(1), P.body.pos.z.toFixed(1)], sector: QNT.mission.sectorAt(P.body.pos), crouch: P.crouch }); }));
  console.log('melee', await ev(() => { QNT.enemies.clear(); T.tp(0, 0.01, 30, 0); QNT.X.startGroup('eg11'); T.sim(260); const e = QNT.enemies.all.find((x) => x.active && x.alive && x.body.pos.x > -14 && x.body.pos.z > 23); if (!e) return 'no enemy';
    QNT.G.S.flags.bracelet_stabilized = true; QNT.P.holster = false; const ep = e.body.pos; T.tp(ep.x, 0.01, ep.z - 1.4, 0); QNT.P.facing = 0; const hp0 = e.hp; QNT.input.pressed.add('KeyF'); T.sim(2); return `${hp0.toFixed(0)} -> ${e.hp.toFixed(0)} stagger ${e.stagger.toFixed(2)}`; }));
};
