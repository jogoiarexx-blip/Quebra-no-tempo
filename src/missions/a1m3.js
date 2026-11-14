// A1-M3 — USINA NORTE. Resfriamento, backup, guindaste e terraço industrial (GDD §8/§46).
import * as THREE from 'three';
import { createBuilder,canvasTex,makeSky,makeSkyline,makeRain,streetLamp } from '../world.js';
import { turnValve,takeBackup,useCrane,armDischarge,steamActive } from './usina-state.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const SECTORS={dock:'Docas de manutenção',yard:'Pátio dos transformadores',cooling:'Linhas de resfriamento',crane:'Cabine do guindaste',turbines:'Sala das turbinas',gallery:'Galeria de serviço',roof:'Terraço da chaminé'};
export const USINA_ROUTE={spawn:[0,.01,2],valves:[[-12,0,52],[12,0,66]],fuse:[-19,0,41],crane:[14,4,66],turbine:[0,0,104],backup:[-15,4,108],discharge:[0,8,183],gate:[0,8,189]};
function sectorAt(p){if(p.z>170)return'roof';if(p.z>118)return'gallery';if(p.z>74)return'turbines';if(p.y>3)return'crane';if(p.z>42)return'cooling';if(p.z>14)return'yard';return'dock';}
function build(scene){
 const L=createBuilder(scene),{B,D,M,root}=L;
 L.fogColor=0x16131a;L.fogDensity=.0085;L.hemi=1.15;L.moon=1.1;
 const cylinder=(mat,x,y,z,r,h,rx=0)=>{const geo=new THREE.CylinderGeometry(r,r,h,12);geo.rotateX(rx);return L.mesh(geo,mat,x,y,z);};
 const pipe=(x,y,z,length,mat=M.metal,rx=Math.PI/2)=>cylinder(mat,x,y,z,.16,length,rx);
 const label=(text,x,y,z,w=3,ry=Math.PI)=>{
  const tex=canvasTex(256,64,(c)=>{c.fillStyle='#111b20';c.fillRect(0,0,256,64);c.strokeStyle='#69d4ca';c.lineWidth=4;c.strokeRect(2,2,252,60);c.font='bold 21px monospace';c.textAlign='center';c.fillStyle='#e6eedb';c.fillText(text,128,39);},false);
  const mesh=L.mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),x,y,z);mesh.rotation.y=ry;return mesh;
 };
 // Piso da usina e limites. A galeria cruza um poço real; não há salto obrigatório.
 B(M.wet,-24,24,-1,0,-6,118,{tile:5});B(M.dark,-24,24,-4,-3,118,134);
 B(M.concrete,-18,18,0,4,134,168);B(M.concrete,-18,18,4,8,172,194);
 for(const x of [-24,24])B(M.brick,x-.4,x+.4,0,15,-6,118);
 B(M.brick,-24,24,0,12,-6,-5.5);
 for(const x of [-18,18])B(M.metal,x-.08,x+.08,8,9.1,172,194,{col:{seeThrough:true}});
 B(M.metal,-18,18,8,9.1,193.5,194,{col:{seeThrough:true}});
 L.pts.spawn={x:0,y:.01,z:2,yaw:0};L.pts.gate=V(0,9.3,189);L.pts.gateYaw=0;L.pts.portal=V(0,5,174);
 makeSky(L,0x080b12,0x332129,0x6e321b);makeSkyline(L,0,90,150,34,91);makeRain(L,500);
 label('USINA NORTE',0,5,-5.35,8,0);
 for(const z of [12,38,70,140,164]){streetLamp(L,-20,z,z>118?4:0,0xf8b56d,1);streetLamp(L,20,z,z>118?4:0,0x7acbda,-1);}
 // Docas, carga e transformadores: volumetria com rotas laterais largas.
 for(const [x,z]of[[-17,5],[16,9],[-14,28],[14,30],[-14,20],[14,20]]){
  B(M.metal,x-2,x+2,0,2.8,z-2,z+2);B(M.hazard,x-2.1,x+2.1,2.8,2.9,z-2.1,z+2.1,{noCol:true,tile:1});
  for(let y=.5;y<2.8;y+=.3)B(M.dark,x-2.07,x+2.07,y,y+.055,z-2.05,z+2.05,{noCol:true});
  for(const dx of [-1,1]){cylinder(M.rust,x+dx,3.6,z,.14,1.4);for(let y=3.15;y<4.2;y+=.18)cylinder(M.rail,x+dx,y,z,.25,.07);}
 }
 for(let z=10;z<74;z+=4)B(M.neonAmber,-.09,.09,.025,.035,z,z+2,{noCol:true});
 for(const x of [-21,21]){pipe(x,5,44,60,M.rust);pipe(x,6,45,56);}
 L.light(0,5,26,0x7ed9e6,28,30);L.light(0,4,56,0xffae57,32,25);
 // Válvulas e vapor com aviso de pressão antes da janela de dano.
 L.valves=[];L.steam=[];
 for(let i=0;i<2;i++){
  const x=i?12:-12,z=i?66:52;
  B(M.metal,x-.7,x+.7,0,1.15,z-.6,z+.6);pipe(x,1.8,z,7,M.rust,0);
  const wheel=L.mesh(new THREE.TorusGeometry(.34,.055,6,16),M.neonAmber,x,1.3,z-.69);
  const hub=L.mesh(new THREE.BoxGeometry(.07,.55,.06),M.rail,x,1.3,z-.69);wheel.add(hub);hub.position.set(0,0,0);
  L.valves.push(wheel);L.interact['valve_'+i]=V(x,1.1,z-1.15);
  const steam=L.mesh(new THREE.ConeGeometry(1.25,2.5,8,1,true),new THREE.MeshBasicMaterial({color:0xff9f44,transparent:true,opacity:.18,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false}),i?7.5:-7.5,1.3,z);
  L.steam.push({mesh:steam,pos:V(i?7.5:-7.5,0,z)});label('RESFRIAMENTO '+(i+1),x,3,z,3.5);
 }
 // Duto opcional baixo: fusível do guindaste. A rota de válvulas continua disponível.
 B(M.metal,-22,-21.5,0,1.7,33,44);B(M.metal,-16.5,-16,0,1.7,33,44);B(M.metal,-22,-16,1.18,1.55,33,44);
 B(M.metal,-22,-16,0,1.7,43.5,44);L.interact.fuse=V(-19,.7,41);label('FUSIVEL / C',-19,2,33,3);
 B(M.neonCyan,-19.25,-18.75,.6,1.0,42.9,43.1,{noCol:true});
 // Escada e cabine do guindaste (4 m). Degraus de 0,4 m dentro do step do controlador.
 for(let i=0;i<10;i++)B(M.metal,18,21,0,(i+1)*.4,40+i*1.2,41.2+i*1.2,{tile:1});
 B(M.metal,10,21,3.8,4,52,70);B(M.metal,10,10.15,4,5,52,70,{col:{seeThrough:true}});B(M.metal,20.8,21,4,5,53,70,{col:{seeThrough:true}});
 B(M.dark,12,16,7,7.2,62,69);B(M.metal,12,12.15,4,7,62,69);B(M.metal,15.85,16,4,7,62,69);B(M.metal,12,16,4,7,68.8,69);
 L.interact.crane=V(14,5,66);B(M.neonCyan,13.4,14.6,4.75,4.9,66.3,66.8,{noCol:true});label('GUINDASTE',14,6.4,68.65,2.6);
 for(const x of [-9,9])B(M.rust,x-.2,x+.2,0,12,62,62.4);B(M.hazard,-9.2,9.2,11.6,12.2,62,63,{noCol:true});
 L.hook=new THREE.Group();root.add(L.hook);pipe(0,7.5,62.5,8,M.dark,0);L.hook.add(cylinder(M.hazard,0,3.5,62.5,.4,.65));
 // Hall das turbinas. Porta aceita resfriamento OU guindaste como primeiro selo.
 B(M.brick,-20,-19,0,10,74,118);B(M.brick,19,20,0,10,74,118);
 B(M.brick,-20,-3,0,10,74,74.5);B(M.brick,3,20,0,10,74,74.5);B(M.brick,-3,3,3.5,10,74,74.5);
 B(M.dark,-20,20,10,10.35,74,118);L.doors.turbine_door=D(M.metal,-3,3,0,3.5,74.1,74.35);L.doors.turbine_door.openH=4;
 label('TURBINAS',0,5.8,73.9,5);
 L.rotors=[];
 for(const x of [-8,8]){
  B(M.metal,x-3,x+3,0,3.0,87,99);cylinder(M.rail,x,3.2,93,2.1,6,Math.PI/2);
  const rotor=new THREE.Group();rotor.position.set(x,3.2,89.95);root.add(rotor);
  for(let k=0;k<8;k++){const a=k*Math.PI/4,m=new THREE.Mesh(new THREE.BoxGeometry(.22,1.7,.10),M.rust);m.position.set(Math.sin(a)*1.05,Math.cos(a)*1.05,0);m.rotation.z=-a;rotor.add(m);}L.rotors.push(rotor);
  pipe(x,6.8,94,22,M.metal);L.light(x,7.8,95,0x6bc9e8,32,19);
 }
 L.interact.turbine=V(0,1.2,104);B(M.metal,-1,1,0,1.0,104.5,105.3);label('PARADA MANUAL',0,2.2,105.2,3);
 for(const side of [-1,1]){
  const x0=side<0?-18:14,x1=side<0?-14:18;
  for(let i=0;i<10;i++)B(M.metal,x0,x1,0,(i+1)*.4,82+i*1.2,83.2+i*1.2,{tile:1});
  B(M.metal,x0,x1,3.8,4,94,118);B(M.rail,side<0?-13.15:13,side<0?-13:13.15,4,5,95,110,{col:{seeThrough:true}});
 }
 B(M.metal,-18,18,3.8,4,110,118);L.interact.backup=V(-15.5,5,108);B(M.metal,-17,-15,4,5.1,108.8,109.5);label('BACKUP CIFRA',-16,6.2,109.4,2.6);
 // Duas travessias: passarela externa sempre disponível e ponte curta do guindaste.
 for(const x of [-15,15]){B(M.metal,x-3,x+3,3.75,4,116,136);for(const side of [-1,1])B(M.rail,x+side*2.9-.04,x+side*2.9+.04,4,5,118,134,{col:{seeThrough:true}});}
 L.bridge=D(M.hazard,-3,3,3.75,4,118,134);L.bridge.col.enabled=false;L.bridge.mesh.visible=false;
 label('GALERIA / SAIDA',-15,5.9,116,3.5,0);
 for(let i=0;i<10;i++)B(M.metal,-3,3,4,4+(i+1)*.4,160+i*1.2,161.2+i*1.2,{tile:1});
 for(const x of [-17,17])B(M.rail,x-.06,x+.06,4,5,136,160,{col:{seeThrough:true}});
 for(const[x,z]of[[-10,145],[10,150]]){B(M.metal,x-1.8,x+1.8,4,5.2,z-1,z+1);L.barrel('m3_barrel_'+x,x+2.7,4,z);}
 B(M.brick,9.2,12.8,8,30,181.2,184.8,{invisible:true});cylinder(M.brick,11,19,183,2,22);cylinder(M.hazard,11,12,183,2.08,.65);L.light(10,15,182,0xff763d,28,28);
 B(M.metal,-1,1,8,9.1,184,185);L.interact.discharge=V(0,9,183);label('CORTAR DESCARGA',0,10.3,184,4);
 // Recursos, checkpoints e grupos dentro dos limites dos pools.
 const pickups=[['dock_ammo','ammo9',30,-5,.35,9],['yard_armor','armor',35,5,.35,24],['cool_med','medkit',35,-4,.35,45],['cool_shell','shells',6,16,.35,69],['crane_parts','pecas',40,11,4.35,58],['hall_ammo','ammo9',30,0,.35,82],['hall_med','medkit',35,15,4.35,100],['backup_shell','shells',6,-16,4.35,113],['gallery_armor','armor',35,-14,4.35,141],['roof_ammo','ammo9',30,-7,8.35,178],['roof_med','medkit',35,7,8.35,190]];
 for(const p of pickups)L.pickup('m3_'+p[0],...p.slice(1));
 L.groups={
  eg30:{trigger:p=>p.z>15&&p.z<73,units:[{type:'E01',x:-5,y:0,z:28,role:'flank',path:[[-5,22]]},{type:'E01',x:5,y:0,z:36,role:'hold',path:[[5,33]]},{type:'E02',x:9,y:0,z:41,role:'sniper',alt:[[9,39],[11,41]]}]},
  eg31:{units:[{type:'E04',x:0,y:0,z:112,role:'hold',path:[[0,106]]},{type:'E01',x:-4,y:0,z:109,role:'flank',path:[[-4,102],[-2,100]]},{type:'E01',x:5,y:0,z:108,role:'hold',path:[[4,103]]},{type:'E02',x:16,y:4,z:107,role:'sniper',alt:[[16,105],[16,109]]}]},
  eg32:{trigger:p=>p.z>136&&p.z<160,units:[{type:'E01',x:-7,y:4,z:151,role:'flank',path:[[-7,143]]},{type:'E01',x:7,y:4,z:154,role:'hold',path:[[7,150]]}]},
  eg33:{trigger:p=>p.z>174&&p.y>7,units:[{type:'E01',x:-7,y:8,z:184,role:'flank',path:[[-7,179]]},{type:'E01',x:7,y:8,z:181,role:'hold',path:[[7,178]]},{type:'E02',x:14,y:8,z:189,role:'sniper',alt:[[14,187],[14,190]]}]}
 };
 L.checkpoints={cp00:{...L.pts.spawn},cp01:{x:0,y:.01,z:79,yaw:0,force:true},cp02:{x:-15,y:4.01,z:116,yaw:0,force:true},cp03:{x:0,y:8.01,z:174,yaw:0,force:true}};
 L.interact.archive=V(17,5,153);L.finish();return L;
}
let lastSafe=null,hazardCd=0;
function applyMechanics(X){const{L,S}=X,f=S.flags;X.setDoor('turbine_door',!!(f.valves_closed||f.crane_online),true);L.bridge.mesh.visible=L.bridge.col.enabled=!!f.crane_online;for(let i=0;i<2;i++)L.valves[i].material=f['cooling_'+i]?L.M.neonGreen:L.M.neonAmber;}
const mission={
 id:'A1-M3',name:'Usina Norte',sectorNames:SECTORS,sectorAt,sealsRequired:2,sealsAvailable:3,requiredFlags:['discharge_stopped'],enemiesTotal:12,secretsTotal:2,next:'A1-M4',ambientTrack:0,build,
 newState:()=>({}),outdoor:p=>p.z<74||p.z>118,
 startLoadout:()=>({weapons:{martelo9:{have:true,mag:15},trovao_duplo:{have:true,mag:2}},ammo:{ammo9:60,shells:8},current:'martelo9',holster:false}),
 ecoLocked:()=>false,afterReset(X){X.unlockEco();},
 apply(X){applyMechanics(X);lastSafe=V(0,.01,2);hazardCd=0;},
 onResume(X){if(X.S.flags.turbines_off&&!X.S.flags.turbine_defense_cleared)X.startGroup('eg31');},
 intro(X){X.say('CIFRA','O backup está na sala de turbinas da Usina Norte. Eles estão usando a rede de resfriamento para alimentar uma descarga temporal.');X.say('ÍRIS-9','Duas confirmações bastam. Resfrie as válvulas ou use o guindaste; depois recupere o backup e corte a descarga no terraço. O Eco já está disponível.');X.say('GAEL','Uma usina, um guindaste e gente tentando me matar. Pelo menos eu conheço as ferramentas.');},
 objective(X){const f=X.S.flags;if(!f.valves_closed&&!f.crane_online)return'Feche as duas válvulas ou ative o guindaste para abrir a sala das turbinas';if(!f.turbines_off)return'Sala das turbinas: acione a parada manual';if(!f.turbine_defense_cleared)return'Defenda a sala das turbinas';if(!f.backup_secured)return'Recupere o backup na passarela superior esquerda';if(!f.roof_defense_cleared)return'Siga pela galeria até o terraço da chaminé';if(!f.discharge_stopped)return'Corte a descarga temporal no painel do terraço';return'Atravesse a Fenda de Saída junto à chaminé';},
 waypoint(X){const{S,L,P}=X,f=S.flags;if(!f.valves_closed&&!f.crane_online){if(f.crane_fuse)return L.interact.crane;return L.interact[f.cooling_0?'valve_1':'valve_0'];}if(!f.turbines_off)return L.interact.turbine;if(!f.backup_secured)return P.body.pos.y<3?V(-16,1,82):L.interact.backup;if(!f.roof_defense_cleared)return V(0,8.8,175);if(!f.discharge_stopped)return L.interact.discharge;return L.pts.gate;},
 gateHint(X){return !X.S.flags.discharge_stopped?'Recupere o backup, defenda o terraço e corte a descarga.':'Confirme dois Selos: válvulas, turbinas ou guindaste.';},
 exitLine:'Descarga cortada. O caminho para o núcleo do reator está aberto.',
 deathTips:['O vapor fica âmbar antes do jato quente; espere a janela segura ou feche a válvula.','O guindaste oferece um selo alternativo e uma ponte curta. O fusível fica no duto baixo.','Use o Eco Cronal para recuar da linha de tiro e recarregar atrás de cobertura.'],
 interactables(X,add){const{S,L}=X,f=S.flags;
  for(let i=0;i<2;i++)if(!f['cooling_'+i])add(L.interact['valve_'+i],'Fechar válvula de resfriamento '+(i+1),()=>{if(!turnValve(S,i))return;X.sfx.power();applyMechanics(X);X.toast('VÁLVULA '+(i+1)+' FECHADA');if(f.valves_closed){X.grantSeal('seal_a1m3_cooling',L.interact.valve_1);X.say('ÍRIS-9','Pressão estabilizada. A porta das turbinas foi liberada.');}});
  if(!f.crane_fuse)add(L.interact.fuse,'Pegar fusível do guindaste',()=>{f.crane_fuse=true;if(!S.secrets.includes('crane_duct'))S.secrets.push('crane_duct');X.sfx.pickup();X.toast('FUSÍVEL DO GUINDASTE');});
  if(!f.crane_online)add(L.interact.crane,f.crane_fuse?'Ativar guindaste e baixar a ponte':'Guindaste sem fusível',()=>{if(!useCrane(S)){X.toast('O fusível está no duto de manutenção do pátio • agache com C');return;}applyMechanics(X);X.grantSeal('seal_a1m3_crane',L.interact.crane);X.sfx.power();X.say('GAEL','Ponte no lugar. A porta das turbinas também respondeu.');});
  if((f.valves_closed||f.crane_online)&&!f.turbines_off)add(L.interact.turbine,'Acionar parada manual das turbinas',()=>{f.turbines_off=true;X.sfx.power();X.startGroup('eg31');X.say('CIFRA','Turbinas desligadas. Segure a sala: o backup está no terminal da passarela esquerda.');});
  if(f.turbines_off&&!f.backup_secured)add(L.interact.backup,f.turbine_defense_cleared?'Copiar backup do Cifra':'Defenda a sala antes de copiar',()=>{if(!takeBackup(S)){X.toast('Há invasores no controle das turbinas');return;}X.grantSeal('seal_a1m3_turbines',L.interact.backup);X.sfx.pickup();X.say('CIFRA','Cópia íntegra. A galeria leva ao terraço. Corte a descarga no painel da chaminé.');});
  if(!f.discharge_stopped)add(L.interact.discharge,'Cortar descarga temporal',()=>{if(!armDischarge(S)){X.toast('Recupere o backup e elimine os invasores do terraço');return;}X.sfx.power();X.fx.shake(.14);X.say('ÍRIS-9','Descarga neutralizada. Selos confirmados; a fenda está estável.');});
  if(!f.archive_read)add(L.interact.archive,'Ler ordem de emergência',()=>{f.archive_read=true;S.archives.push('usina_order');if(!S.secrets.includes('usina_order'))S.secrets.push('usina_order');X.openDoc({k:'USINA NORTE / TURNO 03',t:'O desvio para o reator',b:'As turbinas não alimentam mais Nova Aurora. Toda a energia segue para o núcleo. O guindaste mantém uma rota curta sobre o poço. O responsável pelo turno assinou o registro antes de desaparecer.'});});
 },
 tick(X,dt){const{S,L,P}=X,p=P.body.pos,f=S.flags;hazardCd=Math.max(0,hazardCd-dt);
  if(p.y< -2.6){X.fallRecover(lastSafe||V(0,.01,2));return;}
  if(P.body.grounded&&p.y>=0&&p.z<193&&Math.abs(p.x)<23)lastSafe=p.clone();
  if(!hazardCd&&p.y<2.3)for(let i=0;i<2;i++)if(steamActive(S,i,S.stats.time)&&p.distanceTo(L.steam[i].pos)<1.7){X.damagePlayer(9,L.steam[i].pos);hazardCd=.9;X.toast('VAPOR QUENTE • feche a válvula ou espere a janela segura',1.6);break;}
  if(S.checkpointId==='cp00'&&p.z>77&&(f.valves_closed||f.crane_online))X.saveCheckpoint('cp01');
  if(f.backup_secured&&p.z>113&&p.z<120&&p.y>3.5&&!['cp02','cp03'].includes(S.checkpointId))X.saveCheckpoint('cp02');
  if(p.z>173&&p.y>7&&S.checkpointId!=='cp03')X.saveCheckpoint('cp03');
 },
 onGroupDone(X,id){if(id==='eg31')X.S.flags.turbine_defense_cleared=true;if(id==='eg33')X.S.flags.roof_defense_cleared=true;},
 frame(X,dt,t,sim){const{L,S}=X,f=S.flags;for(const rotor of L.rotors)if(!f.turbines_off)rotor.rotation.z+=dt*(sim||!X.playing?3:0);for(let i=0;i<2;i++){const mesh=L.steam[i].mesh,active=steamActive(S,i,S.stats.time),phase=(S.stats.time+i*1.5)%4.8;mesh.visible=!f['cooling_'+i]&&!f.discharge_stopped;mesh.material.color.setHex(active?0xff6945:phase>.8?0xffcf64:0x73d5de);mesh.material.opacity=active?.25:.08;mesh.scale.y=active?1+.12*Math.sin(t*12):.35;}L.hook.position.y+=( (f.crane_online?5:0)-L.hook.position.y)*Math.min(1,dt*1.5);},
 menuCam(t,cam){cam.position.set(14+Math.sin(t*.12)*6,10,60);cam.lookAt(0,5,96);return V(0,5,90);},
 resultsText:X=>`${X.S.pecas} Peças Cronais recolhidas. Backup preservado e descarga interrompida. Próxima missão: A1-M4 — Núcleo de Ruptura.`,
};
export default mission;
