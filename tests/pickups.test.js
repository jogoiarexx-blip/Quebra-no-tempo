import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PICKUPS, createPickupMesh, disposePickupAssets } from '../src/pickups.js';

test('pickups: seis silhuetas distintas, geometria finita e orçamento leve',()=>{
 const signatures=[];
 for(const type of ['ammo9','shells','medkit','armor','pecas','weapon_trovao']) {
  const g=createPickupMesh(type);let tris=0,meshes=0;
  assert.ok(PICKUPS[type].label);assert.equal(g.userData.pickupType,type);
  g.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;
   assert.ok(Array.from(p.array).every(Number.isFinite));tris+=(o.geometry.index?.count||p.count)/3;});
  const box=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  assert.ok(meshes<=4,`${type}: ${meshes} draws`);assert.ok(tris<=512,`${type}: ${tris} triangles`);
  signatures.push([meshes,tris,...box.toArray().map(n=>n.toFixed(3))].join(':'));
 }
 assert.equal(new Set(signatures).size,6);
 disposePickupAssets();
});
test('pickups: cópias compartilham geometria/material e descarte é centralizado',()=>{
 const a=createPickupMesh('medkit'),b=createPickupMesh('medkit');
 assert.notEqual(a,b);assert.equal(a.children[0].geometry,b.children[0].geometry);assert.equal(a.children[0].material,b.children[0].material);
 assert.equal(a.children[0].userData.pickupShared,true);
 let disposed=0;a.children[0].geometry.addEventListener('dispose',()=>disposed++);
 a.removeFromParent();assert.equal(disposed,0);
 disposePickupAssets();assert.equal(disposed,1);
 const c=createPickupMesh('medkit');assert.notEqual(c.children[0].geometry,a.children[0].geometry);
 disposePickupAssets();
});

test('pickups: halos planos usam uma única passagem de transparência',()=>{
 for(const type of Object.keys(PICKUPS)) {
  const halo=createPickupMesh(type).children.at(-1);
  assert.equal(halo.material.forceSinglePass,true,type);
 }
 disposePickupAssets();
});
