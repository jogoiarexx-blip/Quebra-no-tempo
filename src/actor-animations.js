// Clipes adicionais criados uma vez por asset. Mantêm raiz em posição local e pés das poses sociais.
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
const norm = name => name.replace(/^mixamorig[:_]?/, '');
const X = new THREE.Vector3(1,0,0), Y = new THREE.Vector3(0,1,0), Z = new THREE.Vector3(0,0,1);
function groundDeath(scene,clip){
  // Calibração no clone: amostras distribuídas e extremos da malha mantêm o corpo sobre o piso.
  // Executado uma vez no carregamento, nunca no loop de render.
  const model=cloneSkeleton(scene),samples=[],point=new THREE.Vector3();
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,ids=new Set();const stride=Math.max(1,Math.floor(p.count/512));for(let i=0;i<p.count;i+=stride)ids.add(i);
    for(let axis=0;axis<3;axis++){let lo=Infinity,hi=-Infinity,li=0,hiI=0;for(let i=0;i<p.count;i++){const v=p.getComponent(i,axis);if(v<lo){lo=v;li=i;}if(v>hi){hi=v;hiI=i;}}ids.add(li);ids.add(hiI);}
    samples.push({mesh,ids:[...ids]});
  });
  const track=clip.tracks.find(t=>t.name.endsWith('.position')),mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(let i=0;i<track.times.length;i++){mixer.setTime(track.times[i]);model.updateMatrixWorld(true);let low=Infinity;for(const {mesh,ids}of samples){mesh.skeleton.update();for(const index of ids){mesh.getVertexPosition(index,point);point.applyMatrix4(mesh.matrixWorld);low=Math.min(low,point.y);}}if(Number.isFinite(low))track.values[i*3+1]+=.018-low;}
  mixer.stopAllAction();mixer.uncacheRoot(model);return clip;
}
export function makeActorClips(scene, animations, assetName) {
  const idle=animations.find(c=>c.name==='Idle');
  if(!idle) return [];
  const bones={};scene.traverse(o=>{if(o.isBone)bones[norm(o.name)]=o;});
  const base=new Map(idle.tracks.map(t=>[t.name,Array.from(t.createInterpolant().evaluate(0))]));
  const quat=(bone)=>{const b=bones[bone];if(!b)return null;return new THREE.Quaternion().fromArray(base.get(b.name+'.quaternion')||b.quaternion.toArray());};
  const root=bones.Hips, hip=base.get(root.name+'.position')||root.position.toArray();
  const build=(name,duration,pose)=>{
    const count=41,times=Float32Array.from({length:count},(_,i)=>duration*i/(count-1));
    const values={};for(const b of Object.keys(bones))values[b]=[];
    const positions=[];
    for(let i=0;i<count;i++){
      const u=i/(count-1),s=Math.sin(u*Math.PI*2),s2=Math.sin(u*Math.PI*4),e=Math.sin(u*Math.PI);
      const offsets={},pos=[...hip];
      const add=(b,axis,angle)=>{if(!bones[b])return;const q=offsets[b]||(offsets[b]=new THREE.Quaternion());q.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));};
      if(name==='RelaxedIdle'){add('Spine',X,s*.04);add('Head',Y,s*.055);}
      if(name==='BartenderIdle'){add('Spine',X,.035+s*.03);add('RightForeArm',X,.10+s2*.17);add('LeftForeArm',X,-.08+s*.10);add('Head',Y,s*.055);}
      if(name==='Greeting'){add('RightArm',X,-e*.34);add('RightForeArm',Z,e*.65);add('RightHand',Y,Math.sin(u*Math.PI*8)*e*.24);add('Head',X,-e*.07);}
      if(name==='Talk'){add('RightForeArm',X,s*.23);add('LeftForeArm',Z,s2*.12);add('Head',X,s2*.065);add('Spine',Y,s*.065);}
      if(name==='DanceIdle'||name==='Performance'){const k=name==='Performance'?1.3:1;add('Spine',Z,s*.095*k);add('Spine1',Y,s2*.08*k);add('LeftArm',X,s*.14*k);add('RightArm',X,-s*.14*k);add('LeftForeArm',Z,s2*.18*k);add('RightForeArm',Z,-s2*.18*k);add('Head',Y,-s*.08);}
      if(name==='HitReaction'){add('Spine',X,-e*.32);add('Spine1',Z,e*.10);add('Head',X,e*.17);add('LeftForeArm',X,-e*.19);}
      if(name==='Attack'){add('Spine',X,-e*.12);add('RightArm',X,-e*.16);add('RightForeArm',X,-e*.14);add('Head',X,e*.05);}
      if(name==='Death'){const k=u*u*(3-2*u);add('Hips',X,-k*1.49);add('LeftArm',Z,-k*.20);add('RightArm',Z,k*.20);pos[1]=hip[1]+(.18-hip[1])*k;}
      if(name==='StrafeLeft'||name==='StrafeRight'){const sign=name==='StrafeLeft'?1:-1;add('LeftUpLeg',Z,s*.20*sign);add('RightUpLeg',Z,-s*.20*sign);add('LeftLeg',X,(1-Math.cos(u*Math.PI*2))*.10);add('RightLeg',X,(1-Math.cos(u*Math.PI*2))*.10);add('Spine',Z,-s*.045*sign);}
      for(const b of Object.keys(bones)){const q=quat(b);if(offsets[b])q.multiply(offsets[b]);q.normalize();values[b].push(...q.toArray());}
      positions.push(...pos);
    }
    const tracks=Object.entries(values).map(([b,v])=>new THREE.QuaternionKeyframeTrack(bones[b].name+'.quaternion',times,v));
    tracks.push(new THREE.VectorKeyframeTrack(root.name+'.position',times,positions));
    return new THREE.AnimationClip(name,duration,tracks);
  };
  const out=[build('RelaxedIdle',3.2),build('BartenderIdle',4),build('Greeting',1.35),build('Talk',1.7),build('DanceIdle',2.2),build('Performance',2.8),build('HitReaction',.42),build('Attack',.26),groundDeath(scene,build('Death',.85))];
  const walk=animations.find(c=>c.name==='Walking')||idle;
  const backwards=walk.clone();backwards.name='WalkBackward';
  for(const track of backwards.tracks){const size=track.getValueSize(),old=track.values.slice();for(let i=0;i<track.times.length;i++)for(let j=0;j<size;j++)track.values[i*size+j]=old[(track.times.length-1-i)*size+j];if(track.name.endsWith('.position'))for(let i=0;i<track.times.length;i++){track.values[i*size]=old[0];track.values[i*size+2]=old[2];}}
  out.push(backwards,build('StrafeLeft',1),build('StrafeRight',1));
  return out;
}
