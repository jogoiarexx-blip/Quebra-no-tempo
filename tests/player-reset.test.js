import './helpers/game-state.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {loadGLB} from './helpers/load-glb.js';import{assets}from'../src/characters.js';import{G}from'../src/state.js';import{input}from'../src/input.js';
import {createPlayer,resetPlayer,updatePlayer,updateCamera,P} from '../src/player.js';
const{gltf}=await loadGLB(new URL('../models/gael.glb',import.meta.url));assets.gael={scene:gltf.scene,clips:Object.fromEntries(gltf.animations.map(c=>[c.name,c])),material:null};createPlayer(new THREE.Scene());G.camera=new THREE.PerspectiveCamera();G.S={stats:{dmgTaken:0}};
test('nova missão/checkpoint limpa comandos e deltas para manter câmera neutra',()=>{
 input.keys.add('KeyW');input.pressed.add('Mouse0');input.mouseDX=200;input.mouseDY=-700;input.lmb=true;
 resetPlayer({x:0,y:.01,z:7,yaw:0});assert.equal(input.mouseDX,0);assert.equal(input.mouseDY,0);assert.equal(input.lmb,false);assert.equal(input.keys.size,0);
 updateCamera(1/60);assert.ok(G.camera.getWorldDirection(new THREE.Vector3()).dot(P.fwd)>.999);assert.ok(G.camera.position.y>P.body.pos.y+.8);
});
test('mouse é consumido uma vez, mesmo quando um frame roda vários ticks fixos',()=>{
 resetPlayer({x:0,y:.01,z:7,yaw:0});input.mouseDX=20;input.mouseDY=15;
 updatePlayer(1/60,{});const yaw=P.yaw,pitch=P.pitch;updatePlayer(1/60,{});assert.equal(P.yaw,yaw);assert.equal(P.pitch,pitch);
});
