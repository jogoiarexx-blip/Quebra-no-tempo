module.exports = async (p, shot) => {
  await p.waitForTimeout(1500); await shot('v2_menu');
  console.log(await p.evaluate(() => JSON.stringify({ mode: QNT.ui.mode, mission: QNT.mission.id, cont: document.getElementById('contInfo').textContent })));
  await p.click('#bNew'); await p.click('[data-diff=mercenario]'); await p.waitForTimeout(2500); await shot('v2_a1m1');
  console.log(await p.evaluate(() => JSON.stringify({ mode: QNT.ui.mode, obj: QNT.objective(), pos: QNT.P.body.pos })));
  await p.evaluate(() => QNT.startMission('A1-M2', null)); await p.waitForTimeout(3000); await shot('v2_a1m2');
  console.log(await p.evaluate(() => JSON.stringify({ mode: QNT.ui.mode, mission: QNT.mission.id, obj: QNT.objective(), holster: QNT.P.holster, npcs: QNT.L.npcs.length })));
};
