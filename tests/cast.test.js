import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { loadGLB } from './helpers/load-glb.js';
const report=JSON.parse(fs.readFileSync(new URL('../docs/CAST_OPTIMIZATION_v0_6_0.json',import.meta.url)));
for(const [name,path] of [['jill','../models/jill.glb'],['reptilian','../models/enemies/reptiliano.glb']]) {
 const {gltf,json,bytes}=await loadGLB(new URL(path,import.meta.url));
 test(`${name}: GLB otimizado conserva skin, proporções, animações e pesos normalizados`,()=>{
  assert.ok(bytes.length<report[name].source_bytes*.2);
  assert.equal(json.skins[0].joints.length,report[name].bones);
  if(name==='reptilian')assert.ok(report[name].optimized_triangles<=20000);
  for(const anim of gltf.animations){assert.ok(anim.validate());for(const tr of anim.tracks)assert.ok(Array.from(tr.values).every(Number.isFinite));}
  for(const required of ['Idle','Walking','Running','Aim','Fall','Crouch'])assert.ok(gltf.animations.some(c=>c.name===required));
  gltf.scene.traverse(o=>{
   if(!o.isSkinnedMesh)return;
   const w=o.geometry.attributes.skinWeight;
   for(let i=0;i<w.count;i++){const sum=w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i);assert.ok(Math.abs(sum-1)<.002);}
   const p=o.geometry.attributes.position;
   const size=new THREE.Box3().setFromBufferAttribute(p).getSize(new THREE.Vector3());
   assert.ok(Math.abs(size.y-1.7)<.025,'altura base deve continuar 1,70 m');
  });
  const mixer=new THREE.AnimationMixer(gltf.scene);
  for(const clip of gltf.animations.filter(c=>['Idle','Walking','Running','Aim'].includes(c.name))){
   const a=mixer.clipAction(clip);a.play();
   for(const phase of [0,.25,.5,.75]){
    mixer.setTime(phase*clip.duration);gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();const s=o.boundingBox.getSize(new THREE.Vector3());assert.ok(s.x<2&&s.y<2.2&&s.z<2,'skin não deve explodir durante animação');}});
   }a.stop();
  }
 });
}
