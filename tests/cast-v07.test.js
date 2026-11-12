import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { loadGLB } from './helpers/load-glb.js';

const report = JSON.parse(fs.readFileSync(new URL('../docs/CAST_OPTIMIZATION_v0_7_0.json', import.meta.url)));
const canonical = ['Idle', 'Walking', 'Running', 'Aim', 'Fall', 'Crouch'];
const entries = [
  ['porco_policial', '../models/enemies/porco-policial.glb', 2_500_000, 18_000, 22_000],
  ['boate', '../models/boate.glb', 2_000_000, 12_000, 16_000]
];

for (const [name, path, byteLimit, minTriangles, maxTriangles] of entries) {
  const { gltf, json, bytes } = await loadGLB(new URL(path, import.meta.url));
  const raw = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const meshes = [];
  gltf.scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  test(`${name}: orçamento, anatomia completa, UVs e mapas PBR`, () => {
    assert.ok(bytes.length <= byteLimit, `${bytes.length} bytes excedem o orçamento`);
    assert.equal(bytes.length, report[name].optimized_bytes);
    const count = raw.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, p) => n + raw.accessors[p.indices].count / 3, 0), 0);
    assert.ok(count >= minTriangles && count <= maxTriangles, `${count} triângulos`);
    assert.equal(count, report[name].optimized_triangles);
    assert.equal(raw.skins[0].joints.length, report[name].source_bones);
    assert.equal(meshes.length, 1);
    assert.deepEqual(report[name].missing_required_bones, []);
    for (const bone of ['Hips', 'Head', 'LeftArm', 'RightArm', 'LeftHand', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']) {
      assert.ok(raw.nodes.some(n => n.name.replace('mixamorig:', '') === bone), `osso ausente: ${bone}`);
    }
    assert.ok(raw.materials[0].normalTexture);
    assert.ok(raw.materials[0].pbrMetallicRoughness.baseColorTexture);
    assert.ok(raw.materials[0].pbrMetallicRoughness.metallicRoughnessTexture);
    for (const image of raw.images) assert.equal(image.mimeType, 'image/webp');
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position;
      const box = new THREE.Box3().setFromBufferAttribute(p);
      const size = box.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.y - 1.7) < .005, `altura bind ${size.y}`);
      assert.ok(Math.abs(box.min.y) < .005, `sola bind ${box.min.y}`);
      assert.ok(size.x > .65 && size.z > .2, 'malha conserva braços, tronco e profundidade');
      for (const attr of ['position', 'normal', 'uv', 'skinWeight']) {
        assert.ok(Array.from(mesh.geometry.attributes[attr].array).every(Number.isFinite), `${attr} finito`);
      }
      const w = mesh.geometry.attributes.skinWeight;
      const joints = mesh.geometry.attributes.skinIndex;
      for (let i = 0; i < w.count; i++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          const weight = w.getComponent(i, k);
          sum += weight;
          assert.ok(weight >= 0 && weight <= 1);
          assert.ok(joints.getComponent(i, k) < mesh.skeleton.bones.length);
        }
        assert.ok(Math.abs(sum - 1) < .002, `pesos normalizados no vértice ${i}: ${sum}`);
      }
    }
  });

  if(name==='boate')test('NPC A-pose: braços mantêm o lado anatômico após retarget para Idle',()=>{
    const mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='Idle')).play();mixer.update(0);gltf.scene.updateMatrixWorld(true);
    const bones={};gltf.scene.traverse(o=>{if(o.isBone)bones[o.name.replace(/^mixamorig[:_]?/,'')]=o;});
    for(const [side,sign]of[['Left',1],['Right',-1]]){
      assert.ok(bones[side+'Hand'].getWorldPosition(new THREE.Vector3()).x*sign>.15,'mão não deve atravessar o tronco para o lado oposto');
      assert.ok(bones[side+'ForeArm'].getWorldPosition(new THREE.Vector3()).x*sign>.15,'cotovelo permanece fora do tronco');
    }
    mixer.stopAllAction();
  });

  test(`${name}: clipes canônicos finitos e deformação estável`, () => {
    assert.deepEqual(gltf.animations.map(a => a.name), canonical);
    for (const anim of gltf.animations) {
      assert.ok(anim.validate(), anim.name);
      for (const track of anim.tracks) {
        assert.ok(Array.from(track.values).every(Number.isFinite), track.name);
        if (track.name.endsWith('.quaternion')) {
          for (let i = 0; i < track.values.length; i += 4) {
            assert.ok(Math.abs(Math.hypot(...track.values.slice(i, i + 4)) - 1) < .001, track.name);
          }
        }
      }
    }
    const mixer = new THREE.AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip).play();
      for (const phase of [0, .125, .25, .375, .5, .625, .75, .875]) {
        mixer.setTime(phase * clip.duration);
        gltf.scene.updateMatrixWorld(true);
        for (const mesh of meshes) {
          mesh.skeleton.update();
          mesh.computeBoundingBox();
          const size = mesh.boundingBox.getSize(new THREE.Vector3());
          assert.ok(size.toArray().every(Number.isFinite));
          assert.ok(size.x > .15 && size.x < 2 && size.y > .3 && size.y < 2.2 && size.z < 2,
            `${clip.name} ${phase}: dimensões deformadas ${size.toArray()}`);
        }
      }
      action.stop();
    }
  });

  test(`${name}: pés e dedos ficam acima do piso durante toda a locomoção`, () => {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const point = new THREE.Vector3();
    const samples = meshes.map(mesh => {
      const footJoints = new Set(mesh.skeleton.bones.map((b, i) => /Foot|Toe/.test(b.name) ? i : -1));
      const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
      const indices = [];
      for (let i = 0; i < position.count; i++) {
        let footWeight = 0;
        for (let k = 0; k < 4; k++) if (footJoints.has(skinIndex.getComponent(i, k))) footWeight += skinWeight.getComponent(i, k);
        if (footWeight > .15 && position.getY(i) < .3) indices.push(i);
      }
      assert.ok(indices.length > 20, 'geometria dos pés preservada');
      return { mesh, indices };
    });
    for (const clip of gltf.animations.filter(a => ['Idle', 'Walking', 'Running', 'Aim'].includes(a.name))) {
      const action = mixer.clipAction(clip).play();
      // Include every authored key and the midpoint between keys; these expose
      // floor penetration caused by quaternion interpolation after retargeting.
      const times = [...new Set(clip.tracks.flatMap(track => Array.from(track.times)))].sort((a, b) => a - b);
      const phases = times.flatMap((t, i) => i + 1 < times.length ? [t, (t + times[i + 1]) / 2] : [t]);
      for (const time of phases) {
        mixer.setTime(Math.min(time, clip.duration - 1e-7));
        gltf.scene.updateMatrixWorld(true);
        let low = Infinity;
        for (const { mesh, indices } of samples) {
          mesh.skeleton.update();
          for (const i of indices) {
            mesh.getVertexPosition(i, point);
            point.applyMatrix4(mesh.matrixWorld);
            low = Math.min(low, point.y);
          }
        }
        assert.ok(low >= -.002, `${clip.name} em ${time.toFixed(3)}s: sola afunda ${low.toFixed(4)}m`);
        assert.ok(low <= .025, `${clip.name} em ${time.toFixed(3)}s: sola flutua ${low.toFixed(4)}m`);
      }
      action.stop();
    }
  });
}
