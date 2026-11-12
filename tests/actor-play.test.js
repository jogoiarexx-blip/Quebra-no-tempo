import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Actor, assets } from '../src/characters.js';
import { loadGLB } from './helpers/load-glb.js';
const {gltf}=await loadGLB(new URL('../models/gael.glb',import.meta.url));
const idle=gltf.animations.find(c=>c.name==='Idle');
const gesture=idle.clone();gesture.name='Gesture';gesture.duration=.3;
assets.qa={scene:gltf.scene,clips:{Idle:idle,Gesture:gesture},material:null};
test('Actor: one-shot reinicia no início, termina e fica na última pose',()=>{
 const a=new Actor('qa');a.update(2);a.play('Gesture',0,1,{once:true,restart:true});
 assert.equal(a.actions.Gesture.time,0);assert.equal(a.actions.Gesture.loop,THREE.LoopOnce);
 a.update(.2);a.play('Gesture',.1,1,{once:true});assert.ok(a.actions.Gesture.time>.1);
 a.update(.3);assert.equal(a.actions.Gesture.paused,true);assert.equal(a.actions.Gesture.clampWhenFinished,true);
 a.play('Idle',0);assert.equal(a.actions.Idle.loop,THREE.LoopRepeat);assert.equal(a.actions.Idle.paused,false);
 a.play('Gesture',0,1,{once:true,restart:true});assert.equal(a.actions.Gesture.time,0);
 a.dispose();
});
