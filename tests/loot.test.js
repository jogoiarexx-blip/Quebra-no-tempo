import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEnemyDrop, applyResourcePickup } from '../src/loot.js';
const limits = { maxHealth:100, maxArmor:100, ammoCaps:{ammo9:135,shells:24}, res:1 };
const player = (opts={}) => ({hp:100,armor:0,ammo:{ammo9:40,shells:0},weapons:{martelo9:{have:true,mag:15},trovao_duplo:{have:false,mag:0}},...opts});
function sequence(...values) { let i=0; return ()=>values[i++ % values.length]; }

test('loot: sem munição de arma bloqueada, nem cura/proteção já cheias',()=>{
 const p=player({armor:100});
 for(let i=0;i<100;i++) assert.equal(chooseEnemyDrop('E01',p,limits,sequence(0,i/100)).type,'ammo9');
 p.ammo.ammo9=135;
 assert.equal(chooseEnemyDrop('E01',p,limits,()=>0),null);
 p.weapons.martelo9.have=false;p.ammo.ammo9=0;
 assert.equal(chooseEnemyDrop('E02',p,limits,()=>0),null);
});
test('loot: baixa vida aumenta a participação dos kits; atirador e drone têm drops próprios',()=>{
 const count=p=>Array.from({length:1000},(_,i)=>chooseEnemyDrop('E01',p,limits,sequence(0,i/1000))).filter(d=>d?.type==='medkit').length;
 assert.ok(count(player({hp:20}))>count(player({hp:80}))*2);
 assert.deepEqual(chooseEnemyDrop('E02',player({armor:100}),limits,()=>0),{type:'ammo9',amount:18});
 assert.deepEqual(chooseEnemyDrop('DRONE',player(),limits,()=>0),{type:'pecas',amount:8});
 assert.equal(chooseEnemyDrop('E01',player(),limits,()=>.99),null);
});
test('loot: cartuchos só entram no sorteio com a espingarda adquirida',()=>{
 const p=player({hp:100,armor:100,ammo:{ammo9:135,shells:0}});p.weapons.trovao_duplo.have=true;
 assert.deepEqual(chooseEnemyDrop('E01',p,limits,()=>0),{type:'shells',amount:2});
 p.ammo.shells=24;assert.equal(chooseEnemyDrop('E01',p,limits,()=>0),null);
});
test('coleta: ganho real, limites, dificuldade e recusa quando cheio',()=>{
 const p=player({hp:90,armor:98,ammo:{ammo9:134,shells:23}});
 assert.equal(applyResourcePickup(p,'medkit',35,limits),10);assert.equal(p.hp,100);
 assert.equal(applyResourcePickup(p,'medkit',35,limits),0);
 assert.equal(applyResourcePickup(p,'armor',25,limits),2);assert.equal(p.armor,100);
 assert.equal(applyResourcePickup(p,'ammo9',30,limits),1);assert.equal(p.ammo.ammo9,135);
 assert.equal(applyResourcePickup(p,'shells',6,limits),1);assert.equal(p.ammo.shells,24);
 p.ammo.ammo9=0;assert.equal(applyResourcePickup(p,'ammo9',12,{...limits,res:.85}),10);
 p.ammo.ammo9=0;assert.equal(applyResourcePickup(p,'ammo9',12,{...limits,res:1.25}),15);
 assert.equal(applyResourcePickup(p,'medkit',-1,limits),0);
 assert.equal(applyResourcePickup(p,'medkit',NaN,limits),0);
 assert.equal(applyResourcePickup(p,'unknown',12,limits),0);
});
