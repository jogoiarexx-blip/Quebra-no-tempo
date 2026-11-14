// Ferramentas de construção de fases compartilhadas: materiais procedurais, blocos com colisor,
// pool de luzes, céu noturno, skyline distante e chuva. Cada missão monta o seu nível com isto.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCollider, clearColliders } from './physics.js';

export function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function noise(g, w, h, base, amt, n = 2600) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? `rgba(255,255,255,${amt * Math.random()})` : `rgba(0,0,0,${amt * 1.6 * Math.random()})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
}
let MAT = null;
export function materials() {
  if (MAT) return MAT;
  const M = {};
  const lam = (map, extra = {}) => new THREE.MeshLambertMaterial({ map, ...extra });
  M.asphalt = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#2b2e34', 0.07); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } }));
  M.wet = new THREE.MeshPhongMaterial({ map: M.asphalt.map, color: 0x9aa4b4, specular: 0x6a7a90, shininess: 60 });
  M.concrete = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#6b6f76', 0.06); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }));
  M.brick = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#5a3a30', 0.08); g.strokeStyle = 'rgba(20,12,10,.6)'; g.lineWidth = 2; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } }));
  const windows = (g, w, h, base) => {
    noise(g, w, h, base, 0.05);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const lit = Math.random(); g.fillStyle = lit > 0.82 ? '#ffc86b' : lit > 0.7 ? '#5fd0e6' : '#141820';
      g.fillRect(x * 64 + 14, y * 64 + 12, 36, 34);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x * 64 + 14, y * 64 + 28, 36, 2);
    }
  };
  M.building = lam(canvasTex(256, 256, (g, w, h) => windows(g, w, h, '#343a47')));
  M.skyline = new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => windows(g, w, h, '#10141d')), fog: true, color: 0x8a90a8 });
  M.metal = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#4c5560', 0.07); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); }));
  M.rust = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#6d4a34', 0.12); }));
  M.wood = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#77583a', 0.08); g.strokeStyle = 'rgba(30,18,8,.5)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.stroke(); }));
  M.dark = lam(canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#1c1f26', 0.06, 300)));
  M.floor = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#4a4d50', 0.05); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }));
  // Reuse the existing height detail as bump: no additional texture download.
  for (const key of ['concrete', 'floor', 'metal']) {
    const old = M[key];
    M[key] = new THREE.MeshPhongMaterial({ map: old.map, bumpMap: old.map, bumpScale: key === 'metal' ? 0.015 : 0.035, specular: key === 'floor' ? 0x343e49 : 0x171c24, shininess: key === 'floor' ? 22 : 12 });
    old.dispose();
  }
  M.clubFloor = new THREE.MeshPhongMaterial({ map: canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#15121c', 0.05); g.strokeStyle = 'rgba(255,80,210,.10)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }), specular: 0x4a3a5a, shininess: 80 });
  M.velvet = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#3a0f2a', 0.08); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 0, 6, h); } }));
  M.wallClub = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#1a1622', 0.05); g.fillStyle = 'rgba(255,79,208,.06)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2); }));
  M.tile = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#c9ccd2', 0.05); g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }));
  M.bar = new THREE.MeshPhongMaterial({ map: canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#2a1810', 0.08); }), specular: 0x553322, shininess: 40 });
  M.car = lam(canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#7a2e2a', 0.1, 400)));
  M.car2 = lam(canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#2f5a70', 0.1, 400)));
  M.bus = lam(canvasTex(256, 128, (g, w, h) => { noise(g, w, h, '#c79a2b', 0.08); g.fillStyle = '#12161c'; for (let i = 0; i < 6; i++) g.fillRect(10 + i * 41, 22, 32, 40); g.fillStyle = '#7d1f1a'; g.fillRect(0, 84, w, 10); }, false));
  M.train = lam(canvasTex(256, 128, (g, w, h) => { noise(g, w, h, '#8a929c', 0.06); g.fillStyle = '#10141a'; for (let i = 0; i < 5; i++) g.fillRect(14 + i * 48, 26, 34, 40); g.fillStyle = '#d23a2a'; g.fillRect(0, 92, w, 8); }, false));
  M.hazard = lam(canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e0b020'; g.fillRect(0, 0, w, h); g.fillStyle = '#15171a'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + h, h); g.lineTo(i * 32 + h, h); g.fill(); } }));
  M.rail = new THREE.MeshPhongMaterial({ color: 0x8a8f96, specular: 0xffffff, shininess: 90 });
  M.glass = new THREE.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.28, depthWrite: false });
  M.mirror = new THREE.MeshPhongMaterial({ color: 0x9aa8b8, specular: 0xffffff, shininess: 120 });
  M.neonRed = new THREE.MeshBasicMaterial({ color: 0xff3048 });
  M.neonCyan = new THREE.MeshBasicMaterial({ color: 0x35e6ff });
  M.neonAmber = new THREE.MeshBasicMaterial({ color: 0xffb030 });
  M.neonPink = new THREE.MeshBasicMaterial({ color: 0xff4fd0 });
  M.neonViolet = new THREE.MeshBasicMaterial({ color: 0x9a5cff });
  M.neonGreen = new THREE.MeshBasicMaterial({ color: 0x4dff88 });
  M.white = new THREE.MeshBasicMaterial({ color: 0xf2f4f8 });
  M.water = new THREE.MeshBasicMaterial({ color: 0x1ad0ff, transparent: true, opacity: 0.55 });
  M.lampOff = new THREE.MeshBasicMaterial({ color: 0x40181a });
  M.lampOn = new THREE.MeshBasicMaterial({ color: 0x4dff88 });
  M.lampRed = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  // ---- Ato II (1888): madeira, areia, adobe, telhado, rocha, minério luminescente, feno ----
  M.sand = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#a8865a', 0.09, 4200); g.strokeStyle = 'rgba(90,60,30,.25)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 8, w * .6, y - 8, w, y); g.stroke(); } }));
  M.planks = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#8a6238', 0.08); for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(40,22,8,.55)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,220,170,.06)'; g.fillRect(0, y + 2, w, 2); for (let k = 0; k < 2; k++) { g.fillStyle = 'rgba(30,16,6,.6)'; g.fillRect(Math.random() * w, y + 6, 2, 2); } } }));
  M.boards = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#6e4c2c', 0.09); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(30,16,6,.55)'; g.fillRect(x, 0, 2, h); } }));
  M.adobe = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#b88a62', 0.07); g.fillStyle = 'rgba(80,50,30,.18)'; for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 3); }));
  M.shingle = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#5a3a26', 0.1); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 12) { g.fillRect(0, y, w, 2); for (let x = (y / 12) % 2 ? 0 : 8; x < w; x += 16) g.fillRect(x, y, 2, 12); } }));
  M.rock = new THREE.MeshPhongMaterial({ map: canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#4a4038', 0.12, 5000); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } }), shininess: 6, specular: 0x111111 });
  M.rock.bumpMap = M.rock.map; M.rock.bumpScale = 0.05;
  M.ore = new THREE.MeshBasicMaterial({ color: 0x3affd0 });
  M.oreDim = new THREE.MeshLambertMaterial({ color: 0x1d6b66, emissive: 0x0c4a44 });
  M.hay = lam(canvasTex(64, 64, (g, w, h) => { noise(g, w, h, '#c9a24a', 0.15, 900); g.strokeStyle = 'rgba(120,80,20,.5)'; for (let i = 0; i < 30; i++) { g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + 8, y + (Math.random() - 0.5) * 4); g.stroke(); } }));
  M.brass = new THREE.MeshPhongMaterial({ color: 0xc9a046, specular: 0xffe6a0, shininess: 70 });
  M.iron = new THREE.MeshPhongMaterial({ color: 0x3a3a3e, specular: 0x777777, shininess: 30 });
  M.cloth = lam(canvasTex(64, 64, (g, w, h) => { noise(g, w, h, '#7a1e22', 0.08, 300); for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 3, h); } }));
  M.mud = new THREE.MeshPhongMaterial({ map: canvasTex(128, 128, (g, w, h) => noise(g, w, h, '#3a2c20', 0.08, 1500)), color: 0x9a8a7a, specular: 0x222222, shininess: 20 });
  M.lantern = new THREE.MeshBasicMaterial({ color: 0xffc46a });
  return (MAT = M);
}

export function boxGeo(x0, x1, y0, y1, z0, z1, tile = 4) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
  }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

// Construtor de nível: B = bloco estático mesclado por material, D = objeto dinâmico com malha própria.
export let building = null;          // nível em construção (para NPCs criados durante o build)
export function createBuilder(scene) {
  clearColliders();
  const M = materials();
  const root = new THREE.Group(); scene.add(root);
  const bins = new Map();
  const L = { root, M, doors: {}, pickups: [], barrels: [], lights: [], interact: {}, pts: {}, anim: [], npcs: [] };
  building = L;
  L.B = (mat, x0, x1, y0, y1, z0, z1, o = {}) => {
    if (!o.invisible) { if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(boxGeo(x0, x1, y0, y1, z0, z1, o.tile || 4)); }
    return o.noCol ? null : addCollider(x0, x1, y0, y1, z0, z1, o.col || {});
  };
  L.D = (mat, x0, x1, y0, y1, z0, z1, col = {}) => {
    const mesh = new THREE.Mesh(boxGeo(x0, x1, y0, y1, z0, z1, 2), mat); root.add(mesh);
    return { mesh, col: addCollider(x0, x1, y0, y1, z0, z1, col), box: [x0, x1, y0, y1, z0, z1] };
  };
  L.mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); return m; };
  // "pontos de luz" lógicos; só os 6 mais próximos do jogador viram PointLight de verdade (ver updateLights)
  L.light = (x, y, z, color, intensity, dist) => { const l = { pos: new THREE.Vector3(x, y, z), color, intensity, dist, base: intensity }; L.lights.push(l); return l; };
  L.lightPool = []; for (let i = 0; i < 6; i++) { const pl = new THREE.PointLight(0xffffff, 0, 10, 1.6); root.add(pl); L.lightPool.push({ light: pl, spot: null, k: 0 }); }
  L.pickup = (id, type, amount, x, y, z) => L.pickups.push({ id, type, amount, pos: new THREE.Vector3(x, y, z) });
  L.barrel = (id, x, y, z, hp = 30) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12), new THREE.MeshBasicMaterial({ color: 0xc8261c })); mesh.position.set(x, y + 0.58, z); root.add(mesh);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.22, 12), M.hazard); band.position.y = 0.1; mesh.add(band);
    L.barrels.push({ id, mesh, pos: new THREE.Vector3(x, y + 0.58, z), hp, maxHp: hp, alive: true, col: addCollider(x - 0.4, x + 0.4, y, y + 1.15, z - 0.4, z + 0.4, { barrel: id }) });
  };
  L.finish = () => {
    for (const [mat, geos] of bins) { const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat); mesh.receiveShadow = true; mesh.castShadow = mat !== M.asphalt && mat !== M.wet; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); root.add(mesh); }
    bins.clear();
  };
  L.dispose = () => {
    root.removeFromParent();
    root.traverse((o) => {
      if (o.isSkinnedMesh || o.userData.pickupShared) return;                       // personagens e recursos têm descarte próprio
      if (o.geometry) o.geometry.dispose();
      if (o.material && !Object.values(M).includes(o.material)) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map && !Object.values(M).some((x) => x.map === m.map)) m.map.dispose(); m.dispose(); } }
    });
    clearColliders();
  };
  return L;
}

// Reatribui as 6 luzes reais aos pontos mais próximos do jogador, com fade.
const _tmp = [];
export function updateLights(L, p, dt) {
  _tmp.length = 0;
  for (const s of L.lights) if (s.intensity > 0) _tmp.push(s);
  _tmp.sort((a, b) => a.pos.distanceToSquared(p) - b.pos.distanceToSquared(p));
  const spots = _tmp.slice(0, L.lightPool.length);
  for (const slot of L.lightPool) {
    if (slot.spot && !spots.includes(slot.spot)) { slot.k -= dt * 3; if (slot.k <= 0) { slot.spot = null; slot.k = 0; } }
    else if (slot.spot) slot.k = Math.min(1, slot.k + dt * 3);
  }
  for (const s of spots) {
    if (L.lightPool.some((sl) => sl.spot === s)) continue;
    const free = L.lightPool.find((sl) => !sl.spot);
    if (free) { free.spot = s; free.k = 0; }
  }
  for (const slot of L.lightPool) {
    if (!slot.spot) { slot.light.intensity = 0; continue; }
    slot.light.position.copy(slot.spot.pos); slot.light.color.set(slot.spot.color); slot.light.distance = slot.spot.dist;
    slot.light.intensity = slot.spot.intensity * slot.k;
  }
}

// ---------------- atmosfera ----------------
export function makeSky(L, top = 0x05070d, horizon = 0x1a2034, glow = 0x3a1a3a) {
  const geo = new THREE.SphereGeometry(400, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, glow: { value: new THREE.Color(glow) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 glow; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ float y = max(vP.y, 0.0); vec3 c = mix(hor, top, pow(y, 0.55)); c += glow * pow(1.0 - y, 6.0) * 0.6;
        vec2 g = floor(vP.xz / max(vP.y, 0.05) * 90.0); float s = step(0.997, h(g)) * smoothstep(0.15, 0.5, y); c += vec3(s) * 0.7;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(geo, mat); sky.renderOrder = -10; sky.frustumCulled = false; L.root.add(sky); L.sky = sky;
  return sky;
}
// Silhuetas de prédios ao longe (instanciadas) num anel ao redor da fase.
export function makeSkyline(L, cx, cz, radius, count = 46, seed = 3) {
  let r = seed; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geo, L.M.skyline, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd() * 0.1, rr = radius * (0.85 + rnd() * 0.4);
    p.set(cx + Math.cos(a) * rr, -2, cz + Math.sin(a) * rr); s.set(14 + rnd() * 18, 30 + rnd() * 70, 14 + rnd() * 18);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); m.compose(p, q, s); inst.setMatrixAt(i, m);
  }
  inst.frustumCulled = false; L.root.add(inst); return inst;
}
// Chuva: segmentos que caem numa caixa que segue a câmera; desligável por setor (interiores).
export function makeRain(L, n = 900) {
  const pos = new Float32Array(n * 6), vel = new Float32Array(n);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.35, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; L.root.add(lines);
  for (let i = 0; i < n; i++) { vel[i] = 16 + Math.random() * 8; for (let k = 0; k < 2; k++) { pos[i * 6 + k * 3] = (Math.random() - 0.5) * 40; pos[i * 6 + k * 3 + 1] = Math.random() * 20; pos[i * 6 + k * 3 + 2] = (Math.random() - 0.5) * 40; } }
  const rain = { lines, on: 1, update(dt, cam, enabled) {
    rain.on += ((enabled ? 1 : 0) - rain.on) * Math.min(1, dt * 3); mat.opacity = 0.35 * rain.on; lines.visible = rain.on > 0.02;
    if (!lines.visible) return;
    for (let i = 0; i < n; i++) {
      let x = pos[i * 6], y = pos[i * 6 + 1], z = pos[i * 6 + 2];
      y -= vel[i] * dt;
      if (y < cam.y - 6 || Math.abs(x - cam.x) > 20 || Math.abs(z - cam.z) > 20) { x = cam.x + (Math.random() - 0.5) * 40; z = cam.z + (Math.random() - 0.5) * 40; y = cam.y + 8 + Math.random() * 10; }
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x + 0.02; pos[i * 6 + 4] = y + 0.55; pos[i * 6 + 5] = z;
    }
    geo.attributes.position.needsUpdate = true;
  } };
  L.rain = rain; return rain;
}
// Poste de rua com luz lógica.
export function streetLamp(L, x, z, y = 0, color = 0xffc070, side = 1) {
  L.B(L.M.metal, x - 0.08, x + 0.08, y, y + 5.2, z - 0.08, z + 0.08, { noCol: true });
  L.B(L.M.metal, x, x + 1.1 * side, y + 5.1, y + 5.25, z - 0.08, z + 0.08, { noCol: true });
  L.mesh(new THREE.BoxGeometry(0.5, 0.08, 0.3), new THREE.MeshBasicMaterial({ color }), x + 1.0 * side, y + 5.08, z);
  return L.light(x + 1.0 * side, y + 4.6, z, color, 20, 12);
}
// Poeira/brasas: partículas lentas que seguem a câmera (substitui a chuva nas fases do Oeste e da mina).
export function makeDust(L, n = 420, color = 0xe8c890, size = 0.06, rise = 0.15) {
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.55, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; L.root.add(pts);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 36; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = (Math.random() - 0.5) * 36; vel[i * 3] = 0.6 + Math.random() * 0.8; vel[i * 3 + 1] = (Math.random() - 0.5) * rise; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5; }
  const dust = { points: pts, on: 1, update(dt, cam, enabled) {
    dust.on += ((enabled ? 1 : 0.35) - dust.on) * Math.min(1, dt * 2); mat.opacity = 0.55 * dust.on;
    for (let i = 0; i < n; i++) {
      let x = pos[i * 3] + vel[i * 3] * dt, y = pos[i * 3 + 1] + vel[i * 3 + 1] * dt + Math.sin(x * 0.7 + i) * 0.002, z = pos[i * 3 + 2] + vel[i * 3 + 2] * dt;
      if (Math.abs(x - cam.x) > 18 || Math.abs(z - cam.z) > 18 || Math.abs(y - cam.y) > 7) { x = cam.x + (Math.random() - 0.5) * 36; y = cam.y + (Math.random() - 0.5) * 10; z = cam.z + (Math.random() - 0.5) * 36; }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
  } };
  L.rain = dust; return dust;
}
// Lampião de parede/poste do Oeste com luz lógica quente.
export function lantern(L, x, y, z, color = 0xffb35a, intensity = 16, dist = 10) {
  L.mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), L.M.lantern, x, y, z);
  L.mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), L.M.iron, x, y + 0.18, z);
  return L.light(x, y, z, color, intensity, dist);
}
