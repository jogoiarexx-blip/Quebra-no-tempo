import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { addCollider, clearColliders, colliders } from '../src/physics.js';
import { improveMissionScenery } from '../src/scenery-details.js';

const materialKeys = ['asphalt', 'wet', 'concrete', 'brick', 'metal', 'rust', 'wood', 'dark', 'rail', 'white', 'hazard', 'bar', 'velvet', 'neonPink', 'neonCyan', 'neonAmber', 'neonViolet', 'neonGreen', 'neonRed'];
function level() {
  const L = { root: new THREE.Group(), M: {}, pts: { gate: new THREE.Vector3(0, 4, 212) }, interact: { fuse: new THREE.Vector3(-11, 1, 88) }, lights: [], anim: [] };
  materialKeys.forEach((k, i) => { L.M[k] = new THREE.MeshBasicMaterial({ color: 0x112233 + i * 113 }); });
  L.B = L.D = L.light = () => { throw new Error('detail pass must not invoke collision or lighting builders'); };
  return L;
}
function inspect(root) {
  let triangles = 0, meshes = 0, drawCalls = 0;
  const bounds = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    assert.ok(!o.isLight, 'no new real lights');
    if (!o.isMesh) return;
    meshes++;
    assert.ok(!Array.isArray(o.material));
    assert.equal(o.geometry.groups.length, 0, 'one main-pass draw call per material batch');
    assert.equal(o.matrixAutoUpdate, false, 'details stay static');
    assert.equal(o.castShadow, false, 'small details do not add shadow-map draws');
    for (const attr of Object.values(o.geometry.attributes)) assert.ok(Array.from(attr.array).every(Number.isFinite));
    o.geometry.computeBoundingBox(); o.geometry.computeBoundingSphere();
    assert.ok(Number.isFinite(o.geometry.boundingSphere.radius));
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    drawCalls++;
  });
  return { meshes, triangles, drawCalls, bounds };
}

for (const id of ['A1-M1', 'A1-M2']) {
  test(`${id}: detailed static geometry is finite and within the rendering budget without a DOM`, () => {
    assert.equal(typeof document, 'undefined');
    const L = level(), stats = improveMissionScenery(L, id), actual = inspect(L.root);
    assert.equal(stats.missionId, id);
    assert.equal(stats.drawCalls, actual.drawCalls);
    assert.equal(stats.triangles, actual.triangles);
    assert.ok(actual.triangles > 2500, 'meaningful architectural detail');
    assert.ok(actual.triangles <= 35000);
    assert.ok(actual.drawCalls <= 24);
    assert.equal(L.root.children.length, 1, 'single owned detail group');
    assert.ok(L.sceneryDetails.group.parent === L.root);
    assert.deepEqual(stats.bounds.min, actual.bounds.min.toArray());
    assert.deepEqual(stats.bounds.max, actual.bounds.max.toArray());
    assert.equal(L.anim.length, 0, 'no per-object animation work');
    assert.equal(L.lights.length, 0, 'no new logical lights competing with the pool');
  });

  test(`${id}: collision, landmarks and interaction references remain untouched; repeat calls are idempotent`, () => {
    clearColliders();
    const col = addCollider(-1, 1, 0, 3, 10, 11, { door: 'preserved' });
    const L = level(), gate = L.pts.gate, fuse = L.interact.fuse;
    L.doors = { test: { col } };
    const before = JSON.stringify(colliders), pts = JSON.stringify(L.pts), interaction = JSON.stringify(L.interact);
    const stats = improveMissionScenery(L, id), count = L.root.children.length;
    assert.equal(improveMissionScenery(L, id), stats);
    assert.equal(L.root.children.length, count);
    assert.equal(colliders.length, 1); assert.equal(colliders[0], col);
    assert.equal(JSON.stringify(colliders), before);
    assert.equal(JSON.stringify(L.pts), pts); assert.equal(L.pts.gate, gate);
    assert.equal(JSON.stringify(L.interact), interaction); assert.equal(L.interact.fuse, fuse);
    assert.equal(L.doors.test.col, col);
    clearColliders();
  });
}

test('missions have distinct authored areas and deterministic output; unknown missions are skipped', () => {
  const a = level(), b = level(), c = level();
  const m1 = improveMissionScenery(a, 'A1-M1'), m2 = improveMissionScenery(b, 'A1-M2');
  assert.ok(m1.features.includes('workshop') && m1.features.includes('transformers'));
  assert.ok(m2.features.includes('bar') && m2.features.includes('metro'));
  assert.ok(m1.bounds.max[2] > 210 && m1.bounds.min[1] >= 0);
  assert.ok(m2.bounds.min[1] < -8 && m2.bounds.max[2] > 150);
  assert.notEqual(m1.triangles, m2.triangles);
  assert.deepEqual(improveMissionScenery(c, 'A1-M1'), m1);
  const unknown = level();
  const result = improveMissionScenery(unknown, 'A1-M3');
  assert.equal(result.drawCalls, 0); assert.equal(result.triangles, 0);
  assert.equal(unknown.root.children.length, 0);
});

test('every new GPU resource is reachable by the existing root-traversal disposal contract', () => {
  const L = level(); improveMissionScenery(L, 'A1-M2');
  const ownedMats = new Set(), ownedMaps = new Set(), geos = new Set();
  let disposedGeo = 0, disposedMat = 0, disposedMap = 0;
  L.root.traverse(o => {
    if (!o.isMesh) return;
    geos.add(o.geometry); o.geometry.addEventListener('dispose', () => disposedGeo++);
    if (!Object.values(L.M).includes(o.material)) {
      ownedMats.add(o.material); o.material.addEventListener('dispose', () => disposedMat++);
      if (o.material.map) { ownedMaps.add(o.material.map); o.material.map.addEventListener('dispose', () => disposedMap++); }
    }
  });
  // Mirror world.js without importing its browser-only texture construction.
  L.root.traverse(o => {
    o.geometry?.dispose();
    if (o.material && !Object.values(L.M).includes(o.material)) {
      if (o.material.map && !Object.values(L.M).some(m => m.map === o.material.map)) o.material.map.dispose();
      o.material.dispose();
    }
  });
  assert.equal(disposedGeo, geos.size);
  assert.equal(disposedMat, ownedMats.size);
  assert.equal(disposedMap, ownedMaps.size);
  assert.ok(ownedMaps.size > 0, 'procedural signage and diffusion textures are owned by visible batches');
});
