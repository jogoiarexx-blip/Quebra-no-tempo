// A1-M4 — NÚCLEO DE RUPTURA. The end of Nova Aurora, GDD §7/8/46.
import * as THREE from 'three';
import {createBuilder,canvasTex,makeSky,makeSkyline,makeRain,streetLamp}from'../world.js';
import{lineOfSight}from'../physics.js';
import{createLeviathan,startLeviathan,stepLeviathan,exposeLeviathan,hitLeviathan,attackHits}from'./leviathan-state.js';
import{buildLeviathan}from'./leviathan-view.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const SECTORS={avenue:'Avenida da contenção',control:'Complexo de contenção',armory:'Armaria de emergência',arena:'Pátio do Leviatã',walkway:'Passarelas do reator',reactor:'Plataforma de ruptura'};
export const NUCLEO_ROUTE={spawn:[0,.01,2],feeders:[[-13,0,70],[13,0,70]],launcher:[-10,0,85],start:[0,0,102],valves:[[-16,0,118],[16,0,118]],portal:[0,4,174],gate:[0,4,184]};
function sectorAt(p){if(p.z>166)return'reactor';if(p.z>=98)return p.y>3?'walkway':'arena';if(p.z>79)return'armory';if(p.z>60)return'control';return'avenue';}
function build(scene){
 const L=createBuilder(scene),{B,D,M,root}=L;
 L.fogColor=0x20212d;L.fogDensity=.007;L.hemi=1.5;L.moon=1.3;
 makeSky(L,0x0c1020,0x433a3d,0xa85229);makeSkyline(L,0,90,170,38,47);makeRain(L,450);
 const cyl=(mat,x,y,z,r,h,rx=0)=>{const g=new THREE.CylinderGeometry(r,r,h,12);g.rotateX(rx);return L.mesh(g,mat,x,y,z);};
 const sign=(text,x,y,z,w=4)=>{
  const tex=canvasTex(512,96,c=>{c.fillStyle='#0c1922';c.fillRect(0,0,512,96);c.strokeStyle='#e3ae57';c.lineWidth=5;c.strokeRect(3,3,506,90);c.font='bold 28px monospace';c.fillStyle='#e3eee9';c.textAlign='center';c.fillText(text,256,58);},false);
  const mesh=L.mesh(new THREE.PlaneGeometry(w,w*96/512),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),x,y,z);mesh.rotation.y=Math.PI;return mesh;
 };
 // Avenue: cracked lanes, rubble islands, emergency traffic and exposed services.
 B(M.wet,-25,25,-1,0,-8,62);B(M.floor,-20,20,-1,0,62,98);B(M.concrete,-28,28,-1,0,98,165);
 for(const s of[-1,1]){
  B(M.concrete,s<0?-25:22,s<0?-22:25,0,.18,-6,60);B(M.building,s<0?-31:25,s<0?-25:31,0,24,-8,60);
  for(const z of[2,17,34,53]){streetLamp(L,s*23,z,0,0xffbd72,-s);B(M.dark,s<0?-25:-0+24.9,s<0?-24.9:25,1.2,4.6,z-2,z+2,{noCol:true});}
  for(let z=7;z<57;z+=5){B(M.neonAmber,s*5-.07,s*5+.07,.02,.03,z,z+2,{noCol:true});}
 }
 for(const[x,z,w]of[[-10,17,6],[11,31,7],[-9,48,5]]){
  B(M.dark,x-w/2,x+w/2,.015,.035,z-1.2,z+1.2,{noCol:true});
  for(let i=0;i<5;i++)B(M.concrete,x-w/2+i*.7,x-w/2+i*.7+.9,0,.25+i*.05,z+.7,z+1.4,{noCol:true});
  cyl(M.rust,x,.2,z,.15,w,Math.PI/2);
 }
 // Bus shell and cars: real simple cover boxes under detailed visible chassis.
 B(M.bus,-18,-13,0,2.8,20,32);B(M.dark,-17.8,-13.2,2.8,3,20.2,31.8,{noCol:true});
 for(let z=21;z<31;z+=1.6){B(M.glass,-18.03,-18.01,1.1,2.4,z,z+1,{noCol:true});B(M.glass,-12.99,-12.97,1.1,2.4,z,z+1,{noCol:true});}
 for(const[x,z]of[[13,15],[12,43],[-11,55]]){B(M.car,x-1,x+1,0,1,z-2.2,z+2.2);B(M.car2,x-.85,x+.85,1,1.65,z-1,z+.9,{noCol:true});for(const dx of[-1,1])for(const dz of[-1.4,1.4])cyl(M.dark,x+dx,.4,z+dz,.38,.22,0);}
 for(const[x,z]of[[-5,25],[5,40],[-7,57]]){B(M.concrete,x-2,x+2,0,1.1,z-.55,z+.55);B(M.hazard,x-2.02,x+2.02,.7,.93,z-.58,z+.58,{noCol:true});}
 // Optional low maintenance route; both exits remain open.
 B(M.metal,-21,-20.5,0,1.5,38,49);B(M.metal,-15.5,-15,0,1.5,38,49);B(M.metal,-21,-15,1.15,1.45,38,49);
 L.interact.cache=V(-18,.7,47);sign('SERVICO / C',-18,2,37.9,3);
 // Containment: inspection windows, panels and two independently persistent feeders.
 for(const s of[-1,1]){B(M.metal,s<0?-20:-0+19.5,s<0?-19.5:20,0,8,62,98);for(const z of[67,78,89])B(M.neonCyan,s*19.4-.05,s*19.4+.05,5.6,5.8,z,z+3,{noCol:true});}
 B(M.dark,-20,20,8,8.3,62,98);B(M.metal,-20,-4,0,8,61.5,62);B(M.metal,4,20,0,8,61.5,62);B(M.metal,-4,4,4,8,61.5,62);
 L.feeders=[];for(let i=0;i<2;i++){
  const x=i?13:-13;B(M.metal,x-2,x+2,0,2.4,73,74);B(M.dark,x-1.7,x+1.7,.5,2.1,72.85,73,{noCol:true});
  const m=L.mesh(new THREE.BoxGeometry(.8,.4,.05),M.neonRed,x,1.5,72.8);L.feeders.push(m);L.interact['feeder'+i]=V(x,1,71);sign(i?'ALIMENTADOR LESTE':'ALIMENTADOR OESTE',x,3,73,4);
  for(let k=0;k<5;k++)B(M.rail,x-1.5,x+1.5,.4+k*.3,.45+k*.3,74,74.1,{noCol:true});L.light(x,5,74,0x72cbd0,25,18);
 }
 for(const x of[-6,6]){B(M.rust,x-.12,x+.12,5.5,5.8,63,96,{noCol:true});for(let z=64;z<96;z+=4)B(M.rail,x-.25,x+.25,5.4,5.9,z,z+.1,{noCol:true});}
 B(M.metal,-12,-8,0,.7,86,88);B(M.dark,-12,-8,.7,.8,86,88,{noCol:true});L.interact.launcher=V(-10,1,85.5);sign('ROMPE-CASCO / PROTOTIPO',-10,2.6,87.9,5);
 const tube=cyl(M.hazard,-10,1.1,87,.14,1.4,Math.PI/2);tube.rotation.z=Math.PI/2;
 L.interact.archive=V(13,1,86);B(M.metal,12,14,0,1.1,87,88);sign('REGISTRO DE MEMORIAS',13,2.2,87.9,4);
 B(M.metal,-20,-4,0,8,98,98.5);B(M.metal,4,20,0,8,98,98.5);B(M.metal,-4,4,4.1,8,98,98.5);L.doors.arena=D(M.hazard,-4,4,0,4.1,98.1,98.35);
 sign('CONTENCAO / REATOR',0,5.6,98,6);
 // Arena: broad floor, two 4 m walkways, real stair routes and a rear connection.
 for(const s of[-1,1]){
  B(M.metal,s<0?-28:27.6,s<0?-27.6:28,0,14,98,165);
  B(M.metal,s<0?-27:20,s<0?-20:27,3.8,4,114,165);
  const x0=s<0?-26:-0+22,x1=s<0?-22:26;for(let i=0;i<10;i++)B(M.metal,x0,x1,0,(i+1)*.4,102+i*1.2,103.2+i*1.2);
  B(M.rail,s<0?-20.15:20,s<0?-20:20.15,4,5.1,118,156,{col:{seeThrough:true}});
  for(const z of[112,128,147,161]){B(M.rust,s*27-.2,s*27+.2,0,13,z,z+.3);B(M.neonAmber,s*27-.21,s*27+.21,7,7.5,z-.05,z+.35,{noCol:true});L.light(s*24,8,z,0xffb55d,28,24);}
 }
 B(M.metal,-27,27,3.8,4,158,165);B(M.rail,-27,-4.2,4,5,164.8,165,{col:{seeThrough:true}});B(M.rail,4.2,27,4,5,164.8,165,{col:{seeThrough:true}});
 for(const[x,z]of[[-10,111],[10,111],[-11,147],[11,147]]){B(M.concrete,x-2,x+2,0,1.5,z-.6,z+.6);B(M.hazard,x-2.01,x+2.01,1.25,1.4,z-.62,z+.62,{noCol:true});}
 B(M.metal,-1,1,0,.85,104.5,105.2);L.interact.start=V(0,1,103);sign('INICIAR CONTENCAO',0,2.3,105.1,3.5);
 L.valves=[];for(let i=0;i<2;i++){
  const x=i?16:-16;B(M.metal,x-.8,x+.8,0,1.05,119,120);cyl(M.rust,x,2.1,119.5,.22,4.2);
  const m=L.mesh(new THREE.TorusGeometry(.42,.065,6,16),M.neonCyan,x,1.35,118.9);L.valves.push(m);L.interact['valve'+i]=V(x,1,118);sign(i?'V2 / EXPOR NUCLEO':'V1 / EXPOR NUCLEO',x,3.5,119.4,4);
  cyl(M.rust,x,5,135,.23,30,Math.PI/2);
 }
 // Containment ring and reactor machinery silhouette behind the mecha.
 for(const s of[-1,1]){cyl(M.metal,s*12,9,151,1.8,18);for(let y=2;y<18;y+=3)cyl(M.hazard,s*12,y,151,1.85,.22);}
 B(M.metal,-14,14,15,16,150,152);B(M.neonViolet,-11,11,15.3,15.6,149.9,150,{noCol:true});
 L.breakers=[D(M.hazard,-10,-4,4,6,155,155.5),D(M.hazard,4,10,4,6,155,155.5)];for(const q of L.breakers)q.col.enabled=false;
 // Stairs to rear walkway; portal bridge itself is enabled by boss defeat.
 for(let i=0;i<10;i++)B(M.metal,6,10,0,(i+1)*.4,146+i*1.2,147.2+i*1.2);
 B(M.concrete,-12,12,3,4,170,191);L.bridge=D(M.hazard,-4,4,3.8,4,165,170);L.bridge.col.enabled=false;L.bridge.mesh.visible=false;
 for(const s of[-1,1]){B(M.metal,s<0?-12:-0+11.8,s<0?-11.8:12,4,5,170,191,{col:{seeThrough:true}});B(M.metal,s*10-.3,s*10+.3,4,15,178,179);}
 B(M.metal,-10,10,14.5,15.1,178,179);L.interact.portal=V(0,5,174);B(M.metal,-1,1,4,4.9,175,176);sign('ESTABILIZAR RUPTURA',-9.8,6.3,177.85,3.8);
 L.reactorRing=L.mesh(new THREE.TorusGeometry(4,.18,6,32),M.neonViolet,0,9,182);L.reactorInner=L.mesh(new THREE.TorusGeometry(3.5,.1,6,32),M.neonCyan,0,9,182.3);L.light(0,9,181,0x9a6dff,38,28);
 L.pts.spawn={x:0,y:.01,z:2,yaw:0};L.pts.gate=V(0,5.3,184);L.pts.gateYaw=0;L.pts.portal=V(0,5,182);
 L.interact.supply=V(-24,5,138);B(M.metal,-27,-25.5,4,5.2,138.8,140);sign('RESERVA DE EMERGENCIA',-25,6.4,139.9,4);
 const supplies=[['avenue_ammo','ammo9',30,3,.35,10],['avenue_med','medkit',35,-8,.35,34],['armory_armor','armor',50,4,.35,88],['arena_rocket_w','rockets',4,-19,.35,108],['arena_rocket_e','rockets',4,19,.35,150],['arena_med_w','medkit',40,-24,4.35,125],['arena_med_e','medkit',40,24,4.35,148],['arena_ammo','ammo9',60,-18,.35,145],['arena_shells','shells',8,18,.35,128]];
 for(const p of supplies)L.pickup('m4_'+p[0],...p.slice(1));
 L.groups={eg40:{trigger:p=>p.z>18&&p.z<61,units:[{type:'E01',x:-3,y:0,z:33,role:'flank',path:[[-3,28]]},{type:'E01',x:5,y:0,z:49,role:'hold',path:[[5,44]]},{type:'E02',x:17,y:0,z:54,role:'sniper',alt:[[17,52],[17,56]]}]},eg41:{trigger:p=>p.z>64&&p.z<96,units:[{type:'E01',x:-5,y:0,z:82,role:'flank',path:[[-5,77]]},{type:'E01',x:5,y:0,z:88,role:'hold',path:[[5,83]]}]},eg42:{units:[{type:'DRONE',x:8,y:5,z:139,role:'hold'},{type:'E01',x:-17,y:0,z:142,role:'flank',path:[[-17,132]]}]},eg43:{units:[{type:'DRONE',x:-8,y:5,z:142,role:'hold'},{type:'E01',x:17,y:0,z:144,role:'flank',path:[[17,135]]}]}};
 L.checkpoints={cp00:{...L.pts.spawn},cp01:{x:0,y:.01,z:63,yaw:0,force:true},cp02:{x:0,y:.01,z:96,yaw:0,force:true},cp03:{x:0,y:.01,z:151,yaw:0,force:true}};
 L.bossView=buildLeviathan(L);L.finish();return L;
}
let lastSafe=V(0,.01,2);
function applyWorld(X){const{L,S}=X,f=S.flags,b=S.boss;X.setDoor('arena',!!(f.generator_off&&f.launcher_taken&&!b.active),true);for(let i=0;i<2;i++)L.feeders[i].material=f['feeder'+i]?L.M.neonGreen:L.M.neonRed;L.bridge.col.enabled=L.bridge.mesh.visible=!!f.boss_defeated;for(const q of L.breakers)q.mesh.visible=b.phase<2&&!f.boss_defeated;L.bossView.sync(b);}
function finishBoss(X){const{S,L}=X;if(S.flags.boss_defeated)return;S.flags.boss_defeated=true;S.flags.boss_started=false;S.stats.kills++;X.enemies.clear();X.activeGroups.clear();for(const id of['eg42','eg43'])if(!S.groupsDone.includes(id))S.groupsDone.push(id);X.grantSeal('seal_a1m4_leviathan',V(0,1.5,151));applyWorld(X);X.saveCheckpoint('cp03');X.sfx.explosion();X.fx.shake(.2);X.say('ÍRIS-9','Leviatã neutralizado. A assinatura do selo liberou a ponte do reator. Estabilize o portal na plataforma.');X.say('CIFRA','O registro do reator mostra uma rua que nunca existiu. Alguém está reescrevendo Nova Aurora.');}
const mission={
 id:'A1-M4',name:'Núcleo de Ruptura',sectorNames:SECTORS,sectorAt,sealsRequired:1,sealsAvailable:1,requiredFlags:['boss_defeated','portal_stable'],enemiesTotal:10,secretsTotal:2,next:null,ambientTrack:0,build,
 newState:()=>({boss:createLeviathan(),supplyUses:0,supplyCooldown:0}),outdoor:p=>p.z<62||p.z>98,
 startLoadout:()=>({weapons:{martelo9:{have:true,mag:15},trovao_duplo:{have:true,mag:2}},ammo:{ammo9:90,shells:12},current:'martelo9',holster:false}),ecoLocked:()=>false,afterReset(X){X.unlockEco();},
 apply(X){const{S}=X;if(!S.flags.boss_defeated){S.boss=createLeviathan();S.flags.boss_started=false;}else{S.boss={...createLeviathan(),...S.boss,hp:0,mode:'dead',active:false};}S.supplyUses??=0;S.supplyCooldown??=0;const cp=X.L.checkpoints[S.checkpointId]||X.L.pts.spawn;lastSafe=V(cp.x,cp.y,cp.z);applyWorld(X);},
 intro(X){X.say('CIFRA','O desvio da usina termina neste complexo. Dois alimentadores mantêm o gerador vivo; o painel de contenção fica depois da armaria.');X.say('ÍRIS-9','O Leviatã está conectado ao reator. Pegue o Rompe-Casco. As válvulas e os propulsores podem abrir a blindagem; guarde o Eco para sair das marcas no chão.');X.say('GAEL','Desligar a máquina grande com uma ferramenta maior. Entendi.');},
 objective(X){const{S}=X,f=S.flags,b=S.boss;if(!f.generator_off)return'Desligue os dois alimentadores do gerador no complexo de contenção';if(!f.launcher_taken)return'Recupere o Rompe-Casco na armaria';if(!f.entry_cleared||!f.control_cleared)return'Elimine os invasores da avenida e da contenção';if(!f.boss_started&&!f.boss_defeated)return'Acione a contenção no painel da arena';if(!f.boss_defeated)return b.mode==='exposed'?'Núcleo exposto: contra-ataque com o Rompe-Casco':'Leviatã: evite as marcas e exponha o núcleo por válvula ou propulsor';if(!f.portal_stable)return'Suba pela escada traseira e estabilize o portal no reator';return'Atravesse a primeira Fenda Estável';},
 waypoint(X){const{S,L}=X,f=S.flags;if(!f.generator_off)return L.interact[f.feeder0?'feeder1':'feeder0'];if(!f.launcher_taken)return L.interact.launcher;if(!f.entry_cleared)return V(0,1,35);if(!f.control_cleared)return V(0,1,82);if(!f.boss_started&&!f.boss_defeated)return L.interact.start;if(!f.boss_defeated)return S.boss.mode==='exposed'?V(S.boss.x,4.7,S.boss.z-3):L.interact[S.boss.valveCooldown[0]<=0?'valve0':'valve1'];return f.portal_stable?L.pts.gate:L.interact.portal;},
 gateHint:()=> 'Derrote o Leviatã para conquistar o Selo e estabilize o portal.',exitLine:'O primeiro portal estável abriu. Nova Aurora fica para trás; há uma assinatura vinda do Oeste.',
 deathTips:['Marcas âmbar avisam o ataque. Saia da pista ou use Eco para voltar à cobertura.','Abra uma válvula ou acerte os propulsores cianos. O núcleo verde aceita dano; a blindagem fechada não.','Use as passarelas para mudar de altura. Foguetes perto de você causam autolesão.','O checkpoint anterior ao chefe reinicia a luta completa. Há reserva limitada na passarela oeste.'],
 interactables(X,add){const{S,L,P}=X,f=S.flags,b=S.boss;
  for(let i=0;i<2;i++)if(!f['feeder'+i])add(L.interact['feeder'+i],i?'Desligar alimentador leste':'Desligar alimentador oeste',()=>{f['feeder'+i]=true;f.generator_off=!!(f.feeder0&&f.feeder1);X.sfx.power();applyWorld(X);X.toast(f.generator_off?'GERADOR NEUTRALIZADO':'ALIMENTADOR DESLIGADO');});
  if(!f.launcher_taken)add(L.interact.launcher,'Retirar Rompe-Casco',()=>{f.launcher_taken=true;X.giveWeapon('rompe_casco');P.ammo.rockets=Math.min(12,P.ammo.rockets+5);X.sfx.pickup();X.toast('ROMPE-CASCO • tecla 3 / trocar arma',3);X.say('GAEL','Protótipo de demolição. A etiqueta diz para não usar em espaço fechado.');applyWorld(X);});
  if(!f.boss_started&&!f.boss_defeated)add(L.interact.start,'Iniciar contenção — Leviatã de Aço',()=>{if(!f.generator_off||!f.launcher_taken){X.toast('Desligue os alimentadores e pegue o Rompe-Casco');return;}if(!f.entry_cleared||!f.control_cleared){X.toast('Elimine os invasores que ficaram na avenida e no controle');return;}X.saveCheckpoint('cp02');startLeviathan(b);f.boss_started=true;applyWorld(X);X.sfx.power();X.say('ÍRIS-9','Alvo conectado. Núcleo blindado. Use os avisos no piso; válvulas ou propulsores abrem a proteção.');});
  if(b.active)for(let i=0;i<2;i++)add(L.interact['valve'+i],(i?'Abrir válvula leste':'Abrir válvula oeste')+(b.valveCooldown[i]>0?' • resfriando':''),()=>{if(exposeLeviathan(b,'valve'+i)){X.sfx.power();X.toast('NÚCLEO EXPOSTO • CONTRA-ATAQUE',2.2);X.fx.sparks(V(b.x,4.7,b.z-2.5),0x6dffb8,20,4,.7);}else X.toast(b.mode==='exposed'?'Núcleo já exposto':b.mode==='transition'?'Aguarde a recomposição da arena':'Válvula resfriando • tente a outra ou os propulsores');});
  if(!f.cache_taken)add(L.interact.cache,'Abrir reserva clandestina',()=>{f.cache_taken=true;S.secrets.push('duct_cache');P.ammo.ammo9=Math.min(135,P.ammo.ammo9+35);S.pecas+=45;X.sfx.pickup();X.toast('SEGREDO • 45 PEÇAS + RESERVA 9 mm');});
  if(!f.archive_read)add(L.interact.archive,'Ler registro de memória falsa',()=>{f.archive_read=true;S.archives.push('rupture_false_memory');S.secrets.push('false_memory');X.openDoc({k:'CONTENCAO / REGISTRO 04',t:'A avenida que não existiu',b:'O mapa do turno anterior mostra uma rua atrás da oficina. Hoje há um quarteirão inteiro no lugar. Todos dizem que sempre esteve lá. O gerador não transporta apenas energia: substitui lembranças. A assinatura do primeiro portal aponta para uma fortaleza no Oeste. Íris guardou as duas versões do arquivo.'});});
  if(b.active&&S.supplyUses<3)add(L.interact.supply,'Retirar reserva de emergência ('+(3-S.supplyUses)+' restantes)',()=>{if(S.supplyCooldown>0){X.toast('Dispensador recarregando • '+Math.ceil(S.supplyCooldown)+' s');return;}if(P.ammo.rockets>2){X.toast('Use a reserva atual antes de abrir outro lote');return;}S.supplyUses++;S.supplyCooldown=18;P.ammo.rockets=Math.min(12,P.ammo.rockets+2);X.sfx.pickup();X.toast('+2 FOGUETES • RESERVA LIMITADA');});
  if(f.boss_defeated&&!f.portal_stable)add(L.interact.portal,'Estabilizar portal do reator',()=>{f.portal_stable=true;X.sfx.gate();X.toast('FENDA ESTAVEL • SELO 1/1');X.say('ÍRIS-9','Não é uma simples viagem. Há memórias de outras épocas misturadas à nossa cidade. O Oeste é a próxima coordenada.');});
 },
 onShootCollider(X,c,dmg,point){if(!c.bossPart)return;const b=X.S.boss,old=b.hp,thrusterHit=b.active&&c.bossPart==='thruster'&&!['exposed','transition','attack'].includes(b.mode),hit=hitLeviathan(b,c.bossPart,dmg);if(hit){X.fx.flash(point||V(b.x,4.7,b.z-3),.5,.1,0x6dffad);X.sfx.hit();}if(old>0&&b.hp===0)finishBoss(X);return hit||Number(thrusterHit);},
 onGroupDone(X,id){if(id==='eg40')X.S.flags.entry_cleared=true;if(id==='eg41')X.S.flags.control_cleared=true;},
 tick(X,dt){const{S,L,P}=X,f=S.flags,b=S.boss,p=P.body.pos;if(p.y< -3){X.fallRecover(lastSafe);return;}if(P.body.grounded&&p.y>=0&&p.z>=-7&&p.z<=190)lastSafe=p.clone();S.supplyCooldown=Math.max(0,S.supplyCooldown-dt);
  if(S.checkpointId==='cp00'&&p.z>62)X.saveCheckpoint('cp01');
  if(!f.boss_started&&!f.boss_defeated&&f.generator_off&&f.launcher_taken&&f.entry_cleared&&f.control_cleared&&p.z>93&&S.checkpointId!=='cp02')X.saveCheckpoint('cp02');
  for(const e of stepLeviathan(b,dt,p)){
   if(e.kind==='attack'){
    const from=V(e.pattern==='lane'?b.x:e.x,e.y+1.2,e.pattern==='lane'?b.z-4:e.z);
    if(attackHits(e,p)&&lineOfSight(from.x,from.y,from.z,p.x,p.y+1,p.z))X.damagePlayer(e.damage,from);
    L.bossView.impact.position.set(e.x,e.y+1.5,e.pattern==='lane'?Math.max(108,Math.min(155,p.z)):e.z);L.bossView.impact.userData.life=.5;X.sfx.explosion();X.fx.shake(.08);
   }
   if(e.kind==='phase'){applyWorld(X);X.say('ÍRIS-9',e.phase===2?'A proteção do reator rompeu! Drones de manutenção foram reprogramados. Mude de altura para quebrar as linhas de tiro.':'Último circuito! As descargas ficam mais amplas. Observe o aviso e abra a blindagem outra vez.');}
  }
  if(b.active&&b.phase>=2&&!f.aux2){f.aux2=true;X.startGroup('eg42');}
  if(b.active&&b.phase>=3&&S.groupsDone.includes('eg42')&&!f.aux3){f.aux3=true;X.startGroup('eg43');}
  if(b.mode==='dead')finishBoss(X);L.bossView.sync(b);
 },
 frame(X,dt,t,sim){const{L,S}=X;L.bossView.frame(S.boss,sim?dt:0,t);for(let i=0;i<2;i++){L.valves[i].material=S.boss.mode==='exposed'?L.M.neonGreen:S.boss.valveCooldown[i]>0?L.M.neonAmber:L.M.neonCyan;}L.reactorRing.rotation.z+=sim?dt*.12:0;L.reactorInner.rotation.z-=sim?dt*.18:0;},
 bossHud(X){const b=X.S.boss;if(!b.active)return null;const action=b.mode==='warning'?(b.pattern==='lane'?'METRALHA • SAIA DA PISTA':b.pattern==='drill'?'PERFURACAO • SAIA DA MARCA':'DESCARGA • AFASTE-SE'):b.mode==='exposed'?'NUCLEO EXPOSTO • CONTRA-ATAQUE':b.mode==='transition'?'CIRCUITO ROMPIDO':'BLINDADO • VALVULA OU PROPULSOR';return {name:'LEVIATÃ DE AÇO',hp:b.hp,maxHp:b.maxHp,phase:b.phase,text:action,exposed:b.mode==='exposed'};},
 menuCam(t,cam){cam.position.set(-17+Math.sin(t*.1)*4,8,112);cam.lookAt(0,5,138);return V(0,4,136);},
 resultsText:X=>`Ato I concluído. Leviatã derrotado, gerador neutralizado e primeiro portal estável aberto. ${X.S.pecas} Peças Cronais. Próximo destino do GDD: A2-M1 — Poeira Alta, ainda não implementado.`,
 onComplete(X,campaign){campaign.flags.act1_complete=true;campaign.flags.first_stable_portal=true;},
};
export default mission;
