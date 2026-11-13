// Deterministic, serializable boss rules. Presentation and player damage live in A1-M4.
export function createLeviathan(){return {active:false,hp:1080,maxHp:1080,phase:1,mode:'idle',timer:0,cycle:0,x:0,z:136,target:null,pattern:'lane',windowDamage:0,thrusterHp:72,valveCooldown:[0,0],attackId:0};}
export function startLeviathan(b){if(b.active||b.mode==='dead')return false;b.active=true;b.mode='warning';b.timer=1.65;b.target=null;return true;}
export function exposeLeviathan(b,source){
 if(!b.active||['dead','transition','exposed','attack'].includes(b.mode))return false;
 if(source==='valve0'||source==='valve1'){const i=Number(source.at(-1));if(b.valveCooldown[i]>0)return false;b.valveCooldown[i]=12;}
 else if(source!=='thruster')return false;
 b.mode='exposed';b.timer=5.5;b.windowDamage=0;b.thrusterHp=72;return true;
}
export function hitLeviathan(b,part,damage){
 if(!b.active||!Number.isFinite(damage)||damage<=0||b.mode==='dead')return 0;
 if(part==='thruster'&&b.mode!=='exposed'){
  if(b.mode==='transition'||b.mode==='attack')return 0;
  b.thrusterHp-=damage;if(b.thrusterHp<=0)exposeLeviathan(b,'thruster');return 0;
 }
 if(part!=='core'||b.mode!=='exposed')return 0;
 const phaseFloor=1080-b.phase*360,hit=Math.min(damage,120-b.windowDamage,b.hp-phaseFloor);
 b.hp-=hit;b.windowDamage+=hit;
 if(b.hp<=0){b.hp=0;b.mode='dead';b.active=false;b.timer=0;}
 else if(b.hp<=phaseFloor){b.phase++;b.mode='transition';b.timer=2.5;b.target=null;}
 return hit;
}
function aim(b,p){b.target={x:Math.max(-27.5,Math.min(27.5,p.x)),y:p.y>=3?4:0,z:Math.max(99,Math.min(164.5,p.z))};b.pattern=(b.phase===3?['lane','drill','pulse']:['lane','drill'])[b.cycle%(b.phase===3?3:2)];}
export function stepLeviathan(b,dt,target){
 if(!b.active||!Number.isFinite(dt)||dt<=0)return [];
 dt=Math.min(dt,.1);const events=[];b.valveCooldown=b.valveCooldown.map(t=>Math.max(0,t-dt));
 if(b.mode==='warning'&&!b.target)aim(b,target);
 if(b.mode==='reposition'){const goal=b.cycle%2?5:-5;b.x+=Math.max(-dt*3,Math.min(dt*3,goal-b.x));}
 b.timer-=dt;if(b.timer>0)return events;
 if(b.mode==='warning'){
  b.mode='attack';b.timer=.4;b.attackId++;
  events.push({kind:'attack',pattern:b.pattern,...b.target,id:b.attackId,damage:b.pattern==='drill'?30:24});
 }else if(b.mode==='attack'){b.mode='recover';b.timer=1.5;}
 else if(b.mode==='exposed'){b.mode='recover';b.timer=1.1;b.thrusterHp=72;}
 else if(b.mode==='transition'){b.mode='reposition';b.timer=1.5;events.push({kind:'phase',phase:b.phase});}
 else if(b.mode==='recover'){b.mode='reposition';b.timer=1.5;}
 else if(b.mode==='reposition'){b.cycle++;b.mode='warning';b.timer=b.phase===3?1.85:1.65;b.target=null;aim(b,target);}
 return events;
}
export function attackHits(a,p){
 if(Math.abs(p.y-a.y)>1.8)return false;
 if(a.pattern==='lane')return Math.abs(p.x-a.x)<1.8&&p.z>98.5&&p.z<165.1;
 return Math.hypot(p.x-a.x,p.z-a.z)<(a.pattern==='pulse'?5:3);
}
