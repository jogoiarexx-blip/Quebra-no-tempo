import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('qa/screenshots', {recursive:true});
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
      jill:QNT.L.jill && {asset:QNT.L.jill.actor.assetName,position:QNT.L.jill.home.toArray(),animation:QNT.L.jill.actor.current},
      bartenders:QNT.L.npcs.filter(n=>n.name==='Jill'||n.name==='Basso').map(n=>n.name)
    }));
    assert.ok(cast.enemies.length>0 && cast.enemies.every(n=>n==='E01'),'reptiliano deve substituir o E01');
    if(mission==='A1-M2') {
      assert.equal(cast.jill.asset,'jill');assert.deepEqual(cast.jill.position,[-12.4,0,31]);assert.equal(cast.jill.animation,'Idle');
      assert.deepEqual(cast.bartenders,['Jill']);
      const conversation=await page.evaluate(()=>{
        const q=QNT;q.P.body.pos.set(-8.5,.01,31);q.P.yaw=-Math.PI/2;q.P.pitch=0;q.P.camDist=3;q.P.holster=true;
        const it=q.interactables().find(i=>i.text==='Falar com Jill');
        const distance=it.pos.distanceTo(q.P.body.pos);it.use();
        return {distance,talked:q.G.S.flags.talked_basso,objective:q.objective()};
      });
      assert.ok(conversation.distance<2.5);assert.equal(conversation.talked,true);assert.match(conversation.objective,/Sol/);
      await page.waitForTimeout(400);await page.screenshot({path:'qa/screenshots/jill-bar.png'});
      const collection=await page.evaluate(()=>{
        const q=QNT;q.P.hp=90;q.P.armor=95;q.P.ammo.ammo9=134;q.P.ammo.shells=23;
        const results=['medkit','armor','ammo9','shells'].map(type=>q.collect(type,35));
        const full=['medkit','armor','ammo9','shells'].map(type=>q.collect(type,35));
        const shapeTypes=[...new Set(Object.values(q.pickupMeshes).map(m=>m.userData.pickupType))];
        q.collect('pecas',8);
        const pk=q.L.pickups.find(p=>p.type==='medkit');q.P.body.pos.set(pk.pos.x,pk.pos.y-.35,pk.pos.z);q.tick(1/60);
        const keptFull=!q.G.S.pickups.includes(pk.id)&&q.pickupMeshes[pk.id].visible;
        q.P.hp=60;q.tick(1/60);
        return {results,full,keptFull,collected:q.G.S.pickups.includes(pk.id),hidden:!q.pickupMeshes[pk.id].visible,shapeTypes};
      });
      assert.deepEqual(collection.results,[true,true,true,true]);assert.deepEqual(collection.full,[false,false,false,false]);
      assert.ok(collection.keptFull&&collection.collected&&collection.hidden);assert.ok(collection.shapeTypes.length>=5);
      // Reproduz o apagão pelo canal correto e verifica a postura ao restaurar o checkpoint.
      const blackout=await page.evaluate(()=>{
        const q=QNT;
        const button=q.interactables().filter(i=>i.text.startsWith('Cortar canal '))[q.G.S.signal];button.use();
        for(let i=0;i<340;i++)q.tick(1/60);
        const live=q.L.jill.actor.current;
        q.saveCheckpoint('cp01');q.restartCheckpoint();
        return {live,restored:q.L.jill.actor.current,talked:q.G.S.flags.talked_basso,npcs:q.L.npcs.filter(n=>n.name==='Jill'||n.name==='Basso').length};
      });
      assert.equal(blackout.live,'CrouchIdle');assert.equal(blackout.restored,'CrouchIdle');assert.equal(blackout.talked,true);assert.equal(blackout.npcs,1);
      await page.evaluate(()=>QNT.startMission('A1-M2',null));

      await page.evaluate(()=>{const q=QNT;q.P.hp=10000;q.P.body.pos.set(1,.01,22);q.P.yaw=0;q.P.pitch=0;q.enemies.clear();q.enemies.spawnGroup('qa-cast',{units:[{type:'E01',x:1,y:0,z:25,role:'flank',path:[[1,28],[3,30]]}]});});
      await page.waitForTimeout(1000);
      const enemy=await page.evaluate(()=>{const e=QNT.enemies.activeAlive() && QNT.enemies.list.find(e=>e.active && e.type==='E01');return e&&{asset:e.actor.assetName,clip:e.actor.current,hp:e.hp,hand:e.actor.bones.RightHand!=null};});
      assert.equal(enemy.asset,'E01');assert.ok(enemy.hand);assert.ok(enemy.hp>0);
      await page.screenshot({path:'qa/screenshots/reptiliano.png'});
      const loot=await page.evaluate(()=>{
        const q=QNT,random=Math.random;Math.random=()=>0;
        try {
          q.P.hp=30;q.enemies.list.find(e=>e.active&&e.type==='E01').damage(999,'head',null);
          const d=q.drops.at(-1);return d&&{type:d.type,amount:d.amount,y:d.pos.y,shape:d.mesh.userData.pickupType};
        } finally {Math.random=random;}
      });
      assert.equal(loot.type,'medkit');assert.equal(loot.amount,20);assert.equal(loot.shape,'medkit');assert.ok(Math.abs(loot.y-.35)<.1);
      const capped=await page.evaluate(()=>{
        const q=QNT,random=Math.random;Math.random=()=>0;
        try { for(let i=0;i<30;i++)q.G.hooks.onEnemyKilled({type:'DRONE',body:{pos:q.P.body.pos.clone().set(0,4,28)}}); }
        finally {Math.random=random;}
        return {count:q.drops.length,types:q.drops.map(d=>d.type),maxY:Math.max(...q.drops.map(d=>d.pos.y))};
      });
      assert.equal(capped.count,24);assert.ok(capped.types.every(t=>t==='pecas'));assert.ok(capped.maxY<.5);
      const rooftop=await page.evaluate(()=>{
        const q=QNT,random=Math.random;Math.random=()=>0;
        try {q.G.hooks.onEnemyKilled({type:'DRONE',body:{pos:q.P.body.pos.clone().set(0,4,18)}});return q.drops.at(-1).pos.y;}
        finally {Math.random=random;}
      });
      assert.ok(Math.abs(rooftop-4.25)<.01,'drone acima da recepção deve soltar peças sobre a cobertura de 3,90 m');
      await page.evaluate(()=>{QNT.restartCheckpoint();});
      assert.equal(await page.evaluate(()=>QNT.drops.length),0);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>QNT.enemies.activeAlive()),0);
      console.log('Elenco e combate OK',cast,enemy);
    }
    console.log('WebGL OK',result);
  }
  // Galeria de QA usa exatamente as malhas do jogo; nenhum asset de produção adicional.
  const gallery=await page.evaluate(async()=>{
    const THREE=await import('/vendor/three/three.module.min.js');
    const {createPickupMesh,PICKUPS}=await import('/src/pickups.js');
    const sc=new THREE.Scene();sc.background=new THREE.Color(0x101c29);sc.add(new THREE.HemisphereLight(0xffffff,0x8090a0,3));
    const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,5);sc.add(light);
    Object.keys(PICKUPS).forEach((type,i)=>{const m=createPickupMesh(type);m.position.x=(i-2.5)*1.1;m.scale.setScalar(1.3);m.rotation.y=.35;sc.add(m);});
    const cam=new THREE.OrthographicCamera(-3.6,3.6,2.025,-2.025,.01,100);cam.position.set(0,2.2,6);cam.lookAt(0,0,0);
    const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1280,720);r.render(sc,cam);
    r.domElement.style.cssText='position:fixed;inset:0;z-index:9999;width:100vw;height:100vh';document.body.append(r.domElement);
    const labels=document.createElement('div');labels.style.cssText='position:fixed;inset:62% 4% auto;z-index:10000;display:grid;grid-template-columns:repeat(6,1fr);text-align:center;color:white;font:16px sans-serif';
    Object.values(PICKUPS).forEach(d=>{const label=document.createElement('span');label.textContent=d.label;label.style.color='#'+d.color.toString(16).padStart(6,'0');labels.append(label);});document.body.append(labels);
    return {draws:r.info.render.calls,triangles:r.info.render.triangles};
  });
  assert.ok(gallery.draws<=24,'seis tipos de recurso devem caber em até 24 chamadas de desenho');
  console.log('Galeria de recursos',gallery);await page.screenshot({path:'qa/screenshots/pickups.png'});
  assert.deepEqual(errors,[],'Erros de execução ou compilação WebGL');
} finally {await browser?.close();server.kill();}
