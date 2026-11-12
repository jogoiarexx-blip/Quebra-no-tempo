import './helpers/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadGLB } from './helpers/load-glb.js';
import { assets } from '../src/characters.js';
import { G } from '../src/state.js';
import { enemies,createEnemyPools,initEnemyList } from '../src/enemies.js';
for(const [name,path]of[['E01','../models/enemies/reptiliano.glb'],['E02','../models/enemies/porco-policial.glb']]){const{gltf}=await loadGLB(new URL(path,import.meta.url));assets[name]={scene:gltf.scene,clips:Object.fromEntries(gltf.animations.map(c=>[c.name,c])),material:null};}
G.S={stats:{kills:0}};createEnemyPools(new THREE.Scene());initEnemyList();
const unit=type=>({type,x:0,y:0,z:20,role:'hold',path:[]});
test('encontros: pool cheio enfileira reforços sem perder unidades nem concluir cedo',()=>{
 enemies.spawnGroup('a',{units:[...Array.from({length:4},()=>unit('E01')),unit('E02')]});
 enemies.spawnGroup('b',{units:[unit('E01'),unit('E02')]});
 assert.equal(enemies.activeAlive(),5);assert.equal(enemies.aliveInGroup('b'),2);
 for(const type of ['E01','E02']){const e=enemies.list.find(e=>e.type===type&&e.active);e.alive=false;e.deactivate();}
 enemies.update(0);assert.equal(enemies.activeAlive(),5);assert.equal(enemies.aliveInGroup('b'),2);
 assert.equal(enemies.list.filter(e=>e.active&&e.group==='b').length,2);
 enemies.clear();assert.equal(enemies.aliveInGroup('b'),0);assert.equal(enemies.activeAlive(),0);
 enemies.spawnGroup('c',{units:[unit('E02')]});assert.equal(enemies.aliveInGroup('c'),1);enemies.clear();
});

test('encontros: sniper antigo longe e sem visão libera vaga; próximo ator reinicia o tempo de fuga',async()=>{
 const {addCollider,clearColliders}=await import('../src/physics.js');
 const {P}=await import('../src/player.js');
 clearColliders();addCollider(-100,100,-1,0,-100,100);P.body.pos.set(0,.01,0);
 enemies.clear();enemies.spawnGroup('old',{units:[{...unit('E02'),z:70}]});enemies.spawnGroup('new',{units:[{...unit('E02'),z:20}]});
 assert.equal(enemies.aliveInGroup('new'),1);
 for(let i=0;i<170&&!enemies.list.some(e=>e.active&&e.group==='new');i++)enemies.update(.1);
 assert.equal(enemies.aliveInGroup('old'),0);const fresh=enemies.list.find(e=>e.active&&e.group==='new');assert.ok(fresh);assert.ok((fresh.lostT||0)<.2);
 enemies.clear();clearColliders();addCollider(-100,100,-1,0,-100,100);addCollider(-10,10,0,10,8,9);
 enemies.spawnGroup('near',{units:[{...unit('E02'),z:30}]});enemies.spawnGroup('wait',{units:[unit('E02')]});
 for(let i=0;i<170;i++)enemies.update(.1);
 assert.equal(enemies.list.find(e=>e.type==='E02'&&e.active).group,'near');assert.equal(enemies.aliveInGroup('wait'),1);
 enemies.clear();clearColliders();
});
