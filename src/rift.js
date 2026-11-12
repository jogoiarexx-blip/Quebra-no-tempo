import * as THREE from 'three';
import { G } from './state.js';

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader = `
uniform float time, energy, halo; varying vec2 vUv;
float wave(float y){return sin(y*17.+time*1.7)*.055+sin(y*39.-time*2.3)*.023+sin(y*73.+time)*.012;}
void main(){
 vec2 p=vUv*2.-1.; float taper=pow(max(0.,1.-p.y*p.y),.65);
 float center=wave(p.y)*taper;
 float width=(.20+.055*sin(p.y*12.-time*2.)) * taper;
 float dist=abs(p.x-center); float edge=abs(dist-width);
 float inside=(1.-smoothstep(width-.03,width+.025,dist))*(1.-smoothstep(.88,1.,abs(p.y)));
 float rim=exp(-edge*85.)*taper;
 float glow=exp(-edge*12.)*taper;
 float filaments=pow(.5+.5*sin(p.y*27.-time*3.+sin(p.x*19.+time)),8.);
 vec3 col=mix(vec3(.015,.12,.40),vec3(.03,.7,.95),filaments*.7);
 col+=vec3(.45,.95,1.)*rim*2.0;
 float alpha=(inside*(.35+filaments*.3)+rim*.85+glow*.2)*(0.5+energy*.5);
 if(halo>.5){col=vec3(.02,.48,.9);alpha=glow*.22;}
 if(alpha<.008)discard;
 gl_FragColor=vec4(col,alpha);
}`;
const groundFragment = `uniform float time,energy;varying vec2 vUv;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);
float ring=exp(-abs(r-.55-.018*sin(a*9.+time))*95.);
float arcs=pow(max(0.,sin(a*13.+sin(r*28.)+time*.6)),18.)*exp(-abs(r-.4)*9.);
float alpha=(ring*.4+arcs*.3+exp(-r*r*5.)*.2)*(0.4+energy*.6)*(1.-smoothstep(.8,1.,r));
gl_FragColor=vec4(.02,.55,.85,alpha);}`;

export function createRift() {
  const group = new THREE.Group();
  const uniforms = { time: { value: 0 }, energy: { value: 0.2 }, halo: { value: 0 } };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.8), material); surface.position.y = 1.88; group.add(surface);
  const haloMat = material.clone(); haloMat.uniforms.time = uniforms.time; haloMat.uniforms.energy = uniforms.energy; haloMat.uniforms.halo.value = 1;
  const halo = new THREE.Mesh(surface.geometry, haloMat); halo.position.set(0, 1.88, -0.035); halo.scale.set(1.35, 1.05, 1); group.add(halo);
  const floorMat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader: groundFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = .016; group.add(floor);
  const shardMat = new THREE.MeshPhongMaterial({ color: 0x7d4318, emissive: 0xff7518, emissiveIntensity: .5, shininess: 70, side: THREE.DoubleSide });
  const shards = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 3), shardMat, 18); group.add(shards);
  const dummy = new THREE.Object3D();
  const data = Array.from({length:18},(_,i)=>({phase:i*2.39996,side:i%2?1:-1,y:.25+(i/18)*3.15,size:.09+(i%5)*.038}));
  const count = 96, positions = new Float32Array(count*3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const pm = new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(30./max(1.,-p.z),1.5,6.);}`,
    fragmentShader:`void main(){float r=length(gl_PointCoord-.5);float a=1.-smoothstep(.04,.5,r);if(a<.01)discard;gl_FragColor=vec4(.2,.85,1.,a*.8);}`});
  const particles = new THREE.Points(pg, pm); particles.frustumCulled = false; group.add(particles);
  const blue = new THREE.PointLight(0x30cfff, 1, 7, 1.8); blue.position.set(0,1.25,.7);
  const amber = new THREE.PointLight(0xff8c32, .25, 4, 2); amber.position.set(-.9,1.6,.25); group.add(blue,amber);
  // No full-screen postprocess: the layered additive halo remains affordable
  // on phones. Shards use one draw call and particles a fixed buffer.
  const o = {group,stable:false,flare:0,t:0,update(dt){
    o.t += dt; const t=o.t, low=G.settings.quality==='low';
    const energy=(o.stable?1:.28)+Math.max(0,o.flare);
    uniforms.time.value=t; uniforms.energy.value=energy;
    const pulse=1+.1*Math.sin(t*4.2)+.04*Math.sin(t*13.);
    surface.scale.x=(o.stable?1:.7)+o.flare*.4; halo.scale.x=surface.scale.x*1.4;
    blue.intensity=(o.stable?2.8:.9)*pulse+o.flare*2; amber.intensity=(low?.12:.3)*pulse; shardMat.emissiveIntensity=(.35+energy*.6)*pulse;
    for(let i=0;i<data.length;i++){const d=data[i],a=t*(.24+i*.018)+d.phase;
      dummy.position.set(d.side*(.52+.25*Math.sin(a)+d.size)+d.side*o.flare,d.y+Math.sin(a*1.8)*.11,Math.cos(a)*.28);
      dummy.rotation.set(a*.7,Math.sin(a),a*d.side);dummy.scale.set(d.size,d.size*(1.1+i%3*.25),d.size);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);
    }shards.instanceMatrix.needsUpdate=true;
    pg.setDrawRange(0,low?48:count);
    for(let i=0;i<count;i++){const f=(i/count+t*(.09+(i%7)*.009))%1,a=i*2.39996+t*.3,r=(1-f)*1.65;
      positions[i*3]=Math.cos(a)*r;positions[i*3+1]=.15+f*3.35;positions[i*3+2]=Math.sin(a)*r*.55;
    }pg.attributes.position.needsUpdate=true;
  }};
  o.update(0); return o;
}
