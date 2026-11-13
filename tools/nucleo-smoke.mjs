import assert from 'node:assert/strict';
export async function verifyNucleo(page,shot){
 const result=await page.evaluate(()=>{
  const q=QNT,use=t=>{const it=q.interactables().find(i=>i.text.startsWith(t));if(!it)throw Error('Interação ausente: '+t);it.use();},tick=n=>{for(let i=0;i<n;i++)q.tick(1/60);},kill=()=>{for(const e of q.enemies.list)if(e.active&&e.alive)e.damage(999,'head',null);tick(2);};
  q.P.iframe=999;q.P.hp=100;q.P.body.pos.set(0,.01,30);tick(2);kill();q.P.body.pos.set(0,.01,66);tick(2);kill();
  use('Desligar alimentador oeste');use('Desligar alimentador leste');use('Retirar Rompe-Casco');
  const acquired=q.P.weapons.rompe_casco.have;q.input.pressed.add('Digit1');tick(1);q.input.pressed.clear();q.input.wheel=1;tick(1);q.input.wheel=0;const second=q.P.current;q.input.wheel=1;tick(1);q.input.wheel=0;const third=q.P.current;
  q.P.body.pos.set(0,.001,102);use('Iniciar contenção');return {acquired,second,third,cp:q.G.S.checkpointId,boss:q.G.S.boss.active,door:q.L.doors.arena.col.enabled,early:q.gateStable()};
 });
 assert.deepEqual(result,{acquired:true,second:'trovao_duplo',third:'rompe_casco',cp:'cp02',boss:true,door:true,early:false});
 // Real player input launches a travelling projectile into the boss collider.
 const fire=async()=>page.evaluate(()=>{
  const q=QNT;q.P.body.pos.set(0,.001,119);q.P.body.vel.set(0,0,0);q.P.yaw=0;q.P.pitch=Math.atan2(4.7-1.67,132.7-119);q.P.actor.aimW=0;q.P.fireCd=0;q.P.reloadT=0;q.P.inputLock=0;q.P.weapons.rompe_casco.mag=1;q.updateCamera(1/60);
  const before=q.G.S.boss.hp;q.input.pressed.add('Mouse0');q.tick(1/60);q.input.pressed.clear();const instant=q.G.S.boss.hp;for(let i=0;i<45;i++)q.tick(1/60);return{before,instant,after:q.G.S.boss.hp};
 });
 const armor=await fire();assert.equal(armor.before,1080);assert.equal(armor.instant,1080);assert.equal(armor.after,1080);
 await page.evaluate(()=>{QNT.interactables().find(i=>i.text.startsWith('Abrir válvula oeste')).use();QNT.P.pitch=.2;});
 await shot('m4-leviata-nucleo-exposto');
 const layout=await page.evaluate(()=>({bar:document.getElementById('bossHud').getBoundingClientRect().bottom,notice:document.getElementById('toast').getBoundingClientRect().top}));assert.ok(layout.notice>layout.bar+4,'aviso não deve cobrir barra do chefe');
 const exposed=await fire();assert.equal(exposed.before,1080);assert.equal(exposed.instant,1080);assert.equal(exposed.after,960,'foguete real deve retirar exatamente uma janela de dano');
 const restart=await page.evaluate(()=>{const q=QNT;q.restartCheckpoint();return{hp:q.G.S.boss.hp,mode:q.G.S.boss.mode,seals:q.G.S.seals.length,launcher:q.P.weapons.rompe_casco.have};});
 assert.deepEqual(restart,{hp:1080,mode:'idle',seals:0,launcher:true});
 const victory=await page.evaluate(()=>{
  const q=QNT,use=t=>q.interactables().find(i=>i.text.startsWith(t)).use();q.P.iframe=999;q.P.hp=100;q.P.body.pos.set(0,.001,120);use('Iniciar contenção');let maxAux=0,sawDrone=false;
  for(let n=0;n<9;n++){
   let ticks=0;while(['exposed','attack','transition'].includes(q.G.S.boss.mode)||q.G.S.boss.valveCooldown.every(t=>t>0)){
    if(++ticks>1500)throw Error('Abertura indisponível');q.tick(1/60);maxAux=Math.max(maxAux,q.enemies.activeAlive());sawDrone||=q.enemies.list.some(e=>e.active&&e.alive&&e.type==='DRONE');
   }
   use(q.G.S.boss.valveCooldown[0]<=0?'Abrir válvula oeste':'Abrir válvula leste');q.mission.onShootCollider(q.X,{bossPart:'core'},125,q.P.body.pos.clone());q.tick(1/60);
  }
  const dead={hp:q.G.S.boss.hp,seals:q.G.S.seals.length,cp:q.G.S.checkpointId,dead:q.G.S.flags.boss_defeated,bridge:q.L.bridge.col.enabled,maxAux,sawDrone};
  q.restartCheckpoint();const kept=q.G.S.flags.boss_defeated&&q.G.S.seals.length===1&&q.G.S.boss.mode==='dead';q.P.body.pos.set(0,4.001,174);q.P.yaw=0;q.P.pitch=.09;use('Estabilizar portal');return{...dead,kept,stable:q.gateStable()};
 });
 assert.equal(victory.hp,0);assert.equal(victory.seals,1);assert.equal(victory.cp,'cp03');assert.ok(victory.dead&&victory.bridge&&victory.kept&&victory.stable&&victory.sawDrone);assert.ok(victory.maxAux<=2);
 await shot('m4-primeiro-portal-estavel');
 const finish=await page.evaluate(()=>{
  const q=QNT,exit=()=>{q.interactables().find(i=>i.text==='Atravessar a Fenda de Saída').use();for(let i=0;i<140;i++)q.tick(1/60);};
  q.setSimulateSaveFailure(true);exit();const blocked=!q.store.campaign.completed['A1-M4']&&!q.store.campaign.flags.act1_complete;q.setSimulateSaveFailure(false);exit();return{blocked,complete:!!q.store.campaign.completed['A1-M4'],act1:q.store.campaign.flags.act1_complete,results:q.ui.stack.at(-1),nextHidden:document.getElementById('bNext').style.display==='none'};
 });
 assert.deepEqual(finish,{blocked:true,complete:true,act1:true,results:'results',nextHidden:true});
 console.log('Núcleo: arsenal/ciclo, foguete real, blindagem, 3 etapas, checkpoint, auxiliares e conclusão transacional OK',victory);
}
