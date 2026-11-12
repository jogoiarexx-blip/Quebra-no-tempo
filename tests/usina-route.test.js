import './helpers/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {moveBody,boxFree,raycast,colliders} from '../src/physics.js';
const context=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>undefined,set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>context})};
const {default:mission}=await import('../src/missions/a1m3.js');
function setup(){
 const L=mission.build(new THREE.Scene()),S={flags:{},seals:[],pickups:[],groupsDone:[],destroyed:[],oneShots:[],archives:[],secrets:[],checkpointId:'cp00',pecas:0,stats:{time:0}},P={body:{pos:new THREE.Vector3(0,.01,2),vel:new THREE.Vector3(),hw:.33,h:1.78,grounded:true}};
 const X={L,S,P,sfx:new Proxy({},{get:()=>()=>{}}),fx:{shake(){}},say(){},toast(){},openDoc(){},startGroup(){},unlockEco(){},damagePlayer(){},fallRecover(p){P.body.pos.copy(p);},saveCheckpoint(id){S.checkpointId=id;},grantSeal(id){if(!S.seals.includes(id))S.seals.push(id);},setDoor(id,open){const d=L.doors[id];d.col.enabled=!open;d.mesh.position.y=open?4:0;}};
 mission.apply(X);return X;
}
function walk(X,x,z){
 const b=X.P.body;for(let i=0;i<1600;i++){const dx=x-b.pos.x,dz=z-b.pos.z,d=Math.hypot(dx,dz);if(d<.08)return;b.vel.x=dx/d*3;b.vel.z=dz/d*3;b.vel.y-=24/60;moveBody(b,1/60);}
 assert.fail(`route blocked before (${x},${z}); at ${X.P.body.pos.toArray()}`);
}
function use(X,text){const list=[];mission.interactables(X,(pos,name,fn)=>list.push({pos,name,fn}));const a=list.find(a=>a.name.startsWith(text));assert.ok(a,text);a.fn();}

test('Usina: rota principal caminhável passa por válvulas, turbinas, backup e terraço',()=>{
 const X=setup(),p=X.P.body.pos;
 assert.equal(boxFree(0,.01,2,.33,1.78),null);
 walk(X,0,46);walk(X,-12,50.8);use(X,'Fechar válvula de resfriamento 1');
 walk(X,0,46);walk(X,0,62);walk(X,12,64.8);use(X,'Fechar válvula de resfriamento 2');
 assert.equal(X.L.doors.turbine_door.col.enabled,false);assert.deepEqual(X.S.seals,['seal_a1m3_cooling']);
 walk(X,0,70);walk(X,0,80);walk(X,0,103);use(X,'Acionar parada manual');
 mission.onGroupDone(X,'eg31');
 walk(X,0,80);walk(X,-16,80);walk(X,-16,95);assert.ok(p.y>3.9&&p.y<4.1);
 walk(X,-15.5,107.5);use(X,'Copiar backup');assert.ok(X.S.flags.backup_secured);assert.equal(X.S.seals.length,2);
 walk(X,-14.1,107.5);walk(X,-14.1,111);walk(X,-15,116);walk(X,-15,137);walk(X,-15,144);walk(X,0,157);walk(X,0,173);assert.ok(p.y>7.9&&p.y<8.1);
 walk(X,0,182);mission.onGroupDone(X,'eg33');use(X,'Cortar descarga');assert.equal(X.S.flags.discharge_stopped,true);
 walk(X,3,182);walk(X,3,188);walk(X,0,188);assert.equal(boxFree(p.x,p.y,p.z,.33,1.78),null);
 assert.equal(mission.requiredFlags.every(k=>X.S.flags[k]),true);
 X.L.dispose();
});
test('Usina: duto exige agachar e guindaste concede o selo alternativo e ponte com colisão',()=>{
 const X=setup();assert.ok(boxFree(-19,.01,40,.33,1.78));assert.equal(boxFree(-19,.01,40,.33,1.05),null);
 X.P.body.h=1.05;walk(X,0,32);walk(X,-19,32);walk(X,-19,41);use(X,'Pegar fusível');
 walk(X,-19,31);X.P.body.h=1.78;walk(X,0,31);walk(X,19.5,38);walk(X,19.5,53);assert.ok(X.P.body.pos.y>3.9);
 walk(X,14,55);walk(X,14,61);walk(X,14,65);use(X,'Ativar guindaste');
 assert.equal(X.S.flags.valves_closed,undefined);assert.deepEqual(X.S.seals,['seal_a1m3_crane']);assert.ok(X.L.bridge.col.enabled&&X.L.bridge.mesh.visible);
 assert.ok(Math.abs(raycast(0,9,125,0,-1,0,30).c.max[1]-4)<.01);assert.equal(X.L.doors.turbine_door.col.enabled,false);
 X.S.flags.turbines_off=true;mission.onGroupDone(X,'eg31');use(X,'Copiar backup');assert.equal(X.S.seals.length,2);
 X.L.dispose();
});
test('Usina: restaurar flags recompõe porta, ponte e válvulas; limites e encontros são finitos',()=>{
 const X=setup();X.S.flags={crane_online:true,cooling_0:true};mission.apply(X);assert.equal(X.L.doors.turbine_door.col.enabled,false);assert.equal(X.L.bridge.col.enabled,true);assert.equal(X.L.valves[0].material,X.L.M.neonGreen);
 for(const c of colliders)assert.ok([...c.min,...c.max].every(Number.isFinite));
 assert.equal(Object.values(X.L.groups).reduce((n,g)=>n+g.units.length,0),mission.enemiesTotal);
 for(const g of Object.values(X.L.groups)){assert.ok(g.units.filter(u=>u.type==='E01').length<=4);assert.ok(g.units.filter(u=>u.type==='E02').length<=1);}
 for(const cp of Object.values(X.L.checkpoints))assert.equal(boxFree(cp.x,cp.y,cp.z,.33,1.78),null);
 X.L.dispose();
});
