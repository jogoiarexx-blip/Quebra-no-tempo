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
    console.log('WebGL OK',result);
  }
  assert.deepEqual(errors,[],'Erros de execução ou compilação WebGL');
} finally {await browser?.close();server.kill();}
