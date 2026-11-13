import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {addCollider} from '../physics.js';

// Original low-poly mechanical actor: each articulated section is batched by material.
export function buildLeviathan(L){
 const root=new THREE.Group();root.name='Leviata_de_Aco';L.root.add(root);const M=L.M;
 function component(name,x,y,z,draw){
  const g=new THREE.Group();g.name=name;g.position.set(x,y,z);root.add(g);const bins=new Map();
  const part=(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{geo.rotateX(rx);geo.rotateY(ry);geo.rotateZ(rz);geo.translate(x,y,z);if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(geo);};
  const box=(mat,w,h,d,x=0,y=0,z=0,rz=0)=>part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,0,0,rz);
  draw(part,box);for(const[mat,geos]of bins){const m=new THREE.Mesh(mergeGeometries(geos),mat);geos.forEach(g=>g.dispose());m.castShadow=true;g.add(m);}return g;
 }
 const torso=component('chassi',0,0,0,(part,box)=>{
  box(M.dark,4.8,2.7,3.5,0,4.8,0);box(M.metal,5.3,.65,3.8,0,6.2,0);box(M.hazard,3.9,.22,3.9,0,3.5,0);
  for(const s of[-1,1]){box(M.metal,.5,2.3,3.9,s*2.45,4.9,0,s*.14);box(M.rust,.2,1.5,.2,s*1.7,4.8,-1.9);part(new THREE.CylinderGeometry(.32,.32,2.4,8),M.rust,s*1.55,6.9,1.3);}
  box(M.metal,2.2,1.1,2.2,0,7.15,-.35);box(M.dark,1.9,.6,.18,0,7.2,-1.55);box(M.neonRed,1.55,.13,.2,0,7.25,-1.66);box(M.hazard,.35,.4,2.3,0,7.6,-.35);
  for(let i=0;i<7;i++)box(M.rail,.075,.7,.12,-.6+i*.2,6.85,-1.62);
  part(new THREE.CylinderGeometry(1.5,1.7,.6,12),M.rail,0,3.1,0);box(M.dark,3,.6,2,0,2.6,0);
 });
 const legs=[-1,1].map(s=>component('perna_'+s,s*1.9,0,.2,(part,box)=>{
  box(M.metal,.9,2.5,1.25,0,1.9,0,s*.12);box(M.dark,1.8,.5,2.6,0,.3,-.5);box(M.hazard,1.82,.14,2.62,0,.6,-.5);
  part(new THREE.CylinderGeometry(.32,.32,1.4,10),M.rail,0,1.55,-.4,0,0,Math.PI/2);
  for(const q of[-1,1])part(new THREE.CylinderGeometry(.08,.08,2,6),M.rail,q*.45,1.7,-.5);box(M.rust,1.1,.6,1.5,0,1.5,-.2);
 }));
 const drill=component('broca',-3.5,4.8,0,(part,box)=>{
  box(M.metal,1.35,1.3,1.5,0,0,0);box(M.rust,.7,2.0,.9,0,-1.1,-.3);
  part(new THREE.ConeGeometry(.85,2.6,10),M.rail,0,-2.3,-.4,Math.PI);for(let i=0;i<5;i++)part(new THREE.TorusGeometry(.25+i*.12,.055,4,12),M.dark,0,-3.3+i*.38,-.4,Math.PI/2);
 });
 const cannon=component('metralhadora',3.4,5.2,-.6,(part,box)=>{
  box(M.metal,1.7,1.3,2.4);box(M.hazard,1.75,.25,2.45,0,-.3,0);for(const[x,y]of[[0,0],[-.22,-.2],[.22,-.2]])part(new THREE.CylinderGeometry(.15,.15,2.4,8),M.dark,x,y,-2,Math.PI/2);
  part(new THREE.CylinderGeometry(.46,.46,.24,12),M.rail,0,-.05,-2.9,Math.PI/2);
 });
 const flaps=[-1,1].map(s=>component('protecao_'+s,s*.65,4.7,-2.95,(part,box)=>{box(M.metal,1.28,2.3,.35);box(M.hazard,1.3,.35,.38,0,-.55,0);}));
 const core=L.mesh(new THREE.IcosahedronGeometry(.88,1),new THREE.MeshBasicMaterial({color:0xff9e43}),0,4.7,-2.6);L.root.remove(core);root.add(core);
 const rings=component('anel_nucleo',0,4.7,-2.24,(part)=>part(new THREE.TorusGeometry(1.18,.13,6,16),M.rail));
 const thrusters=[-1,1].map(s=>component('propulsor_'+s,s*3,3.1,.9,(part)=>{part(new THREE.CylinderGeometry(.55,.65,1.9,10),M.dark,0,0,0,Math.PI/2);part(new THREE.TorusGeometry(.45,.1,6,12),M.neonCyan,0,0,-1.02);}));
 const parts=[
  {part:'core',min:[-1.08,3.7,-3.45],max:[1.08,5.75,-1.9]},
  {part:'armor',min:[-2.7,2.3,-1.8],max:[2.7,7.8,2]},
  ...[-1,1].map(s=>({part:'thruster',min:[s*3-.65,2.2,-.3],max:[s*3+.65,4.0,2]}))
 ];
 for(const p of parts)p.col=addCollider(...[p.min[0],p.max[0],p.min[1],p.max[1],p.min[2]+136,p.max[2]+136],{bossPart:p.part,noBody:p.part==='core',noGrab:true});
 const marker=new THREE.Group();L.root.add(marker);
 const warningMat=new THREE.MeshBasicMaterial({color:0xffb53f,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false});
 const lane=new THREE.Mesh(new THREE.PlaneGeometry(3.6,66.6),warningMat);lane.rotation.x=-Math.PI/2;marker.add(lane);
 const circle=new THREE.Mesh(new THREE.RingGeometry(2.65,3,32),warningMat);circle.rotation.x=-Math.PI/2;marker.add(circle);
 const impact=L.mesh(new THREE.ConeGeometry(1.4,5,8),new THREE.MeshBasicMaterial({color:0xff5432,transparent:true,opacity:.65,wireframe:true}),0,2,120);impact.visible=false;
 function sync(b){for(const p of parts){p.col.enabled=b.mode!=='dead';p.col.min=[p.min[0]+b.x,p.min[1],p.min[2]+b.z];p.col.max=[p.max[0]+b.x,p.max[1],p.max[2]+b.z];}root.position.set(b.x,0,b.z);}
 function frame(b,dt,t){
  sync(b);const dead=b.mode==='dead',open=b.mode==='exposed'||dead;
  torso.rotation.x=dead?-.35:Math.sin(t*1.2)*.015;for(let i=0;i<2;i++){flaps[i].position.x=(i?1:-1)*(open?1.9:.65);legs[i].rotation.x=dead?0:b.mode==='reposition'?Math.sin(t*5+i*Math.PI)*.12:0;}
  drill.rotation.y+=dt*(b.pattern==='drill'&&b.mode==='warning'?8:1);cannon.rotation.x=b.mode==='attack'?-.18:0;
  core.material.color.setHex(dead?0x314452:open?0x5effcf:0xd64b2a);core.scale.setScalar(open?1+.06*Math.sin(t*7):.88);rings.rotation.z+=dt*(open?1.6:.2);
  root.position.y=dead?-1.7:0;marker.visible=b.mode==='warning'||b.mode==='attack';
  lane.visible=b.pattern==='lane';circle.visible=!lane.visible;
  if(b.target){lane.position.set(b.target.x,b.target.y+.045,131.8);circle.position.set(b.target.x,b.target.y+.05,b.target.z);circle.scale.setScalar(b.pattern==='pulse'?5/3:1);}
  warningMat.color.setHex(b.mode==='attack'?0xff3c35:0xffbd4a);warningMat.opacity=b.mode==='attack'?.65:.25+.15*Math.sin(t*12);
  if(impact.userData.life>0){impact.userData.life-=dt;impact.visible=true;impact.scale.setScalar(1+Math.max(0,.5-impact.userData.life));}else impact.visible=false;
 }
 return {root,parts,core,marker,sync,frame,impact};
}
