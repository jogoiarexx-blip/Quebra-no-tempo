// Arquitetura de acabamento sem colisores. Uma malha estática por material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const FONT={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[31,4,4,4,4,4,31],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4]};
function signsTexture(){
 const w=256,h=128,data=new Uint8Array(w*h*4),words=['OFICINA','SAIDA','VESPERA','BAR','METRO','ALTA TENSAO','SERVICO','TURBINAS'];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;data.set([12,19,27,255],i);}
 for(let k=0;k<words.length;k++){
  const ox=(k%2)*128,oy=Math.floor(k/2)*32;
  for(let y=0;y<32;y++)for(let x=0;x<128;x++)if(x<2||x>125||y<2||y>29)data.set([45,177,188,255],((oy+y)*w+ox+x)*4);
  const text=words[k],scale=text.length>9?1:2,start=ox+(128-text.length*6*scale)/2;
  for(let c=0;c<text.length;c++)for(let row=0;row<7;row++)for(let col=0;col<5;col++)if((FONT[text[c]]?.[row]||0)&(1<<(4-col)))for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++)data.set([225,231,200,255],((oy+Math.floor((32+7*scale)/2)-1-row*scale-sy)*w+Math.floor(start+c*6*scale+col*scale+sx))*4);
 }
 const tex=new THREE.DataTexture(data,w,h);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;tex.needsUpdate=true;return tex;
}
export function improveMissionScenery(L,id){
 if(L.sceneryDetails?.stats.missionId===id)return L.sceneryDetails.stats;
 if(!['A1-M1','A1-M2'].includes(id))return {missionId:id,drawCalls:0,triangles:0,features:[]};
 const group=new THREE.Group();group.name='environment_details_'+id;L.root.add(group);
 const bins=new Map(),M=L.M;
 const add=(mat,g)=>{if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(g);};
 const box=(mat,x,y,z,w,h,d,rz=0)=>{const g=new THREE.BoxGeometry(w,h,d);g.rotateZ(rz);g.translate(x,y,z);add(mat,g);};
 const cylinder=(mat,x,y,z,r,h,rx=0,rz=0)=>{const g=new THREE.CylinderGeometry(r,r,h,8);g.rotateX(rx);g.rotateZ(rz);g.translate(x,y,z);add(mat,g);};
 const line=(mat,a,b,r=.025)=>{const v=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.sub(v);const g=new THREE.CylinderGeometry(r,r,delta.length(),6);g.applyMatrix4(new THREE.Matrix4().compose(v.addScaledVector(delta,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),new THREE.Vector3(1,1,1)));add(mat,g);};
 const signMat=new THREE.MeshBasicMaterial({map:signsTexture(),side:THREE.DoubleSide});
 const sign=(index,x,y,z,w=2,h=.7,ry=0)=>{const g=new THREE.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(index%2+uv.getX(i))*.5,(Math.floor(index/2)+uv.getY(i))*.25);g.rotateY(ry);g.translate(x,y,z);add(signMat,g);};
 const glowData=new Uint8Array(16*4);for(let i=0;i<16;i++)glowData.set([50,210,255,Math.round(Math.sin((i+.5)/16*Math.PI)*90)],i*4);
 const glowTex=new THREE.DataTexture(glowData,16,1);glowTex.needsUpdate=true;
 const glow=new THREE.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending});
 const features=[];
 if(id==='A1-M1'){
  features.push('workshop','facades','street','transformers');
  sign(0,0,3.65,.04,4.5,.65);sign(1,0,3.6,11.98,1.4,.38,Math.PI);
  // Prateleiras e ferramentas dentro dos volumes existentes da garagem.
  for(let i=0;i<3;i++){box(M.metal,-5.84,1.15+i*.75,4.2,.15,.08,3);for(let j=0;j<5;j++){box(M.wood,-5.65,1.38+i*.75,3+j*.53,.23,.38,.30);}}
  for(let i=0;i<9;i++)box(M.rail,2.5+i*.31,1.18,11.5,.10,.25+(i%3)*.06,.10);
  for(let side of [-1,1]){
   for(let z=16;z<39;z+=5){box(M.metal,side*3.91,4.5,z,.14,.6,1.2);for(let y=3.3;y<8.5;y+=1.5){box(M.rail,side*3.89,y,z,.16,.08,1.3);box(M.dark,side*3.84,y+.4,z,.10,.7,1.1);}}
   for(let z=44;z<78;z+=6){box(M.concrete,side*13.72,.10,z,.40,.18,5.8);for(let y=3;y<12;y+=3){box(M.metal,side*13.91,y,z,.16,.25,2);box(M.rail,side*13.82,y+.8,z,.32,.8,1);box(M.dark,side*13.61,y+.8,z,.05,.46,.76);}}
  }
  for(let z=43;z<78;z+=4.4){box(M.white,0,.024,z,.10,.012,2.1);box(M.neonAmber,.20,.025,z,.07,.014,2.1);}
  for(let z of [18,28,36,47,65,104,121]){box(M.dark,-2.9,.026,z,.65,.016,.6);for(let j=0;j<5;j++)box(M.rail,-3.16+j*.13,.04,z,.04,.018,.55);}
  for(let z of [20,33,53,69])line(M.dark,[-3.8,7.9,z],[3.8,7.5,z+.8],.028);
  sign(5,13.75,3.6,70,2,.65,-Math.PI/2);sign(2,0,6,95.94,5,1.2);
  for(let x of [-11,11])for(let z of [188,200,211]){
   cylinder(M.metal,x,5.3,z,.70,2.4);for(let y=4.6;y<6.5;y+=.2)box(M.dark,x,y,z,1.65,.04,1.6);
   for(let dx of [-.46,.46]){cylinder(M.rust,x+dx,7.2,z,.10,1.5);for(let y=6.7;y<7.7;y+=.16)cylinder(M.rail,x+dx,y,z,.17,.05);}
   line(M.dark,[x,7.8,z],[x,8.2,z+4],.055);
  }
  for(let z=138;z<170;z+=2){box(M.rail,-3,5.4,z,.08,1.1,.06);box(M.rail,3,5.4,z,.08,1.1,.06);}
  for(let side of [-1,1])box(M.neonCyan,side*2.96,4.06,153,.07,.05,30);
  sign(5,0,7.2,213,3,.8,Math.PI);
 }else{
  features.push('bar','stage','backstage','metro');
  sign(2,0,5.7,50.18,5,1.3,Math.PI);sign(3,-13.70,2.05,31,2.1,.55,Math.PI/2);
  for(let z=26;z<=37;z+=1.1){cylinder(M.rail,-10.68,1.21,z,.055,.2);cylinder(M.neonAmber,-10.68,1.25,z,.045,.10);}
  for(let y of [1.1,1.75,2.35]){box(M.rail,-13.72,y,31.7,.15,.055,12);}
  for(let i=0;i<24;i++){const z=25.7+i*.5,y=1.32+(i%3)*.6;cylinder([M.neonCyan,M.neonAmber,M.neonGreen][i%3],-13.79,y,z,.055,.22);cylinder(M.rail,-13.79,y+.15,z,.027,.10);}
  for(let z of [25,35,46]){line(M.metal,[-14,6.8,z],[14,6.8,z],.065);for(let x=-13;x<14;x+=1.5){line(M.rail,[x,6.65,z-.14],[x+.65,6.95,z+.14]);line(M.rail,[x+.65,6.95,z+.14],[x+1.3,6.65,z-.14]);}}
  for(let x of [-8.2,8.2])for(let y of [1.5,2.2,2.9]){box(M.dark,x,y,48.5,.6,.68,.65);cylinder(M.metal,x,y,48.13,.22,.055,Math.PI/2);}
  for(let z of [26,29,32,35,38]){box(M.neonViolet,-14.41,3.9,z,.04,.06,1.8);const g=new THREE.PlaneGeometry(.35,1.85);g.rotateY(Math.PI/2);g.translate(-14.39,3.9,z);add(glow,g);}
  for(let z of [53,57,62]){sign(6,14.48,2.2,z,1.4,.45,Math.PI/2);for(let y of [.4,2.3])line(M.metal,[15,y,z],[20,y,z],.055);}
  sign(1,0,2.8,22.58,1.6,.4);sign(4,-14.68,-6.2,76,2,.6,Math.PI/2);
  for(let z=75;z<153;z+=5){
   for(let side of [-1,1]){box(M.rust,side===-1?-14.78:-8.22,-6.7,z,.18,4.0,.22);for(let y of [-7.7,-6.5,-5.5])cylinder(M.metal,side===-1?-14.6:-8.4,y,z,.075,4.8,Math.PI/2);}
   box(M.neonAmber,-14.55,-5.2,z,.08,.09,1.6);box(M.concrete,-11.5,-8.93,z,5.8,.04,.2);
  }
 }
 let triangles=0;const bounds=new THREE.Box3();
 for(const [material,geos]of bins){const geo=mergeGeometries(geos,false);for(const g of geos)g.dispose();geo.computeBoundingBox();bounds.union(geo.boundingBox);const mesh=new THREE.Mesh(geo,material);mesh.castShadow=false;mesh.matrixAutoUpdate=false;mesh.updateMatrix();group.add(mesh);triangles+=(geo.index?.count||geo.attributes.position.count)/3;}
 // Every created texture is attached to a visible material; neither map is cached across levels.
 for(const mat of [signMat,glow])if(!bins.has(mat)){mat.map.dispose();mat.dispose();}
 const stats={missionId:id,drawCalls:group.children.length,triangles,features,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
 L.sceneryDetails={group,stats};return stats;
}
