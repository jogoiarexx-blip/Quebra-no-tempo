// Efeitos visuais econômicos: partículas em pool, traçantes, selos, Fenda de Saída, portal.
import * as THREE from 'three';
import { G } from './state.js';

const N = 500;
let pts, ppos, pcol, pvel, plife, pidx = 0;
const tracers = [], flashes = [], rings = [];
export function initFx(scene) {
  const g = new THREE.BufferGeometry();
  ppos = new Float32Array(N * 3).fill(-999); pcol = new Float32Array(N * 3); pvel = new Float32Array(N * 3); plife = new Float32Array(N);
  g.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); g.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; scene.add(pts);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; scene.add(m); tracers.push({ m, t: 0 });
  }
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; scene.add(m); flashes.push({ m, t: 0, dur: 1, size: 1 });
  }
}
const _c = new THREE.Color();
export function sparks(pos, color = 0xffc060, n = 8, speed = 4, life = 0.4) {
  _c.set(color);
  for (let k = 0; k < n; k++) {
    const i = pidx; pidx = (pidx + 1) % N;
    ppos[i * 3] = pos.x; ppos[i * 3 + 1] = pos.y; ppos[i * 3 + 2] = pos.z;
    const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = speed * (0.3 + Math.random() * 0.7), r = Math.sqrt(1 - u * u);
    pvel[i * 3] = Math.cos(a) * r * s; pvel[i * 3 + 1] = u * s + speed * 0.3; pvel[i * 3 + 2] = Math.sin(a) * r * s;
    pcol[i * 3] = _c.r; pcol[i * 3 + 1] = _c.g; pcol[i * 3 + 2] = _c.b; plife[i] = life * (0.5 + Math.random() * 0.5);
  }
}
export function tracer(a, b, color = 0xffe0a0) {
  const t = tracers.find((x) => x.t <= 0) || tracers[0];
  t.m.position.copy(a).add(b).multiplyScalar(0.5); t.m.lookAt(b); t.m.scale.z = Math.max(0.1, a.distanceTo(b)); t.m.material.color.set(color); t.m.visible = true; t.t = 0.07;
}
export function flash(pos, size = 0.3, dur = 0.06, color = 0xffc060) {
  const f = flashes.find((x) => x.t <= 0) || flashes[0];
  f.m.position.copy(pos); f.m.material.color.set(color); f.m.visible = true; f.t = dur; f.dur = dur; f.size = size;
}
export function shake(v) { if (G.settings.shake) G.shake = Math.max(G.shake, v); }
export function updateFx(dt) {
  for (let i = 0; i < N; i++) {
    if (plife[i] <= 0) continue;
    plife[i] -= dt; pvel[i * 3 + 1] -= 9 * dt;
    ppos[i * 3] += pvel[i * 3] * dt; ppos[i * 3 + 1] += pvel[i * 3 + 1] * dt; ppos[i * 3 + 2] += pvel[i * 3 + 2] * dt;
    if (plife[i] <= 0) ppos[i * 3 + 1] = -999;
  }
  pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true;
  for (const t of tracers) if (t.t > 0) { t.t -= dt; if (t.t <= 0) t.m.visible = false; }
  for (const f of flashes) if (f.t > 0) { f.t -= dt; const k = 1 - f.t / f.dur; f.m.scale.setScalar(f.size * (0.4 + k)); f.m.material.opacity = 0.9 * (1 - k); if (f.t <= 0) f.m.visible = false; }
  for (const r of rings) r.update(dt);
}

// Selo de Continuidade: três aros achatados girando em eixos diferentes (não é cristal/gema).
export function makeSeal() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffc35a });
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.34 - i * 0.09, 0.022, 6, 28), mat); r.scale.z = 0.5; g.add(r); }
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), new THREE.MeshBasicMaterial({ color: 0x35e6ff })); hand.position.y = 0.08; g.add(hand);
  const o = { group: g, t: 0, update(dt) { o.t += dt; g.children[0].rotation.set(o.t * 1.3, 0, 0); g.children[1].rotation.set(0, o.t * 1.9, 0.6); g.children[2].rotation.set(0.9, 0, o.t * 2.4); hand.rotation.z = -Math.floor(o.t * 2) * 0.5236; } };
  rings.push(o); return o;
}
// Fenda de Saída: ruptura vertical de placas de relógio quebradas.
export function makeGate() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.4), new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.position.y = 1.8; g.add(core);
  const shardMat = new THREE.MeshBasicMaterial({ color: 0x7a6a4a, side: THREE.DoubleSide });
  const shards = [];
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.14 + Math.random() * 0.22, 3 + (i % 3)), shardMat);
    const side = i % 2 ? 1 : -1; s.userData = { bx: side * (0.5 + Math.random() * 0.7), by: 0.5 + (i / 12) * 2.8, ph: Math.random() * 6.28 };
    s.position.set(s.userData.bx, s.userData.by, 0); g.add(s); shards.push(s);
  }
  const o = { group: g, stable: false, flare: 0, t: 0, update(dt) {
    o.t += dt; const k = o.stable ? 1 : 0.25;
    core.material.opacity = (o.stable ? 0.55 + 0.25 * Math.sin(o.t * 5) : 0.12 + 0.05 * Math.sin(o.t * 9)) + o.flare;
    core.scale.x = (o.stable ? 1.6 + 0.3 * Math.sin(o.t * 3) : 0.5) + o.flare * 6;
    shardMat.color.set(o.stable ? 0xd9a441 : 0x5a5248);
    for (const s of shards) { const u = s.userData; s.position.x = u.bx * (1 + 0.12 * Math.sin(o.t * 1.5 + u.ph)) + Math.sign(u.bx) * o.flare * 2; s.position.y = u.by + 0.08 * Math.sin(o.t * 2 + u.ph); s.rotation.z += dt * k * (0.4 + u.ph * 0.1); s.rotation.y = Math.sin(o.t + u.ph) * 0.5; }
  } };
  rings.push(o); return o;
}
export function makePortal() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 36), new THREE.MeshBasicMaterial({ color: 0xff3ad0 })); g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.45, 28), new THREE.MeshBasicMaterial({ color: 0x3a0a50, transparent: true, opacity: 0.75, side: THREE.DoubleSide })); g.add(disc);
  g.visible = false;
  const o = { group: g, k: 0, target: 0, t: 0, update(dt) { o.t += dt; o.k += (o.target - o.k) * Math.min(1, dt * 4); g.visible = o.k > 0.02; g.scale.setScalar(Math.max(0.001, o.k)); ring.rotation.z = o.t * 2; } };
  rings.push(o); return o;
}
