import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeCrouchClips } from '../src/crouch.js';

// Keep the actual skeleton and clips; omit embedded textures in this Node test.
const bytes = fs.readFileSync(new URL('../models/gael.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
for (const mesh of json.meshes) for (const prim of mesh.primitives) delete prim.material;
delete json.materials; delete json.textures; delete json.images;
const raw = Buffer.from(JSON.stringify(json));
const padded = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32); raw.copy(padded);
const bin = bytes.subarray(20 + jsonLength);
const glb = Buffer.alloc(20 + padded.length + bin.length);
glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(padded.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); padded.copy(glb, 20); bin.copy(glb, 20 + padded.length);
const gltf = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
const model = gltf.scene, bones = {};
model.traverse(b => { if (b.isBone) bones[b.name.replace(/^mixamorig[:_]?/, '')] = b; });
const idle = gltf.animations.find(c => c.name === 'Idle');
const baseMixer = new THREE.AnimationMixer(model); baseMixer.clipAction(idle).play(); baseMixer.update(0); model.updateMatrixWorld(true);
const floor = ['Left', 'Right'].map(s => bones[s+'Foot'].getWorldPosition(new THREE.Vector3()));
const hipY = bones.Hips.position.y;
baseMixer.stopAllAction();
const clips = makeCrouchClips(model, idle, gltf.animations.find(c=>c.name==='Aim'));

test('agachado tem ciclos separados, pelve baixa e quaternions finitos', () => {
  assert.deepEqual(clips.map(c=>c.name), ['CrouchIdle','CrouchWalk']);
  for (const clip of clips) {
    assert.ok(clip.validate());
    for (const t of clip.tracks) assert.ok(Array.from(t.values).every(Number.isFinite));
    const hp = clip.tracks.find(t=>t.name.endsWith('.position'));
    assert.ok(hp.values[1] < hipY - .5);
    for (const tr of clip.tracks) {
      const n = tr.getValueSize();
      for(let i=0;i<n;i++) assert.ok(Math.abs(tr.values[i] - tr.values[tr.values.length-n+i]) < 1e-5, 'ciclo deve fechar sem salto');
    }
  }
});

test('pés ficam apoiados na fase de contato e não atravessam o chão', () => {
  for (const clip of clips) {
    const mixer = new THREE.AnimationMixer(model); const a=mixer.clipAction(clip);a.play();
    for(let i=0;i<40;i++) {
      const t=i/40;mixer.setTime(t*clip.duration);model.updateMatrixWorld(true);
      for(let j=0;j<2;j++) {
        const foot=bones[(j?'Right':'Left')+'Foot'].getWorldPosition(new THREE.Vector3());
        const phase=(t+j*.5)%1, stance=clip.name==='CrouchIdle'||phase<.62;
        assert.ok(foot.y >= floor[j].y-.003, `pé abaixo do apoio: ${foot.y-floor[j].y}`);
        if(stance) assert.ok(Math.abs(foot.y-floor[j].y)<.003, 'pé de apoio deve manter altura');
      }
    }
    mixer.stopAllAction();mixer.uncacheRoot(model);
  }
});

test('controlador alterna crouchIdle/crouchWalk e impede levantar sob teto baixo', async () => {
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url => String(url).startsWith('file:') ? {json:async()=>JSON.parse(fs.readFileSync(url,'utf8'))} : originalFetch(url);
  try {
    const {assets}=await import('../src/characters.js');
    let material;model.traverse(o=>{if(o.isMesh) material=o.material;});
    assets.gael={scene:model,clips:Object.fromEntries([...gltf.animations,...clips].map(c=>[c.name,c])),material};
    const {G}=await import('../src/state.js');
    const {P,createPlayer,resetPlayer,updatePlayer,updateCamera}=await import('../src/player.js');
    const {input}=await import('../src/input.js');
    const {addCollider,clearColliders}=await import('../src/physics.js');
    clearColliders(); addCollider(-50,50,-1,0,-50,50);
    G.S={stats:{}};G.hooks.toast=()=>{};G.camera=new THREE.PerspectiveCamera(70,1,.08,100);
    createPlayer(new THREE.Scene());resetPlayer({x:0,y:.001,z:0});P.inputLock=0;
    input.pressed.add('KeyC');updatePlayer(1/60,{all:[]});input.pressed.clear();
    assert.equal(P.crouch,true);assert.equal(P.actor.current,'CrouchIdle');
    const initialCamera=P.cameraHeight;updateCamera(1/60);
    assert.ok(P.cameraHeight<initialCamera&&P.cameraHeight>P.body.h,'câmera desce gradualmente');
    input.keys.add('KeyW');
    for(let i=0;i<60;i++){updatePlayer(1/60,{all:[]});P.actor.update(1/60);}
    assert.equal(P.actor.current,'CrouchWalk');assert.ok(P.speed<=1.651);assert.ok(P.body.pos.z>1);
    input.keys.clear();
    for(let i=0;i<30;i++){updatePlayer(1/60,{all:[]});P.actor.update(1/60);}
    assert.equal(P.actor.current,'CrouchIdle');
    const ceiling=addCollider(-50,50,1.2,2,-50,50);
    input.pressed.add('KeyC');updatePlayer(1/60,{all:[]});input.pressed.clear();
    assert.equal(P.crouch,true);assert.equal(P.body.h,1.1);
    ceiling.enabled=false;input.pressed.add('KeyC');updatePlayer(1/60,{all:[]});input.pressed.clear();
    assert.equal(P.crouch,false);assert.equal(P.body.h,1.8);
    for(let i=0;i<20;i++)P.actor.update(1/60);
    assert.ok(P.actor.weights.Idle>.99);
    clearColliders();
  } finally {globalThis.fetch=originalFetch;}
});

test('fenda reutiliza buffers e anima luz, partículas e cacos nos dois presets',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url=>({json:async()=>JSON.parse(fs.readFileSync(url,'utf8'))});
  try {
    const {createRift}=await import('../src/rift.js');const {G}=await import('../src/state.js');
    const r=createRift(), children=r.group.children.length;
    const particles=r.group.children.find(o=>o.isPoints),buffer=particles.geometry.attributes.position.array;
    const blue=r.group.children.find(o=>o.isPointLight),dim=blue.intensity;
    r.stable=true;for(let i=0;i<240;i++)r.update(1/60);
    assert.ok(blue.intensity>dim);assert.equal(r.group.children.length,children);
    assert.equal(particles.geometry.attributes.position.array,buffer);
    assert.ok(Array.from(buffer).every(Number.isFinite));
    G.settings.quality='low';r.update(1/60);assert.equal(particles.geometry.drawRange.count,48);
    G.settings.quality='high';r.update(1/60);assert.equal(particles.geometry.drawRange.count,96);
    const t=r.t;r.update(0);assert.equal(r.t,t,'pausa não avança a fenda');
  } finally {globalThis.fetch=originalFetch;}
});
