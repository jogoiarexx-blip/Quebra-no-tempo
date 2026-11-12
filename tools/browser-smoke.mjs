import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server = spawn('python3', ['-m', 'http.server', '8080', '--bind', '127.0.0.1'], {stdio:'ignore'});
let browser;
try {
  for(let i=0;i<40;i++) {try {await fetch('http://127.0.0.1:8080/');break;} catch {await new Promise(r=>setTimeout(r,100));}}
  browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror', e=>errors.push(String(e)));
  page.on('console', m=>{if(m.type()==='error' && !m.text().includes('404'))errors.push(m.text());});
  await page.goto('http://127.0.0.1:8080/');
  await page.waitForFunction(()=>window.QNT?.ui.mode==='menu', null, {timeout:60000});
  for(const mission of ['A1-M1','A1-M2']) {
    await page.evaluate(id=>{QNT.input.touchMode=true;QNT.startMission(id,null);},mission);
    await page.waitForTimeout(1000);
    const result=await page.evaluate(()=>({id:QNT.mission.id,mode:QNT.ui.mode,gate:QNT.gate.group.children.length,actions:Object.keys(QNT.P.actor.actions),programs:QNT.G.renderer.info.programs.length}));
    assert.equal(result.id,mission);assert.equal(result.mode,'play');assert.ok(result.gate>=7);assert.ok(result.programs>0);
    assert.ok(result.actions.includes('CrouchIdle') && result.actions.includes('CrouchWalk'));
    const cast=await page.evaluate(()=>({
      enemies:QNT.enemies.list.filter(e=>e.type==='E01').map(e=>e.actor.assetName),
      jill:QNT.L.jill && {asset:QNT.L.jill.actor.assetName,position:QNT.L.jill.home.toArray(),animation:QNT.L.jill.actor.current}
    }));
    assert.ok(cast.enemies.length>0 && cast.enemies.every(n=>n==='E01'),'reptiliano deve substituir o E01');
    if(mission==='A1-M2') {
      assert.equal(cast.jill.asset,'jill');assert.deepEqual(cast.jill.position,[-12.2,0,34.2]);assert.equal(cast.jill.animation,'Idle');
      await page.evaluate(()=>{const q=QNT;q.P.hp=10000;q.enemies.clear();q.enemies.spawnGroup('qa-cast',{units:[{type:'E01',x:1,y:0,z:25,role:'flank',path:[[1,28],[3,30]]}]});});
      await page.waitForTimeout(1000);
      const enemy=await page.evaluate(()=>{const e=QNT.enemies.activeAlive() && QNT.enemies.list.find(e=>e.active && e.type==='E01');return e&&{asset:e.actor.assetName,clip:e.actor.current,hp:e.hp,hand:e.actor.bones.RightHand!=null};});
      assert.equal(enemy.asset,'E01');assert.ok(enemy.hand);assert.ok(enemy.hp>0);
      await page.evaluate(()=>QNT.enemies.list.find(e=>e.active&&e.type==='E01').damage(999,'head',null));
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>QNT.enemies.activeAlive()),0);
      console.log('Elenco e combate OK',cast,enemy);
    }
    console.log('WebGL OK',result);
  }
  assert.deepEqual(errors,[],'Erros de execução ou compilação WebGL');
} finally {await browser?.close();server.kill();}
