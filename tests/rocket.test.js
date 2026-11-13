import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {addCollider,clearColliders} from '../src/physics.js';
const url=new URL('../src/rocket.js',import.meta.url),api=fs.existsSync(url)?await import(url):{};
test('foguete tem voo e para na primeira parede, sem impacto duplicado',()=>{
 assert.equal(typeof api.launchRocket,'function');clearColliders();const wall=addCollider(-2,2,-2,4,5,6);addCollider(-2,2,-2,4,10,11,{bossPart:'core'});
 const rocket=api.launchRocket(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1));
 assert.equal(api.stepRocket(rocket,.05),null);assert.ok(rocket.pos.z>1&&rocket.pos.z<2);
 const impact=api.stepRocket(rocket,.5);assert.equal(impact.c,wall);assert.equal(impact.point.z,5);assert.equal(api.stepRocket(rocket,.5),null);clearColliders();
});
test('explosão tem risco próximo ao jogador e alcance limitado',()=>{
 assert.equal(typeof api.rocketSelfDamage,'function');assert.equal(api.rocketSelfDamage(0),55);assert.equal(api.rocketSelfDamage(4),0);assert.ok(api.rocketSelfDamage(2)>0&&api.rocketSelfDamage(2)<55);
});

test('foguete colide quando o tick termina exatamente na face da parede',()=>{
 clearColliders();const wall=addCollider(-1,1,0,2,32/60,32/60+.2);const r=api.launchRocket(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1));
 const hit=api.stepRocket(r,1/60);assert.equal(hit?.c,wall);assert.ok(Math.abs(hit.point.z-32/60)<1e-8);assert.equal(api.stepRocket(r,1/60),null);clearColliders();
});
