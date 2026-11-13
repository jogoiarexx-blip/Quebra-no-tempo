import './helpers/game-state.js';import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import{loadGLB}from'./helpers/load-glb.js';import{assets}from'../src/characters.js';import{G}from'../src/state.js';import{input}from'../src/input.js';import{addCollider,clearColliders}from'../src/physics.js';import{initFx}from'../src/fx.js';
import{createPlayer,resetPlayer,updatePlayer,updateCamera,P}from'../src/player.js';import{enemies,createEnemyPools,initEnemyList}from'../src/enemies.js';
const{gltf}=await loadGLB(new URL('../models/gael.glb',import.meta.url));assets.gael={scene:gltf.scene,clips:Object.fromEntries(gltf.animations.map(c=>[c.name,c])),material:null};const scene=new THREE.Scene();G.camera=new THREE.PerspectiveCamera();G.mission={sectorAt:()=> 'test'};initFx(scene);createPlayer(scene);createEnemyPools(scene);initEnemyList();
function setup(){clearColliders();addCollider(-50,50,-1,0,-50,60);enemies.clear();G.S={stats:{shots:0,hits:0,kills:0,dmgTaken:0}};G.hooks={onShootCollider:()=>0,onEnemyKilled(){},hitMarker(){},toast(){},hasPrompt:()=>false};resetPlayer({x:0,y:.001,z:0,current:'rompe_casco',weapons:{rompe_casco:{have:true,mag:1}},ammo:{rockets:4}});P.inputLock=0;P.iframe=999;P.pitch=0;P.yaw=0;updateCamera(1/60);}
function fire(){input.pressed.add('Mouse0');updatePlayer(1/60,enemies);input.pressed.clear();for(let i=0;i<45;i++)updatePlayer(1/60,enemies);}
test('foguete aplica 125 direto no inimigo e não reaplica dano de área ao mesmo alvo',()=>{
 setup();enemies.spawnGroup('rocket-target',{units:[{type:'E01',x:-.62,y:0,z:12,role:'hold',path:[]}]});const e=enemies.list.find(e=>e.active&&e.alive),before=e.hp;fire();assert.equal(e.hp,before-125);assert.equal(G.S.stats.hits,1);assert.equal(G.S.stats.kills,1);
});
test('foguete no cenário não registra precisão falsa; tiro confirmado no núcleo registra acerto',()=>{
 setup();addCollider(-3,3,0,4,8,9);fire();assert.equal(G.S.stats.shots,1);assert.equal(G.S.stats.hits,0);
 setup();addCollider(-3,3,0,4,8,9,{bossPart:'core'});G.hooks.onShootCollider=()=>24;P.current='martelo9';P.weapons.martelo9.have=true;P.weapons.martelo9.mag=15;updateCamera(1/60);input.pressed.add('Mouse0');input.lmb=true;updatePlayer(1/60,enemies);input.pressed.clear();input.lmb=false;assert.equal(G.S.stats.hits,1);
});
