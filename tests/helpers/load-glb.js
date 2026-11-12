import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function loadGLB(path) {
 const bytes=fs.readFileSync(path), jsonLength=bytes.readUInt32LE(12);
 const json=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
 for(const mesh of json.meshes)for(const pr of mesh.primitives)delete pr.material;
 delete json.materials;delete json.textures;delete json.images;
 delete json.extensionsRequired;
 const raw=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(padded);
 const bin=bytes.subarray(20+jsonLength),glb=Buffer.alloc(20+padded.length+bin.length);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(padded.length,12);glb.writeUInt32LE(0x4e4f534a,16);padded.copy(glb,20);bin.copy(glb,20+padded.length);
 return {gltf:await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),''),json,bytes};
}
