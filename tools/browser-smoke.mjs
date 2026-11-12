import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('qa/screenshots',{recursive:true});
const server=spawn('python3',['-m','http.server','8080','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:8080/');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],models=new Set();
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
 page.on('requestfinished',r=>{if(r.url().endsWith('.glb'))models.add(r.url().split('/').at(-1));});
 await page.goto('http://127.0.0.1:8080/');
 await page.waitForFunction(()=>window.QNT?.ui.mode==='menu',null,{timeout:90000});
 assert.ok(models.has('porco-policial.glb')&&models.has('boate.glb'),'novos GLB devem carregar de verdade');
 const start=async id=>{await page.evaluate(id=>{QNT.input.touchMode=true;QNT.startMission(id,null);},id);await page.waitForTimeout(750);};
 const shot=async name=>{await page.waitForTimeout(250);await page.screenshot({path:`qa/screenshots/${name}.png`});};
 for(const id of ['A1-M1','A1-M2','A1-M3']){
  await start(id);
  const info=await page.evaluate(()=>({id:QNT.mission.id,mode:QNT.ui.mode,gate:QNT.gate.group.children.length,actions:Object.keys(QNT.P.actor.actions),programs:QNT.G.renderer.info.programs.length,details:QNT.L.sceneryDetails?.stats}));
  assert.equal(info.id,id);assert.equal(info.mode,'play');assert.ok(info.gate>=7&&info.programs>0);assert.ok(info.actions.includes('CrouchIdle')&&info.actions.includes('CrouchWalk'));
  if(id!=='A1-M3'){assert.ok(info.details.triangles>2500&&info.details.triangles<=35000);assert.ok(info.details.drawCalls<=24);}
  const cast=await page.evaluate(()=>({e01:QNT.enemies.list.filter(e=>e.type==='E01').map(e=>e.actor.assetName),pig:QNT.enemies.list.find(e=>e.type==='E02').actor.mesh.geometry.index.count/3,jill:QNT.L.jill&&{asset:QNT.L.jill.actor.assetName,pos:QNT.L.jill.home.toArray(),clip:QNT.L.jill.actor.current},bartenders:QNT.L.npcs.filter(n=>n.name==='Jill'||n.name==='Basso').map(n=>n.name),maya:QNT.L.performers?.find(n=>n.name==='Maya')?.actor.assetName}));
  assert.ok(cast.e01.length>0&&cast.e01.every(n=>n==='E01'));assert.ok(cast.pig>=18000&&cast.pig<=22000);
  if(id==='A1-M1'){
   await shot('m1-oficina');
   await page.evaluate(()=>{QNT.P.hp=10000;QNT.P.body.pos.set(0,.01,44);QNT.P.yaw=0;QNT.P.pitch=.05;});await shot('m1-avenida');
  }
  if(id==='A1-M2'){
   assert.deepEqual(cast.bartenders,['Jill']);assert.deepEqual(cast.jill.pos,[-12.4,0,31]);assert.equal(cast.jill.clip,'BartenderIdle');assert.equal(cast.maya,'boate');
   const conversation=await page.evaluate(()=>{const q=QNT;q.P.body.pos.set(-8.5,.01,31);q.P.yaw=-Math.PI/2;q.P.pitch=0;q.P.holster=true;const i=q.interactables().find(i=>i.text==='Falar com Jill'),distance=i.pos.distanceTo(q.P.body.pos);i.use();return{distance,talked:q.G.S.flags.talked_basso,clip:q.L.jill.actor.current,obj:q.objective()};});
   assert.ok(conversation.distance<2.5);assert.equal(conversation.talked,true);assert.equal(conversation.clip,'Greeting');assert.match(conversation.obj,/Sol/);await shot('m2-jill-bar');
   const collection=await page.evaluate(()=>{const q=QNT;q.P.hp=90;q.P.armor=95;q.P.ammo.ammo9=134;q.P.ammo.shells=23;const results=['medkit','armor','ammo9','shells'].map(t=>q.collect(t,35)),full=['medkit','armor','ammo9','shells'].map(t=>q.collect(t,35));const pk=q.L.pickups.find(p=>p.type==='medkit');q.P.body.pos.set(pk.pos.x,pk.pos.y-.35,pk.pos.z);q.tick(1/60);const kept=!q.G.S.pickups.includes(pk.id);q.P.hp=60;q.tick(1/60);return{results,full,kept,collected:q.G.S.pickups.includes(pk.id),hidden:!q.pickupMeshes[pk.id].visible};});
   assert.deepEqual(collection.results,[true,true,true,true]);assert.deepEqual(collection.full,[false,false,false,false]);assert.ok(collection.kept&&collection.collected&&collection.hidden);
   const blackout=await page.evaluate(()=>{const q=QNT;const i=q.interactables().filter(i=>i.text.startsWith('Cortar canal '))[q.G.S.signal];i.use();for(let i=0;i<340;i++)q.tick(1/60);const live=q.L.jill.actor.current;q.saveCheckpoint('cp01');q.restartCheckpoint();return{live,restored:q.L.jill.actor.current,talked:q.G.S.flags.talked_basso};});
   assert.equal(blackout.live,'CrouchIdle');assert.equal(blackout.restored,'CrouchIdle');assert.ok(blackout.talked);
   await start('A1-M2');await page.evaluate(()=>{const q=QNT;q.P.hp=10000;q.P.body.pos.set(1,.01,24);q.P.yaw=0;q.P.pitch=0;q.enemies.clear();q.enemies.spawnGroup('qa-cast',{units:[{type:'E01',x:1,y:0,z:28,role:'hold',path:[]}]});});
   await page.waitForTimeout(500);
   const attack=await page.evaluate(()=>{const q=QNT,e=q.enemies.list.find(e=>e.active&&e.type==='E01');e.state='fire';e.burstLeft=1;e.burstT=0;e.aimDir.set(0,0,-1);q.enemies.update(1/60);const clip=e.actor.current;e.damage(1,'torso',null);return{clip,hit:e.actor.current};});
   assert.equal(attack.clip,'Attack');assert.equal(attack.hit,'HitReaction');await shot('m2-reptiliano');
   const loot=await page.evaluate(()=>{const q=QNT,random=Math.random;Math.random=()=>0;try{q.P.hp=30;const e=q.enemies.list.find(e=>e.active&&e.type==='E01');e.damage(999,'head',null);const d=q.drops.at(-1);return{type:d.type,y:d.pos.y,death:e.actor.current,modelTilt:e.actor.model.rotation.x};}finally{Math.random=random;}});
   assert.equal(loot.type,'medkit');assert.ok(Math.abs(loot.y-.35)<.1);assert.equal(loot.death,'Death');assert.equal(loot.modelTilt,0);
   const cap=await page.evaluate(()=>{const q=QNT,random=Math.random;Math.random=()=>0;try{for(let i=0;i<30;i++)q.G.hooks.onEnemyKilled({type:'DRONE',body:{pos:q.P.body.pos.clone().set(0,4,28)}});const count=q.drops.length,max=Math.max(...q.drops.map(d=>d.pos.y));q.G.hooks.onEnemyKilled({type:'DRONE',body:{pos:q.P.body.pos.clone().set(0,4,18)}});return{count,max,roof:q.drops.at(-1).pos.y};}finally{Math.random=random;}});
   assert.equal(cap.count,24);assert.ok(cap.max<.5);assert.ok(Math.abs(cap.roof-4.25)<.01);await page.evaluate(()=>QNT.restartCheckpoint());assert.equal(await page.evaluate(()=>QNT.drops.length),0);
   await page.evaluate(()=>{const q=QNT;q.G.S.flags.metro_relays_on=true;q.grantSeal('qa-m2-a',q.L.pts.gate);q.grantSeal('qa-m2-b',q.L.pts.gate);q.setSimulateSaveFailure(true);q.interactables().find(i=>i.text==='Atravessar a Fenda de Saída').use();for(let i=0;i<140;i++)q.tick(1/60);});
   assert.equal(await page.evaluate(()=>QNT.store.campaign.unlocked.includes('A1-M3')),false,'falha de save não libera M3');
   await page.evaluate(()=>{const q=QNT;q.setSimulateSaveFailure(false);q.interactables().find(i=>i.text==='Atravessar a Fenda de Saída').use();for(let i=0;i<140;i++)q.tick(1/60);});
   assert.equal(await page.evaluate(()=>QNT.store.campaign.unlocked.includes('A1-M3')),true);
   await page.locator('#bNext').click();await page.waitForFunction(()=>QNT.mission.id==='A1-M3'&&QNT.ui.mode==='play');
   console.log('Conversa, combate, animações, loot, save e transição M2→M3 OK');
  }
  if(id==='A1-M3'){
   assert.equal(await page.evaluate(()=>QNT.P.eco.unlocked),true);
   await page.evaluate(()=>{QNT.P.hp=10000;QNT.P.body.pos.set(0,.01,7);QNT.P.yaw=0;QNT.P.pitch=.08;});await shot('m3-usina-patio');
   const result=await page.evaluate(()=>{
    const q=QNT,use=text=>{const i=q.interactables().find(i=>i.text.startsWith(text));if(!i)throw Error('interação ausente '+text);i.use();};
    use('Fechar válvula de resfriamento 1');use('Fechar válvula de resfriamento 2');const first=q.G.S.seals.length,door=q.L.doors.turbine_door.col.enabled;
    q.enemies.clear();q.enemies.spawnGroup('qa-old-sniper',{units:[{type:'E02',x:9,y:0,z:41,role:'hold',path:[]}]});q.P.body.pos.set(0,.01,103);use('Acionar parada manual');
    const defenders=q.enemies.aliveInGroup('eg31');const old=q.enemies.list.find(e=>e.active&&e.group==='qa-old-sniper');old.lostT=15.2;old.los=false;old.losT=1;q.enemies.update(.1);q.enemies.update(.01);if(q.enemies.list.filter(e=>e.active&&e.alive&&e.group==='eg31').length!==3)throw Error('sniper antigo bloqueou reforços');for(const e of q.enemies.list)if(e.active&&e.alive)e.damage(999,'head',null);q.tick(1/60);
    q.P.body.pos.set(-15.5,4.01,107.5);use('Copiar backup');q.P.body.pos.set(-15,4.01,116);q.tick(1/60);q.restartCheckpoint();
    const saved=q.G.S.checkpointId,restored=q.G.S.flags.backup_secured,earlyExit=q.gateStable();
    q.P.hp=10000;q.P.body.pos.set(0,8.01,175);q.tick(1/60);const roof=q.enemies.aliveInGroup('eg33');for(const e of q.enemies.list)if(e.active&&e.alive)e.damage(999,'head',null);q.tick(1/60);
    q.P.body.pos.set(0,8.01,182);use('Cortar descarga');
    return{first,door,defenders,saved,restored,earlyExit,roof,seals:q.G.S.seals.length,ready:q.gateStable()};
   });
   assert.equal(result.first,1);assert.equal(result.door,false);assert.equal(result.defenders,3);assert.equal(result.saved,'cp02');assert.ok(result.restored);assert.equal(result.earlyExit,false);assert.equal(result.roof,3);assert.equal(result.seals,2);assert.ok(result.ready);
   await page.evaluate(()=>{QNT.P.body.pos.set(-4,8.01,177);QNT.P.yaw=.45;QNT.P.pitch=.07;});await shot('m3-usina-terraco');
   await page.evaluate(()=>{const q=QNT;q.interactables().find(i=>i.text==='Atravessar a Fenda de Saída').use();for(let i=0;i<140;i++)q.tick(1/60);});
   assert.equal(await page.evaluate(()=>QNT.ui.stack.at(-1)),'results');assert.ok(await page.evaluate(()=>QNT.store.campaign.completed['A1-M3']));
   console.log('Usina: rota de objetivos, defesa, backup, checkpoint e conclusão OK',result);
  }
  console.log('WebGL OK',info);
 }
 // Galerias de QA: mesmas malhas, materiais e clipes usados nas missões.
 const pickups=await page.evaluate(async()=>{
  const THREE=await import('/vendor/three/three.module.min.js'),{createPickupMesh,PICKUPS}=await import('/src/pickups.js');
  const sc=new THREE.Scene();sc.background=new THREE.Color(0x101c29);sc.add(new THREE.HemisphereLight(0xffffff,0x8090a0,3));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(2,4,5);sc.add(light);
  Object.keys(PICKUPS).forEach((type,i)=>{const m=createPickupMesh(type);m.position.x=(i-2.5)*1.1;m.scale.setScalar(1.3);m.rotation.y=.35;sc.add(m);});
  const cam=new THREE.OrthographicCamera(-3.6,3.6,2.025,-2.025,.01,100);cam.position.set(0,2.2,6);cam.lookAt(0,0,0);
  const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1280,720);r.render(sc,cam);r.domElement.id='qa-preview';r.domElement.style.cssText='position:fixed;inset:0;z-index:9999;width:100vw;height:100vh';document.body.append(r.domElement);
  return{draws:r.info.render.calls,triangles:r.info.render.triangles};
 });
 assert.ok(pickups.draws<=24);console.log('Galeria de recursos',pickups);await shot('recursos');
 await page.evaluate(async()=>{
  document.getElementById('qa-preview').remove();const THREE=await import('/vendor/three/three.module.min.js'),{Actor}=await import('/src/characters.js');
  const sc=new THREE.Scene();sc.background=new THREE.Color(0x29313b);sc.add(new THREE.HemisphereLight(0xffffff,0x7b8297,3));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(3,6,5);sc.add(light);
  ['jill','boate','E01','E02'].forEach((name,i)=>{const a=new Actor(name);a.root.position.x=(i-1.5)*1.8;a.root.rotation.y=.15;a.play(name==='boate'?'Performance':name==='jill'?'BartenderIdle':'RelaxedIdle',0);a.update(.4);sc.add(a.root);});
  const cam=new THREE.OrthographicCamera(-3.7,3.7,2.08,-2.08,.01,100);cam.position.set(0,1.2,7);cam.lookAt(0,.85,0);
  const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1280,720);r.render(sc,cam);r.domElement.style.cssText='position:fixed;inset:0;z-index:9999;width:100vw;height:100vh';document.body.append(r.domElement);
 });
 await shot('elenco-v070');assert.deepEqual(errors,[],'erros de execução ou compilação WebGL');
}finally{await browser?.close();server.kill();}
