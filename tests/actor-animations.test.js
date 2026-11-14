import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { loadGLB } from './helpers/load-glb.js';
import { makeActorClips } from '../src/actor-animations.js';

const files = [['jill','models/jill.glb'], ['gael','models/gael.glb'], ['sol','models/sol.glb'], ['E01','models/enemies/reptiliano.glb'], ['E02','models/enemies/porco-policial.glb'], ['boate','models/boate.glb']].filter(([,p]) => fs.existsSync(new URL('../'+p, import.meta.url)));
const required = ['RelaxedIdle','BartenderIdle','Greeting','Talk','DanceIdle','Performance','HitReaction','Attack','Death','WalkBackward','StrafeLeft','StrafeRight'];
for (const [name,path] of files) {
  const {gltf} = await loadGLB(new URL('../'+path, import.meta.url));
  const bones = {}; gltf.scene.traverse(o=>{if(o.isBone) bones[o.name.replace(/^mixamorig[:_]?/, '')] = o;});
  const before = Object.values(bones).map(b=>[b,b.position.clone(),b.quaternion.clone()]);
  const clips = makeActorClips(gltf.scene,gltf.animations,name);
  test(name+': load-time clips are finite, normalized, planted and leave input untouched', () => {
    const names=clips.map(c=>c.name);for(const r of [...required,'HitLeft','HitRight','DeathFront','DeathSpin','Sing','Throw','Draw','Minigun','Jump','Melee','Reload','Roll'])assert.ok(names.includes(r),r);
    assert.equal(new Set(names).size,names.length,'nomes únicos');
    for(const [b,p,q] of before) { assert.ok(b.position.distanceTo(p)<1e-6); assert.deepEqual(b.quaternion.toArray(),q.toArray()); }
    for(const c of clips) {
      assert.ok(c.validate(),c.name);assert.ok(c.duration>.2);
      for(const tr of c.tracks) {
        assert.ok(Array.from(tr.values).every(Number.isFinite),c.name+' '+tr.name);
        if(tr.name.endsWith('.quaternion')) for(let i=0;i<tr.values.length;i+=4) assert.ok(Math.abs(Math.hypot(...tr.values.slice(i,i+4))-1)<2e-5,c.name+' normalized');
        if(tr.name.endsWith('.position')) for(let i=0;i<tr.values.length;i+=3) {assert.ok(Math.abs(tr.values[i]-tr.values[0])<1e-6,c.name+' root X');assert.ok(Math.abs(tr.values[i+2]-tr.values[2])<1e-6,c.name+' root Z');}
      }
      if(['RelaxedIdle','BartenderIdle','Talk','DanceIdle','Performance','StrafeLeft','StrafeRight'].includes(c.name)) for(const tr of c.tracks) { const n=tr.getValueSize(); for(let i=0;i<n;i++)assert.ok(Math.abs(tr.values[i]-tr.values[tr.values.length-n+i])<2e-5,c.name+' loop closes'); }
    }
    for(const c of clips.filter(c=>!['Death','WalkBackward','Aim'].includes(c.name))) {   // Aim sintetizado é uma pose fixa
      const variation = c.tracks.filter(tr=>tr.name.endsWith('.quaternion')).reduce((a,tr)=>Math.max(a,...Array.from(tr.values,(v,i)=>Math.abs(v-tr.values[i%4]))),0);
      assert.ok(variation>.012,c.name+' should move visibly');
    }
  });
  test(name+': gestures keep feet fixed and remain within character-scale bounds', () => {
    const idle = gltf.animations.find(c=>c.name==='Idle'), m = new THREE.AnimationMixer(gltf.scene);
    m.clipAction(idle).play();m.update(0);gltf.scene.updateMatrixWorld(true);
    const feet=['LeftFoot','RightFoot'].map(n=>bones[n].getWorldPosition(new THREE.Vector3()));
    const hipY=bones.Hips.position.y;m.stopAllAction();
    for(const c of clips.filter(c=>['RelaxedIdle','BartenderIdle','Greeting','Talk','DanceIdle','Performance'].includes(c.name))) {
      const act=m.clipAction(c).setLoop(THREE.LoopOnce,1);act.clampWhenFinished=true;act.play();
      for(let i=0;i<=10;i++) {
        m.setTime(c.duration*i/10);gltf.scene.updateMatrixWorld(true);
        ['LeftFoot','RightFoot'].forEach((n,j)=>assert.ok(bones[n].getWorldPosition(new THREE.Vector3()).distanceTo(feet[j])<.003,c.name+' planted foot'));
        for(const n of ['Head','LeftHand','RightHand']) {const p=bones[n].getWorldPosition(new THREE.Vector3());assert.ok(p.y>.5&&p.y<2.3,c.name+' vertical bounds');assert.ok(Math.abs(p.x)<1&&Math.abs(p.z)<1,c.name+' reach bounds');}
      }
      m.stopAllAction();
    }
    const death=clips.find(c=>c.name==='Death'), action=m.clipAction(death);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();m.setTime(death.duration);gltf.scene.updateMatrixWorld(true);
    assert.ok(bones.Hips.position.y<hipY-.5,'death lowers the pelvis');
    assert.ok(bones.Head.getWorldPosition(new THREE.Vector3()).y<.8,'death ends lying down');
    action.reset();action.clampWhenFinished=true;action.play();
    for(const phase of [.25,.5,.75,1]){
      m.setTime(death.duration*phase);gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();assert.ok(o.boundingBox.min.y>-.04,'death must not sink through floor');}});
    }

    m.stopAllAction();m.uncacheRoot(gltf.scene);
  });
}
