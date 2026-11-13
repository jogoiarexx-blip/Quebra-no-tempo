import './helpers/game-state.js';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {moveBody,boxFree,colliders,raycast}from'../src/physics.js';
const context=new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>context})};
const url=new URL('../src/missions/a1m4.js',import.meta.url),mission=fs.existsSync(url)?(await import(url)).default:null;
function setup(){
 assert.ok(mission,'A1-M4 ausente');const L=mission.build(new THREE.Scene()),S={flags:{},...mission.newState(),seals:[],pickups:[],groupsDone:[],destroyed:[],oneShots:[],archives:[],secrets:[],checkpointId:'cp00',pecas:0,stats:{time:0,kills:0}},P={body:{pos:new THREE.Vector3(0,.01,2),vel:new THREE.Vector3(),hw:.33,h:1.78,grounded:true},weapons:{martelo9:{have:true,mag:15},rompe_casco:{have:false,mag:1}},ammo:{ammo9:60,rockets:0},eco:{}};
 const X={L,S,P,settings:{shake:false},sfx:new Proxy({},{get:()=>()=>{}}),fx:{shake(){},sparks(){},flash(){}},say(){},toast(){},openDoc(){},activeGroups:new Map(),enemies:{clear(){},aliveInGroup(){return 0;}},startGroup(){},unlockEco(){},damagePlayer(){},fallRecover(pos){P.body.pos.copy(pos);P.body.vel.set(0,0,0);},saveCheckpoint(id){S.checkpointId=id;},giveWeapon(id){P.weapons[id].have=true;},grantSeal(id){if(!S.seals.includes(id))S.seals.push(id);},setDoor(id,open){const d=L.doors[id];d.col.enabled=!open;d.mesh.position.y=open?4.2:0;}};
 mission.apply(X);return X;
}
function walk(X,x,z){const b=X.P.body;for(let i=0;i<3500;i++){const dx=x-b.pos.x,dz=z-b.pos.z,d=Math.hypot(dx,dz);if(d<.08)return;b.vel.x=dx/d*3;b.vel.z=dz/d*3;b.vel.y-=24/60;moveBody(b,1/60);}assert.fail(`bloqueado antes (${x},${z}) em ${b.pos.toArray()}`);}
function use(X,text,near=true){const list=[];mission.interactables(X,(pos,name,fn)=>list.push({pos,name,fn}));const a=list.find(a=>a.name.startsWith(text));assert.ok(a,text);if(near)assert.ok(Math.hypot(a.pos.x-X.P.body.pos.x,(a.pos.y-X.P.body.pos.y-1)*.6,a.pos.z-X.P.body.pos.z)<2.5,`${text}: fora de alcance`);a.fn();}
test('Núcleo: avenida, alimentadores, armaria e acesso à arena são caminháveis',()=>{
 const X=setup();walk(X,0,58);mission.onGroupDone(X,'eg40');walk(X,0,66);mission.onGroupDone(X,'eg41');
 walk(X,-13,69.8);use(X,'Desligar alimentador oeste');walk(X,0,69);walk(X,13,69.8);use(X,'Desligar alimentador leste');
 walk(X,0,80);walk(X,-10,84.7);use(X,'Retirar Rompe-Casco');assert.ok(X.P.weapons.rompe_casco.have);assert.equal(X.L.doors.arena.col.enabled,false);
 walk(X,0,92);walk(X,0,102);use(X,'Iniciar contenção');assert.equal(X.S.checkpointId,'cp02');assert.equal(X.S.boss.mode,'warning');assert.equal(X.L.doors.arena.col.enabled,true);
 X.L.dispose();
});
test('Núcleo: passarelas, válvulas e duto têm rotas físicas sem salto obrigatório',()=>{
 const X=setup();X.L.doors.arena.col.enabled=false;walk(X,0,100);walk(X,-24,100);walk(X,-24,116);assert.ok(X.P.body.pos.y>3.9);walk(X,-24,154);walk(X,-24,160);walk(X,0,160);assert.ok(X.P.body.pos.y>3.9);
 assert.ok(boxFree(-18,.01,45,.33,1.78));assert.equal(boxFree(-18,.01,45,.33,1.05),null);
 X.P.body.pos.set(-18,.01,37);X.P.body.h=1.05;walk(X,-18,47);use(X,'Abrir reserva clandestina');assert.ok(X.S.secrets.includes('duct_cache'));
 for(const cp of Object.values(X.L.checkpoints))assert.equal(boxFree(cp.x,cp.y,cp.z,.33,1.78),null);
 for(const c of colliders)assert.ok([...c.min,...c.max].every(Number.isFinite));
 X.L.dispose();
});
test('Núcleo: reinício de luta restaura blindagem e vida; só derrota concede selo e portal exige console',()=>{
 const X=setup();X.S.flags={generator_off:true,launcher_taken:true,entry_cleared:true,control_cleared:true};mission.apply(X);use(X,'Iniciar contenção',false);
 use(X,'Abrir válvula oeste',false);mission.onShootCollider(X,{bossPart:'core'},125,new THREE.Vector3());assert.equal(X.S.boss.hp,960);
 mission.apply(X);assert.equal(X.S.boss.hp,1080);assert.equal(X.S.boss.mode,'idle');assert.equal(X.S.seals.length,0);
 use(X,'Iniciar contenção',false);
 for(let phase=0;phase<3;phase++)for(let n=0;n<3;n++){
  X.S.boss.mode='recover';X.S.boss.valveCooldown=[0,0];use(X,'Abrir válvula oeste',false);mission.onShootCollider(X,{bossPart:'core'},125,new THREE.Vector3());
 }
 mission.tick(X,1/60);assert.equal(X.S.seals.length,1);assert.ok(X.S.flags.boss_defeated);assert.equal(X.S.flags.portal_stable,undefined);assert.equal(X.S.checkpointId,'cp03');mission.tick(X,1/60);assert.equal(X.S.seals.length,1);
 X.P.body.pos.set(0,.01,151);walk(X,0,144);walk(X,8,144);walk(X,8,160);walk(X,0,160);walk(X,0,174);assert.ok(X.P.body.pos.y>3.9);use(X,'Estabilizar portal');assert.ok(X.S.flags.portal_stable);walk(X,3,174);walk(X,3,183);walk(X,0,183);assert.equal(mission.requiredFlags.every(k=>X.S.flags[k]),true);
 mission.apply(X);assert.ok(X.S.flags.boss_defeated);assert.equal(X.S.boss.mode,'dead');assert.equal(X.S.seals.length,1);X.L.dispose();
});

test('Núcleo: sair do piso recupera a última posição segura em vez de cair para sempre',()=>{
 const X=setup();X.P.body.pos.set(0,-5,-12);mission.tick(X,1/60);assert.ok(X.P.body.pos.y>=0);
 X.S.flags.boss_defeated=true;X.S.boss.mode='dead';X.P.body.pos.set(0,4.001,174);X.P.body.grounded=true;mission.tick(X,1/60);
 X.P.body.pos.set(0,-5,167);X.P.body.grounded=false;mission.tick(X,1/60);assert.ok(X.P.body.pos.y>=4);assert.equal(X.P.body.pos.z,174);X.L.dispose();
});
