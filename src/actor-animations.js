// Clipes adicionais criados uma vez por asset (no carregamento, nunca no loop de render).
// v0.9: biblioteca ampliada — respiração/peso no idle, gestos de fala, canto, três mortes, reação por lado,
// arremesso, saque rápido, rajada de minigun, salto, golpe, recarga e rolamento; mira sintetizada para modelos
// que chegam sem clipe "Aim"; e medição da velocidade natural de caminhada/corrida (pés sem patinar).
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
const norm = name => name.replace(/^mixamorig[:_]?/, '');
const X = new THREE.Vector3(1,0,0), Y = new THREE.Vector3(0,1,0), Z = new THREE.Vector3(0,0,1);
const smooth = k => k*k*(3-2*k);
const easeOut = k => 1-Math.pow(1-k,3);
// curva "ataque-sustenta-solta" em [0,1]
const pulse = (u,a,b) => u<a?smooth(u/a):u<b?1:smooth(Math.max(0,1-(u-b)/(1-b)));
function groundClip(scene,clip){
  // Calibração no clone: amostras distribuídas e extremos da malha mantêm o corpo apoiado no piso em cada quadro.
  const model=cloneSkeleton(scene),samples=[],point=new THREE.Vector3();
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,ids=new Set();const stride=Math.max(1,Math.floor(p.count/3000));for(let i=0;i<p.count;i+=stride)ids.add(i);
    for(let axis=0;axis<3;axis++){let lo=Infinity,hi=-Infinity,li=0,hiI=0;for(let i=0;i<p.count;i++){const v=p.getComponent(i,axis);if(v<lo){lo=v;li=i;}if(v>hi){hi=v;hiI=i;}}ids.add(li);ids.add(hiI);}
    samples.push({mesh,ids:[...ids]});
  });
  const track=clip.tracks.find(t=>t.name.endsWith('.position')),mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(let i=0;i<track.times.length;i++){mixer.setTime(track.times[i]);model.updateMatrixWorld(true);let low=Infinity;for(const {mesh,ids}of samples){mesh.skeleton.update();for(const index of ids){mesh.getVertexPosition(index,point);point.applyMatrix4(mesh.matrixWorld);low=Math.min(low,point.y);}}if(Number.isFinite(low))track.values[i*3+1]+=.022-low;}
  mixer.stopAllAction();mixer.uncacheRoot(model);return clip;
}
// Velocidade natural (m/s, escala 1) de um clipe de locomoção "no lugar": velocidade do pé apoiado no chão.
export function measureGait(scene, clip){
  if(!clip)return null;
  const model=cloneSkeleton(scene),bones={};model.traverse(o=>{if(o.isBone)bones[norm(o.name)]=o;});
  const feet=['LeftFoot','RightFoot'].map(n=>bones[n]).filter(Boolean);if(feet.length<2)return null;
  const mixer=new THREE.AnimationMixer(model),act=mixer.clipAction(clip);act.play();
  const N=96,dt=clip.duration/N,tr=feet.map(()=>[]),w=new THREE.Vector3();
  for(let i=0;i<=N;i++){mixer.setTime(i*dt);model.updateMatrixWorld(true);feet.forEach((f,k)=>{f.getWorldPosition(w);tr[k].push([w.y,w.z]);});}
  mixer.stopAllAction();mixer.uncacheRoot(model);
  const speeds=[];
  for(const s of tr){const ys=s.map(q=>q[0]),lo=Math.min(...ys),hi=Math.max(...ys),lim=lo+(hi-lo)*.12+.004;
    for(let i=0;i<N;i++)if(s[i][0]<lim&&s[i+1][0]<lim){const v=(s[i][1]-s[i+1][1])/dt;if(v>0)speeds.push(v);}}
  if(speeds.length<4)return null;speeds.sort((a,b)=>a-b);return speeds[Math.floor(speeds.length/2)];
}
// Resolve poses de braço no espaço do modelo (personagem olha para +Z; a direita dele é -X). Funciona em qualquer
// esqueleto mixamo, porque mede a direção real de cada osso em vez de supor o eixo local.
function makeSolver(scene, idle){
  const model=cloneSkeleton(scene),bones={};model.traverse(o=>{if(o.isBone)bones[norm(o.name)]=o;});
  const mixer=new THREE.AnimationMixer(model);mixer.clipAction(idle).play();mixer.setTime(0);model.updateMatrixWorld(true);
  const rest=new Map(Object.values(bones).map(b=>[b,b.quaternion.clone()]));
  const a=new THREE.Vector3(),b=new THREE.Vector3(),q=new THREE.Quaternion(),pq=new THREE.Quaternion(),wq=new THREE.Quaternion();
  const CHAIN={RightArm:'RightForeArm',RightForeArm:'RightHand',LeftArm:'LeftForeArm',LeftForeArm:'LeftHand'};
  const solve=(spec)=>{
    for(const [bn,qq] of rest)bn.quaternion.copy(qq);model.updateMatrixWorld(true);
    const out={};
    for(const [name,dir] of spec){const bone=bones[name],child=bones[CHAIN[name]];if(!bone||!child)continue;
      bone.getWorldPosition(a);child.getWorldPosition(b);const cur=b.sub(a).normalize();q.setFromUnitVectors(cur,new THREE.Vector3(...dir).normalize());
      bone.getWorldQuaternion(wq);bone.parent.getWorldQuaternion(pq);bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));model.updateMatrixWorld(true);out[name]=bone.quaternion.clone();}
    return out;
  };
  solve.dispose=()=>{mixer.stopAllAction();mixer.uncacheRoot(model);};
  return solve;
}
// Mira sintetizada: apontar braço/antebraço para direções no espaço do modelo (personagem olha para +Z).
function synthAim(scene, idle){
  const model=cloneSkeleton(scene),bones={};model.traverse(o=>{if(o.isBone)bones[norm(o.name)]=o;});
  if(!bones.RightArm||!bones.LeftArm)return null;
  const mixer=new THREE.AnimationMixer(model);mixer.clipAction(idle).play();mixer.setTime(0);model.updateMatrixWorld(true);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),q=new THREE.Quaternion(),pq=new THREE.Quaternion(),wq=new THREE.Quaternion();
  const point=(bone,child,dir)=>{if(!bone||!child)return;model.updateMatrixWorld(true);bone.getWorldPosition(a);child.getWorldPosition(b);const cur=b.sub(a).normalize();
    q.setFromUnitVectors(cur,dir.clone().normalize());bone.getWorldQuaternion(wq);bone.parent.getWorldQuaternion(pq);bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));model.updateMatrixWorld(true);};
  // arma na altura do peito, cano para frente; braço esquerdo cruza para segurar o guarda-mão
  point(bones.RightArm,bones.RightForeArm,new THREE.Vector3(-.28,-.5,.82));
  point(bones.RightForeArm,bones.RightHand,new THREE.Vector3(.12,.08,1));
  point(bones.LeftArm,bones.LeftForeArm,new THREE.Vector3(.3,-.42,.86));
  point(bones.LeftForeArm,bones.LeftHand,new THREE.Vector3(-.62,.1,.78));
  const tracks=[];
  for(const [n,bn] of Object.entries(bones)){const v=bn.quaternion.toArray();tracks.push(new THREE.QuaternionKeyframeTrack(bn.name+'.quaternion',[0,1],[...v,...v]));}
  mixer.stopAllAction();mixer.uncacheRoot(model);
  return new THREE.AnimationClip('Aim',1,tracks);
}
export function makeActorClips(scene, animations, assetName) {
  const idle=animations.find(c=>c.name==='Idle');
  if(!idle) return [];
  const bones={};scene.traverse(o=>{if(o.isBone)bones[norm(o.name)]=o;});
  const base=new Map(idle.tracks.map(t=>[t.name,Array.from(t.createInterpolant().evaluate(0))]));
  const quat=(bone)=>{const b=bones[bone];if(!b)return null;return new THREE.Quaternion().fromArray(base.get(b.name+'.quaternion')||b.quaternion.toArray());};
  const root=bones.Hips, hip=base.get(root.name+'.position')||root.position.toArray();
  const solve=makeSolver(scene,idle);
  const P_={
    throwWind:solve([['RightArm',[-.45,.6,-.66]],['RightForeArm',[0,.95,.3]],['LeftArm',[.3,-.15,.94]],['LeftForeArm',[.15,.35,.92]]]),
    throwRel:solve([['RightArm',[-.15,.2,.96]],['RightForeArm',[-.05,-.15,1]],['LeftArm',[.45,-.85,-.25]],['LeftForeArm',[.3,-.9,.1]]]),
    draw:solve([['RightArm',[-.12,.02,1]],['RightForeArm',[-.02,.03,1]],['LeftArm',[.25,-.95,.05]],['LeftForeArm',[.2,-.95,.15]]]),
    meleeWind:solve([['RightArm',[-.6,-.3,-.6]],['RightForeArm',[-.1,.5,.85]],['LeftArm',[.2,-.4,.9]],['LeftForeArm',[-.5,.2,.85]]]),
    meleeHit:solve([['RightArm',[-.1,.12,.99]],['RightForeArm',[.3,.25,.9]],['LeftArm',[.25,0,.97]],['LeftForeArm',[-.3,.1,.95]]]),
    reload:solve([['RightArm',[-.3,-.55,.78]],['RightForeArm',[.45,.15,.88]],['LeftArm',[.25,-.75,.6]],['LeftForeArm',[-.55,.5,.67]]]),
    sing:solve([['RightArm',[-.8,.32,.5]],['RightForeArm',[-.55,.45,.7]],['LeftArm',[.3,-.85,.42]],['LeftForeArm',[-.35,.6,.72]]]),
    jump:solve([['RightArm',[-.62,-.55,.25]],['RightForeArm',[-.35,-.1,.75]],['LeftArm',[.62,-.55,.25]],['LeftForeArm',[.35,-.1,.75]]]),
  };
  solve.dispose();
  // keys: [[u, pose|null(base)], ...] em ordem; transição suavizada entre chaves
  const blendAt=(keys,u)=>{let i=0;while(i<keys.length-2&&u>keys[i+1][0])i++;const [u0,a]=keys[i],[u1,b]=keys[i+1],k=smooth(Math.min(1,Math.max(0,(u-u0)/Math.max(1e-6,u1-u0))));
    const out={};for(const bn of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){const qa=(a&&a[bn])||quat(bn),qb=(b&&b[bn])||quat(bn);out[bn]=qa.clone().slerp(qb,k);}return out;};
  const KEYS={Throw:[[0,null],[.42,P_.throwWind],[.58,P_.throwRel],[.8,P_.throwRel],[1,null]],Draw:[[0,null],[.22,P_.draw],[.7,P_.draw],[1,null]],
    Melee:[[0,null],[.3,P_.meleeWind],[.5,P_.meleeHit],[.75,P_.meleeHit],[1,null]],Reload:[[0,null],[.2,P_.reload],[.8,P_.reload],[1,null]],
    Sing:[[0,P_.sing],[.5,P_.sing],[1,P_.sing]],Jump:[[0,P_.jump],[1,P_.jump]]};
  const build=(name,duration,count=41)=>{
    const times=Float32Array.from({length:count},(_,i)=>duration*i/(count-1));
    const values={};for(const b of Object.keys(bones))values[b]=[];
    const positions=[];
    for(let i=0;i<count;i++){
      const u=i/(count-1),s=Math.sin(u*Math.PI*2),s2=Math.sin(u*Math.PI*4),c=Math.cos(u*Math.PI*2),e=Math.sin(u*Math.PI);
      const offsets={},pos=[...hip];
      const add=(b,axis,angle)=>{if(!bones[b]||!angle)return;const q=offsets[b]||(offsets[b]=new THREE.Quaternion());q.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));};
      switch(name){
        case 'RelaxedIdle': // respiração + troca de peso lenta + olhar ao redor
          add('Spine1',X,s*.025);add('Spine2',X,s*.03);add('Spine',Z,Math.sin(u*Math.PI*2)*.035);
          add('Head',Y,Math.sin(u*Math.PI*2+1)*.12);add('Head',X,s2*.02);add('LeftArm',Z,-s*.03);add('RightArm',Z,s*.03);break;
        case 'BartenderIdle':add('Spine',X,.035+s*.03);add('RightForeArm',X,.10+s2*.17);add('LeftForeArm',X,-.08+s*.10);add('Head',Y,s*.055);break;
        case 'Greeting':{const k=pulse(u,.25,.75);add('RightArm',X,-k*.4);add('RightArm',Z,k*.25);add('RightForeArm',Z,k*.75);add('RightHand',Y,Math.sin(u*Math.PI*10)*k*.28);add('Head',X,-k*.08);add('Head',Z,k*.06);add('Spine1',Y,k*.06);break;}
        case 'Talk': // gestos alternados das duas mãos, cabeça acompanha
          add('RightForeArm',X,.12+s*.25);add('RightHand',Z,s2*.15);add('LeftForeArm',X,.08+Math.max(0,-s)*.22);add('LeftForeArm',Z,s2*.1);add('Head',X,s2*.06);add('Head',Y,s*.08);add('Spine',Y,s*.06);add('Spine1',X,c*.025);break;
        case 'Sing': // canto de palco: peito aberto, braço estendido ao público, balanço suave
          add('Spine1',X,-.06-s*.03);add('Spine2',X,-.04);add('Spine',Z,s*.06);add('Head',X,-.12+s2*.04);add('Head',Z,s*.07);add('RightArm',Y,s*.12);add('RightForeArm',Y,c*.1);break;
        case 'DanceIdle':case 'Performance':{const k=name==='Performance'?1.3:1;add('Spine',Z,s*.095*k);add('Spine1',Y,s2*.08*k);add('LeftArm',X,s*.14*k);add('RightArm',X,-s*.14*k);add('LeftForeArm',Z,s2*.18*k);add('RightForeArm',Z,-s2*.18*k);add('Head',Y,-s*.08);break;}
        case 'HitReaction':{const k=pulse(u,.18,.35);add('Spine',X,-k*.34);add('Spine1',X,-k*.12);add('Head',X,k*.2);add('LeftForeArm',X,-k*.22);add('RightForeArm',X,-k*.18);add('LeftArm',Z,-k*.12);add('RightArm',Z,k*.12);break;}
        case 'HitLeft':case 'HitRight':{const sg=name==='HitLeft'?1:-1,k=pulse(u,.18,.35);add('Spine',Y,sg*k*.38);add('Spine1',Z,sg*k*.16);add('Head',Y,sg*k*.28);add('Head',Z,-sg*k*.12);add(sg>0?'LeftArm':'RightArm',Z,-sg*k*.35);break;}
        case 'Attack':{const k=u<.2?easeOut(u/.2):smooth(1-(u-.2)/.8);add('Spine',X,-k*.14);add('Spine1',Y,-k*.05);add('RightArm',X,-k*.2);add('RightForeArm',X,-k*.18);add('LeftForeArm',X,-k*.1);add('Head',X,k*.06);break;}
        case 'Minigun': // rajada contínua: tremor rápido nos braços e tronco + peso recuado
          add('Spine',X,-.08+Math.sin(u*Math.PI*16)*.025);add('RightArm',X,Math.sin(u*Math.PI*16+1)*.04);add('LeftArm',X,Math.sin(u*Math.PI*16+2)*.04);add('Head',X,Math.sin(u*Math.PI*16)*.02);pos[1]=hip[1]-.03;break;
        case 'Throw':{ // arremesso por cima: tronco gira para trás na preparação e chicoteia na soltura
          const wind=u<.42?smooth(u/.42):Math.max(0,1-(u-.42)/.16),rel=u>.42?pulse((u-.42)/.58,.15,.5):0;
          add('Spine',Y,-wind*.35+rel*.3);add('Spine1',X,-wind*.08+rel*.2);add('Head',Y,wind*.12);break;}
        case 'Draw':{const k=u<.22?easeOut(u/.22):1-smooth(Math.max(0,(u-.7)/.3));add('Spine',Y,-k*.12);add('Head',Y,-k*.06);add('Spine1',X,k*.03);break;}
        case 'Death':{const k=smooth(Math.min(1,u*1.15)),b=Math.sin(Math.min(1,u*1.6)*Math.PI);add('Hips',X,-k*1.49);add('Spine',X,b*.25);add('Head',X,-b*.3);add('LeftArm',Z,-k*.45);add('RightArm',Z,k*.45);add('LeftUpLeg',X,-b*.35);add('RightUpLeg',X,-b*.2);pos[1]=hip[1]+(.18-hip[1])*k;break;}
        case 'DeathFront':{const kn=smooth(Math.min(1,u*2)),k=smooth(Math.max(0,(u-.25)/.75));add('LeftUpLeg',X,-kn*.9);add('RightUpLeg',X,-kn*.8);add('LeftLeg',X,kn*1.1);add('RightLeg',X,kn*1.0);
          add('Hips',X,k*1.45);add('Spine',X,k*.2);add('LeftArm',X,-k*.8);add('RightArm',X,-k*.7);add('Head',X,-k*.4);pos[1]=hip[1]+(.2-hip[1])*Math.max(kn*.45,k);break;}
        case 'DeathSpin':{const k=smooth(Math.min(1,u*1.1));add('Hips',Y,k*1.3);add('Hips',Z,k*1.45);add('Spine',Z,Math.sin(Math.min(1,u*1.5)*Math.PI)*.3);add('LeftArm',Z,-k*.8);add('RightArm',X,-k*.6);add('Head',Z,k*.3);pos[1]=hip[1]+(.2-hip[1])*k;break;}
        case 'StrafeLeft':case 'StrafeRight':{const sign=name==='StrafeLeft'?1:-1;add('LeftUpLeg',Z,s*.22*sign);add('RightUpLeg',Z,-s*.22*sign);add('LeftLeg',X,(1-c)*.12);add('RightLeg',X,(1+c)*.12);add('Spine',Z,-s*.045*sign);add('Spine',Y,sign*.08);add('Hips',Y,-sign*.08);add('LeftArm',X,s*.08);add('RightArm',X,-s*.08);pos[1]=hip[1]-Math.abs(s2)*.02;break;}
        case 'Jump':add('LeftUpLeg',X,-.7);add('RightUpLeg',X,-.35);add('LeftLeg',X,.9);add('RightLeg',X,.55);add('Spine',X,.08+s*.03);add('Head',X,-.06);break;
        case 'Melee':{const wind=u<.3?smooth(u/.3):Math.max(0,1-(u-.3)/.2);const hit=u>.3?pulse((u-.3)/.7,.15,.45):0;add('Spine',Y,wind*.45-hit*.5);add('Spine1',Y,wind*.18-hit*.22);add('Spine1',X,hit*.12);break;}
        case 'Reload':{const k=pulse(u,.2,.8);add('LeftForeArm',Y,Math.sin(u*Math.PI*6)*k*.12);add('Head',X,k*.24);add('Spine1',X,k*.06);break;}
        case 'Roll':add('Spine',X,.65+s*.1);add('Spine1',X,.35);add('Head',X,.4);add('LeftUpLeg',X,-1.3);add('RightUpLeg',X,-1.3);add('LeftLeg',X,1.6);add('RightLeg',X,1.6);add('LeftArm',X,-.6);add('RightArm',X,-.6);add('LeftForeArm',X,.9);add('RightForeArm',X,.9);pos[1]=hip[1]*.62;break;
      }
      const posed=KEYS[name]?blendAt(KEYS[name],u):null;
      for(const b of Object.keys(bones)){const q=posed&&posed[b]?posed[b].clone():quat(b);if(offsets[b])q.multiply(offsets[b]);q.normalize();values[b].push(...q.toArray());}
      positions.push(...pos);
    }
    const tracks=Object.entries(values).map(([b,v])=>new THREE.QuaternionKeyframeTrack(bones[b].name+'.quaternion',times,v));
    tracks.push(new THREE.VectorKeyframeTrack(root.name+'.position',times,positions));
    return new THREE.AnimationClip(name,duration,tracks);
  };
  const out=[build('RelaxedIdle',4.2,61),build('BartenderIdle',4),build('Greeting',1.5),build('Talk',2.2,51),build('Sing',3.6,61),build('DanceIdle',2.2),build('Performance',2.8),
    build('HitReaction',.42,21),build('HitLeft',.42,21),build('HitRight',.42,21),build('Attack',.26,13),build('Minigun',.5,33),build('Throw',.75,31),build('Draw',.55,23),
    groundClip(scene,build('Death',.9)),groundClip(scene,build('DeathFront',1.0)),groundClip(scene,build('DeathSpin',.95)),
    build('Jump',.6,13),build('Melee',.34,17),build('Reload',1.2,31),build('Roll',.5,5)];
  const walk=animations.find(c=>c.name==='Walking')||idle;
  const backwards=walk.clone();backwards.name='WalkBackward';
  for(const track of backwards.tracks){const size=track.getValueSize(),old=track.values.slice();for(let i=0;i<track.times.length;i++)for(let j=0;j<size;j++)track.values[i*size+j]=old[(track.times.length-1-i)*size+j];if(track.name.endsWith('.position'))for(let i=0;i<track.times.length;i++){track.values[i*size]=old[0];track.values[i*size+2]=old[2];}}
  out.push(backwards,build('StrafeLeft',1),build('StrafeRight',1));
  if(!animations.some(c=>c.name==='Aim')){const aim=synthAim(scene,idle);if(aim)out.push(aim);}
  return out;
}
