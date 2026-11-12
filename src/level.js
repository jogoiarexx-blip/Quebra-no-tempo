// A1-M1 — RUA QUEBRADA. Geometria de blocos (greybox estilizado) + colisores AABB.
// IDs de setores, checkpoints, selos e portas seguem o GDD §9.3 e o game_config v2.2.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCollider, clearColliders } from './physics.js';

function canvasTex(w, h, draw, repeat = true) {
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
function makeMaterials() {
  const M = {};
  const lam = (map, extra = {}) => new THREE.MeshLambertMaterial({ map, ...extra });
  M.asphalt = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#2b2e34', 0.07); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } }));
  M.concrete = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#6b6f76', 0.06); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }));
  M.brick = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#5a3a30', 0.08); g.strokeStyle = 'rgba(20,12,10,.6)'; g.lineWidth = 2; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } }));
  M.building = lam(canvasTex(256, 256, (g, w, h) => {
    noise(g, w, h, '#343a47', 0.05);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const lit = Math.random(); g.fillStyle = lit > 0.82 ? '#ffc86b' : lit > 0.7 ? '#5fd0e6' : '#141820';
      g.fillRect(x * 64 + 14, y * 64 + 12, 36, 34);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x * 64 + 14, y * 64 + 28, 36, 2);
    }
  }));
  M.metal = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#4c5560', 0.07); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); }));
  M.rust = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#6d4a34', 0.12); }));
  M.wood = lam(canvasTex(128, 128, (g, w, h) => { noise(g, w, h, '#77583a', 0.08); g.strokeStyle = 'rgba(30,18,8,.5)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.stroke(); }));
  M.dark = lam(canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#1c1f26', 0.06, 300)));
  M.floor = lam(canvasTex(256, 256, (g, w, h) => { noise(g, w, h, '#4a4d50', 0.05); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }));
  M.car = lam(canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#7a2e2a', 0.1, 400)));
  M.car2 = lam(canvasTex(64, 64, (g, w, h) => noise(g, w, h, '#2f5a70', 0.1, 400)));
  M.bus = lam(canvasTex(256, 128, (g, w, h) => { noise(g, w, h, '#c79a2b', 0.08); g.fillStyle = '#12161c'; for (let i = 0; i < 6; i++) g.fillRect(10 + i * 41, 22, 32, 40); g.fillStyle = '#7d1f1a'; g.fillRect(0, 84, w, 10); }, false));
  M.hazard = lam(canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e0b020'; g.fillRect(0, 0, w, h); g.fillStyle = '#15171a'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + h, h); g.lineTo(i * 32 + h, h); g.fill(); } }));
  M.glass = new THREE.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.28, depthWrite: false });
  M.neonRed = new THREE.MeshBasicMaterial({ color: 0xff3048 });
  M.neonCyan = new THREE.MeshBasicMaterial({ color: 0x35e6ff });
  M.neonAmber = new THREE.MeshBasicMaterial({ color: 0xffb030 });
  M.neonPink = new THREE.MeshBasicMaterial({ color: 0xff4fd0 });
  M.water = new THREE.MeshBasicMaterial({ color: 0x1ad0ff, transparent: true, opacity: 0.55 });
  M.lampOff = new THREE.MeshBasicMaterial({ color: 0x40181a });
  M.lampOn = new THREE.MeshBasicMaterial({ color: 0x4dff88 });
  return M;
}

function boxGeo(x0, x1, y0, y1, z0, z1, tile = 4) {
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

export const SECTOR_NAMES = {
  z01_garage: 'Garagem', z02_alley: 'Beco de Oficina', z03_avenue: 'Avenida Destruída', z04_hardware: 'Loja de Ferragens',
  z04b_duct: 'Duto de Ventilação', z05_vespera_plaza: 'Clube Véspera • Praça do Relógio', z06_walkway: 'Passarela', z07_substation: 'Subestação',
};
export function sectorAt(p) {
  const z = p.z;
  if (z < 12.25) return 'z01_garage';
  if (z < 40.25) return 'z02_alley';
  if (z < 80.25) return 'z03_avenue';
  if (z < 96.25) return p.x > -1.75 ? 'z04b_duct' : 'z04_hardware';
  if (z < 136.2) return 'z05_vespera_plaza';
  if (z < 184.25) return 'z06_walkway';
  return 'z07_substation';
}

export function buildLevel(scene) {
  clearColliders();
  const M = makeMaterials();
  const root = new THREE.Group(); scene.add(root);
  const bins = new Map();
  const L = { root, M, doors: {}, pickups: [], barrels: [], lights: [], anim: [], interact: {}, pts: {} };

  // bloco estático: visual (mesclado por material) + colisor
  const B = (mat, x0, x1, y0, y1, z0, z1, o = {}) => {
    if (!o.invisible) { if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(boxGeo(x0, x1, y0, y1, z0, z1, o.tile || 4)); }
    return o.noCol ? null : addCollider(x0, x1, y0, y1, z0, z1, o.col || {});
  };
  // objeto dinâmico: malha própria + colisor
  const D = (mat, x0, x1, y0, y1, z0, z1, col = {}) => {
    const mesh = new THREE.Mesh(boxGeo(x0, x1, y0, y1, z0, z1, 2), mat); root.add(mesh);
    return { mesh, col: addCollider(x0, x1, y0, y1, z0, z1, col), box: [x0, x1, y0, y1, z0, z1] };
  };
  // "pontos de luz" lógicos; só os 6 mais próximos viram PointLight de verdade (ver updateLights)
  const light = (x, y, z, color, intensity, dist) => { const l = { pos: new THREE.Vector3(x, y, z), color, intensity, dist }; L.lights.push(l); return l; };
  L.lightPool = []; for (let i = 0; i < 6; i++) { const pl = new THREE.PointLight(0xffffff, 0, 10, 1.6); root.add(pl); L.lightPool.push({ light: pl, spot: null, k: 0 }); }
  const pickup = (id, type, amount, x, y, z) => L.pickups.push({ id, type, amount, pos: new THREE.Vector3(x, y, z) });

  // ---------------- chão geral ----------------
  B(M.asphalt, -40, 40, -1, 0, -6, 136, { tile: 6 });
  B(M.dark, -40, 40, -1, 0, 136, 170, { noCol: false });           // fundo do fosso da passarela
  B(M.concrete, -16, 16, 0, 4, 132, 136);                           // terraço da praça
  B(M.concrete, -16, 16, 0, 4, 170, 216);                           // platô da subestação

  // ---------------- Z01 GARAGEM ----------------
  B(M.brick, -6.5, -6, 0, 4.5, -0.5, 12.5); B(M.brick, 6, 6.5, 0, 4.5, -0.5, 12.5);
  B(M.brick, -6.5, 6.5, 0, 4.5, -0.5, 0);
  B(M.brick, -6.5, -1.5, 0, 4.5, 12, 12.5); B(M.brick, 1.5, 6.5, 0, 4.5, 12, 12.5); B(M.brick, -1.5, 1.5, 3, 4.5, 12, 12.5);
  B(M.dark, -6.5, 6.5, 4.5, 4.8, -0.5, 12.5);
  B(M.floor, -6, 6, 0, 0.02, 0, 12, { noCol: true });
  B(M.metal, -5.9, -5.2, 0, 2.1, 7.4, 8.6);                         // armário do Martelo-9
  B(M.wood, 2, 5.6, 0, 0.95, 10.6, 11.7);                           // bancada
  B(M.wood, 1.6, 3.2, 0, 0.8, 4.4, 5.6);                            // caixote (salto de teste)
  B(M.rust, -5.6, -3.4, 0, 1.2, 1.2, 2.6);                          // tambor/carro desmontado
  B(M.hazard, -1.5, 1.5, 0, 0.02, 11.2, 12, { noCol: true, tile: 1 });
  L.doors.door_garage = D(M.metal, -1.5, 1.5, 0, 3, 12.1, 12.4);
  L.target = D(M.hazard, 4.1, 4.9, 0.9, 2.2, 8.8, 9.0, { target: true });   // alvo reativo
  B(M.metal, 4.45, 4.55, 0, 0.9, 8.85, 8.95, { noCol: true });
  light(0, 3.8, 5, 0xffd9a0, 30, 14); light(-4, 3.5, 9, 0xffb060, 10, 8);
  L.interact.locker = new THREE.Vector3(-5.0, 1.1, 8.0);
  L.pts.spawn = { x: 0, y: 0.01, z: 2, yaw: 0 };

  // ---------------- Z02 BECO ----------------
  B(M.building, -22, -4, 0, 9, 12.5, 40); B(M.building, 4, 22, 0, 9, 12.5, 40);
  B(M.building, -22, -6.5, 0, 9, -0.5, 12.5); B(M.building, 6.5, 22, 0, 9, -0.5, 12.5);
  B(M.brick, -22, -1.5, 0, 12, 40, 40.5); B(M.brick, 1.5, 22, 0, 12, 40, 40.5); B(M.brick, -1.5, 1.5, 3, 12, 40, 40.5);
  B(M.wood, -3.6, -1.6, 0, 1.2, 30.5, 31.7); B(M.wood, -3.8, -2.6, 0, 1.2, 19.4, 20.6);
  B(M.rust, 1.9, 3.7, 0, 1.4, 24.2, 26.6);                          // caçamba
  B(M.wood, 2.4, 3.6, 0, 1.1, 16.2, 17.4);
  B(M.metal, 3.5, 3.9, 0.9, 1.6, 38.6, 39.2, { noCol: true });      // chave de emergência
  L.doors.door_alley = D(M.metal, -1.5, 1.5, 0, 3, 40.1, 40.4);
  L.interact.alley_switch = new THREE.Vector3(3.3, 1.2, 38.9);
  light(0, 5, 22, 0x6fa8ff, 22, 18); light(0, 4, 36, 0xff5a40, 18, 14);
  B(M.neonAmber, -3.95, -3.9, 3, 3.5, 26, 29, { noCol: true });

  // ---------------- Z03 AVENIDA ----------------
  B(M.building, -30, -14, 0, 12, 40.5, 80); B(M.building, 14, 30, 0, 12, 40.5, 80);
  B(M.car, -8, -4, 0, 1.4, 48, 50); B(M.car2, 2, 6.5, 0, 1.4, 55, 57);
  B(M.metal, -10, -7, 0, 2.2, 60, 65);                              // van
  B(M.car, 4.8, 6.8, 0, 1.4, 67.5, 72);
  B(M.concrete, -2, 2, 0, 1.0, 62, 62.6); B(M.concrete, -13, -10.5, 0, 1.0, 71, 71.6);
  B(M.concrete, 12, 14, 4.7, 5, 62, 68); B(M.concrete, 12, 12.15, 5, 5.9, 62, 68);   // sacada do atirador
  B(M.concrete, -30, 5, 7, 8, 74, 79);                              // viaduto partido
  B(M.concrete, -13.6, -12.4, 0, 7, 75.5, 77.5); B(M.concrete, 3, 4.2, 0, 7, 75.5, 77.5);
  B(M.concrete, 5, 14, 7, 7.5, 77.4, 79); B(M.concrete, 12.6, 13.8, 0, 7, 77.5, 78.9);   // ponta partida onde o ônibus se equilibra
  // ônibus (evento cênico INTACT -> FALLING -> SETTLED)
  { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 8), M.bus); body.position.y = 1.4; g.add(body);
    g.position.set(8.6, 7.5, 76.6); g.rotation.set(-0.12, 0.25, 0); root.add(g);
    L.bus = { group: g, state: 'INTACT', t: 0, col: addCollider(7.3, 11.3, 0, 2.8, 68.6, 77.0, {}) }; L.bus.col.enabled = false; }
  light(-6, 6, 52, 0x6fa8ff, 30, 22); light(6, 6, 68, 0xffa050, 30, 22);
  // fachada da loja (fundo da avenida)
  B(M.brick, -30, -12, 0, 12, 80, 80.5); B(M.brick, -2, 30, 0, 12, 80, 80.5);
  B(M.brick, -12, -11, 0, 12, 80, 80.5); B(M.brick, -7, -6, 0, 12, 80, 80.5); B(M.brick, -4, -2, 0, 12, 80, 80.5);
  B(M.brick, -11, -7, 0, 0.6, 80, 80.5); B(M.brick, -11, -7, 2.6, 12, 80, 80.5); B(M.brick, -6, -4, 2.6, 12, 80, 80.5);
  B(M.neonAmber, -10.5, -3, 3.0, 3.6, 79.9, 80, { noCol: true });
  L.glass = D(M.glass, -11, -7, 0.6, 2.6, 80.15, 80.3, { glass: true });

  // ---------------- Z04 LOJA DE FERRAGENS ----------------
  B(M.brick, -12.5, -12, 0, 4, 80.5, 96); B(M.dark, -12.5, 13.5, 4, 4.3, 80.5, 86);
  B(M.dark, -12.5, 5.5, 4, 4.3, 86, 96);
  B(M.floor, -12, -2, 0, 0.02, 80.5, 96, { noCol: true });
  B(M.brick, -2, -1.5, 0, 4, 80.5, 93); B(M.brick, -2, -1.5, 0, 4, 94.5, 96); B(M.brick, -2, -1.5, 2, 4, 93, 94.5);
  B(M.metal, -12, -6.6, 0, 4, 82.5, 82.9); B(M.metal, -7, -6.6, 0, 4, 80.5, 82.5);   // nicho da vitrine
  B(M.wood, -11, -7.4, 0, 0.7, 80.9, 82.1);                        // expositor da escopeta
  B(M.metal, -9, -8.4, 0, 2.2, 85, 91); B(M.metal, -5.6, -5, 0, 2.2, 85, 90);
  B(M.wood, -4.2, -2.4, 0, 1.1, 83.5, 84.3);                       // balcão
  B(M.metal, -12, -11.6, 0.7, 1.9, 87.4, 88.6, { noCol: true });   // armário do fusível
  B(M.rust, -3.6, -2.2, 0, 1.3, 90.5, 92.3);                       // gerador
  L.genLamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), M.lampOff); L.genLamp.position.set(-2.9, 1.5, 91.4); root.add(L.genLamp);
  B(M.hazard, -2.05, -2, 0, 2, 92.8, 93, { noCol: true, tile: 1 }); B(M.hazard, -2.05, -2, 0, 2, 94.5, 94.7, { noCol: true, tile: 1 });
  light(-7, 3.4, 88, 0xfff0c8, 26, 14); L.storeLight = L.lights[L.lights.length - 1];
  L.interact.fuse = new THREE.Vector3(-11.3, 1.2, 88);
  L.interact.generator = new THREE.Vector3(-4.0, 1.0, 91.4);
  L.interact.doc1 = new THREE.Vector3(-3.3, 1.2, 83.2);
  B(M.neonCyan, -3.6, -3.0, 1.1, 1.14, 83.6, 84.1, { noCol: true });      // datapad sobre o balcão
  L.pts.seal_shop = new THREE.Vector3(-7, 1.3, 93.5);
  // duto opcional -> estoque -> passarela superior
  B(M.metal, -1.5, 5.5, 0, 2.6, 92.5, 93); B(M.metal, -1.5, 5.5, 0, 2.6, 94.5, 95); B(M.metal, -1.5, 5.5, 2, 2.3, 93, 94.5);
  B(M.metal, -1.5, 5.5, -0.02, 0.02, 93, 94.5, { noCol: true });
  B(M.brick, 5.5, 6, 0, 7, 86, 93); B(M.brick, 5.5, 6, 0, 7, 94.5, 96); B(M.brick, 5.5, 6, 2, 7, 93, 94.5);
  B(M.brick, 5.5, 13.5, 0, 7, 85.5, 86); B(M.brick, 13, 13.5, 0, 7, 86, 96); B(M.dark, 5.5, 13.5, 7, 7.3, 85.5, 96.5);
  B(M.floor, 6, 13, 0, 0.02, 86, 96, { noCol: true });
  for (let k = 0; k < 10; k++) B(M.metal, 6.4 + k * 0.6, 7.0 + k * 0.6, 0, 0.4 * (k + 1), 86, 87.5, { tile: 2 });
  B(M.metal, 11.8, 13, 3.7, 4, 87.5, 96); B(M.metal, 12.4, 13, 0, 4, 86, 87.5);
  B(M.wood, 7, 8.4, 0, 1.2, 93, 95.4); B(M.wood, 9.6, 10.8, 0, 1.0, 88.6, 89.8);
  light(9.5, 5.5, 91, 0x9ad0ff, 20, 12);
  L.interact.doc2 = new THREE.Vector3(12.4, 5.0, 92.5);
  B(M.neonCyan, 12.6, 12.95, 4.9, 5.3, 92.3, 92.7, { noCol: true });
  // parede sul da praça (com portão de enrolar e porta do mezanino)
  B(M.brick, -30, -8, 0, 12, 96, 96.5); B(M.brick, -6, 12, 0, 12, 96, 96.5); B(M.brick, 13, 30, 0, 12, 96, 96.5);
  B(M.brick, -8, -6, 2.8, 12, 96, 96.5); B(M.brick, 12, 13, 0, 4, 96, 96.5); B(M.brick, 12, 13, 6.5, 12, 96, 96.5);
  L.doors.door_shutter = D(M.metal, -8, -6, 0, 2.8, 96.1, 96.4);

  // ---------------- Z05 CLUBE VÉSPERA / PRAÇA DO RELÓGIO ----------------
  B(M.building, -30, -16, 0, 12, 96.5, 119.5); B(M.building, -30, -16, 0, 12, 122.5, 136.5);
  B(M.building, -30, -19.5, 0, 12, 119.5, 122.5); B(M.building, -19.5, -16, 2.6, 12, 119.5, 122.5);
  B(M.building, -16.5, -16, 0, 2.6, 119.5, 120); B(M.building, -16.5, -16, 0, 2.6, 122, 122.5);
  B(M.building, 16, 30, 0, 12, 96.5, 136.5);
  L.doors.door_basso = D(M.metal, -16.4, -16.1, 0, 2.6, 120, 122);
  B(M.dark, -16.05, -16, 0, 3.2, 111.5, 115.5, { noCol: true });        // porta principal (fechada)
  B(M.neonPink, -16.08, -16.02, 3.2, 3.35, 111.2, 115.8, { noCol: true });
  B(M.neonPink, -16.08, -16.02, 0, 3.2, 111.2, 111.35, { noCol: true }); B(M.neonPink, -16.08, -16.02, 0, 3.2, 115.65, 115.8, { noCol: true });
  B(M.metal, -16.02, -15.85, 1.2, 1.7, 109.3, 109.7, { noCol: true });  // interfone
  B(M.neonCyan, -15.86, -15.84, 1.5, 1.6, 109.42, 109.58, { noCol: true });
  L.interact.intercom = new THREE.Vector3(-15.4, 1.4, 109.5);
  // letreiro VÉSPERA (falha exibindo lembranças impossíveis — troca de textura em runtime)
  { const mk = (txt, sub, col) => canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#12060f'; g.fillRect(0, 0, w, h); g.shadowColor = col; g.shadowBlur = 34; g.fillStyle = col; g.font = 'bold 150px Georgia, serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, 150); g.shadowBlur = 12; g.font = '34px Arial'; g.fillStyle = '#ffd9a0'; g.fillText(sub, w / 2, 220); }, false);
    L.neonTex = [mk('VÉSPERA', 'CLUBE • SHOW AO VIVO • ABERTO ATÉ AS 3', '#ff4fd0'), mk('V∑SP∃RA', 'VOCÊ SE LEMBRA DO QUE NUNCA ACONTECEU', '#35e6ff')];
    L.neon = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshBasicMaterial({ map: L.neonTex[0] }));
    L.neon.rotation.y = Math.PI / 2; L.neon.position.set(-15.93, 8.2, 114); root.add(L.neon); }
  light(-13, 6, 114, 0xff4fd0, 60, 24); L.neonLight = L.lights[L.lights.length - 1];
  // vitrine-palco do segundo andar (Sol Vega)
  B(M.dark, -16, -13.8, 2.85, 3.1, 115.9, 119.4); B(M.metal, -16, -13.8, 5.7, 5.9, 115.9, 119.4, { noCol: true });
  L.stageGlass = new THREE.Mesh(boxGeo(-13.9, -13.82, 3.1, 5.7, 115.9, 119.4), M.glass); root.add(L.stageGlass);
  addCollider(-13.9, -13.8, 3.1, 5.7, 115.9, 119.4, {});
  B(M.neonPink, -13.85, -13.8, 2.85, 2.95, 115.9, 119.4, { noCol: true });
  L.pts.sol = new THREE.Vector3(-14.9, 3.1, 117.85);
  light(-14.2, 5.2, 117.65, 0xffd0f0, 26, 7);
  // nicho de suprimentos do Basso
  B(M.floor, -19.5, -16.5, 0, 0.02, 119.5, 122.5, { noCol: true }); light(-18, 2.2, 121, 0xffc070, 8, 6);
  // torre do relógio + painel (selo alternativo)
  B(M.concrete, -1.2, 1.2, 0, 9, 114.8, 117.2); B(M.metal, -1.6, 1.6, 9, 9.4, 114.4, 117.6, { noCol: true });
  { L.clockTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#2a2420'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#2a2420'; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; [['XII', 128, 44], ['III', 222, 138], ['VI', 128, 232], ['IX', 34, 138]].forEach(([t, x, y]) => g.fillText(t, x, y)); }, false);
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ map: L.clockTex })); face.position.set(0, 6.6, 114.78); face.rotation.y = Math.PI; root.add(face);
    L.clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.78, 0.04), new THREE.MeshBasicMaterial({ color: 0x8a1a1a })); L.clockHand.geometry.translate(0, 0.34, 0);
    L.clockHand.position.set(0, 6.6, 114.74); root.add(L.clockHand); }
  B(M.metal, -0.5, 0.5, 0.9, 1.7, 114.6, 114.8, { noCol: true }); B(M.neonAmber, -0.3, 0.3, 1.25, 1.35, 114.57, 114.6, { noCol: true });
  L.interact.clock_panel = new THREE.Vector3(0, 1.3, 114.2);
  L.pts.seal_plaza = new THREE.Vector3(0, 1.4, 113.4);
  B(M.concrete, -8.5, -5.5, 0, 1.2, 107.5, 108.5); B(M.concrete, 5.5, 8.5, 0, 1.2, 107.5, 108.5);
  B(M.concrete, -8.5, -5.5, 0, 1.2, 123.5, 124.5); B(M.concrete, 5.5, 8.5, 0, 1.2, 121.5, 122.5);
  B(M.metal, 8, 10.6, 0, 2.6, 114.6, 117.2);                        // quiosque
  for (let k = 0; k < 10; k++) B(M.concrete, -2, 2, 0, 0.4 * (k + 1), 126 + k * 0.6, 126.6 + k * 0.6, { tile: 2 });
  B(M.metal, 12, 16, 3.7, 4, 96.5, 132);                            // passarela superior (rota do duto)
  B(M.metal, 12, 12.1, 4, 4.35, 96.5, 132, { col: { seeThrough: true } });
  for (let z = 100; z < 132; z += 8) B(M.metal, 12.1, 12.5, 0, 3.7, z, z + 0.4);
  light(0, 7, 106, 0x6fa8ff, 40, 26); light(6, 6, 126, 0xffa050, 32, 22);
  L.pts.portal = new THREE.Vector3(0, 5.2, 129);
  // ---------------- Z06 PASSARELA ----------------
  B(M.brick, -30, -1.5, 4, 12, 136, 136.5); B(M.brick, 1.5, 30, 4, 12, 136, 136.5); B(M.brick, -1.5, 1.5, 7.2, 12, 136, 136.5);
  B(M.building, -30, -16, 0, 12, 136.5, 216); B(M.building, 16, 30, 0, 12, 136.5, 216);
  B(M.metal, -1.5, 1.5, 3.6, 4, 136, 144); B(M.metal, -1.5, 1.5, 3.6, 4, 146.6, 153);
  B(M.metal, -1.5, 1.5, 3.6, 5.7, 153, 160); B(M.metal, -1.5, 1.5, 4.2, 4.6, 163, 170);
  { const stripe = (y, z0) => { const m = new THREE.Mesh(boxGeo(-1.5, 1.5, y, y + 0.012, z0, z0 + 0.25, 1), M.hazard); root.add(m); };
    stripe(4.0, 143.75); stripe(4.0, 146.6); stripe(4.0, 152.7); stripe(5.7, 153.02); stripe(5.7, 159.75); stripe(4.6, 163); stripe(4.6, 169.75);
    const m = new THREE.Mesh(boxGeo(-1.5, 1.5, 5.2, 5.7, 152.97, 152.99, 1), M.hazard); root.add(m); }
  for (const z of [140, 149.8, 156.5, 166.5]) B(M.concrete, -0.5, 0.5, 0, 3.6, z - 0.5, z + 0.5);
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(32, 33.5), M.water); w.rotation.x = -Math.PI / 2; w.position.set(0, 0.25, 153.2); root.add(w); L.water = w; }
  light(0, 7, 150, 0x35e6ff, 40, 26); light(0, 8, 165, 0xffa050, 30, 22);
  // pátio
  B(M.wood, -6, -4.4, 4, 5.2, 175.5, 177); B(M.wood, 4.2, 5.8, 4, 5.2, 177.2, 178.7); B(M.concrete, -1.2, 1.2, 4, 5.0, 179.6, 180.2);
  // ---------------- Z07 SUBESTAÇÃO ----------------
  B(M.concrete, -16, -1.5, 4, 11, 184, 184.5); B(M.concrete, 1.5, 16, 4, 11, 184, 184.5); B(M.concrete, -1.5, 1.5, 7, 11, 184, 184.5);
  B(M.concrete, -12.5, -12, 4, 11, 184.5, 214); B(M.concrete, 12, 12.5, 4, 11, 184.5, 214); B(M.concrete, -12.5, 12.5, 4, 11, 214, 214.5);
  B(M.dark, -12.5, 12.5, 11, 11.3, 184, 214.5); B(M.floor, -12, 12, 4, 4.02, 184.5, 214, { noCol: true });
  B(M.rust, -6, -3, 4, 7, 191, 196); B(M.rust, 3, 6, 4, 7, 199, 204);                     // transformadores
  B(M.wood, -9.5, -8, 4, 5.2, 201, 202.5); B(M.wood, 8, 9.5, 4, 5.2, 193, 194.5);
  B(M.wood, 8.2, 9.2, 4, 5.2, 184.5, 188.2);                                             // caixas que escondem o painel
  B(M.metal, -12, -11.7, 4.8, 6.2, 196.4, 197.6, { noCol: true }); B(M.metal, 11.7, 12, 4.8, 6.2, 205.4, 206.6, { noCol: true });
  L.breakerLamp = {};
  for (const [id, x, z] of [['a', -11.6, 197], ['b', 11.6, 206]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), M.lampOff); m.position.set(x, 6.4, z); root.add(m); L.breakerLamp[id] = m; }
  L.interact.breaker_a = new THREE.Vector3(-11.2, 5.2, 197); L.interact.breaker_b = new THREE.Vector3(11.2, 5.2, 206);
  L.secretPanel = D(M.concrete, 11.85, 12, 4.4, 6.0, 185.6, 187.4, { noBody: true });
  L.secretPanel.mesh.material = M.metal; L.interact.secret_panel = new THREE.Vector3(11.4, 5.2, 186.5);
  B(M.metal, -0.7, 0.7, 4, 5.2, 208.5, 209.2); L.termLamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.3), M.lampOff); L.termLamp.position.set(0, 5.3, 208.75); root.add(L.termLamp);
  L.interact.terminal = new THREE.Vector3(0, 5.1, 208.0);
  B(M.metal, -2.2, 2.2, 4, 4.15, 210.6, 214); L.pts.gate = new THREE.Vector3(0, 4.15, 212.4);
  L.pts.seal_substation = new THREE.Vector3(0, 5.5, 205.5);
  light(0, 9.5, 192, 0xfff0c8, 0, 20); light(0, 9.5, 204, 0xfff0c8, 0, 20); L.subLights = L.lights.slice(-2);
  light(0, 6, 199, 0xff5a40, 16, 14);

  // barris/explosivos sinalizados
  const barrel = (id, x, y, z) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12), M.neonRed.clone()); mesh.material.color.set(0xc8261c); mesh.position.set(x, y + 0.58, z); root.add(mesh);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.22, 12), M.hazard); band.position.y = 0.1; mesh.add(band);
    L.barrels.push({ id, mesh, pos: new THREE.Vector3(x, y + 0.58, z), hp: 30, alive: true, col: addCollider(x - 0.4, x + 0.4, y, y + 1.15, z - 0.4, z + 0.4, { barrel: id }) }); };
  barrel('barrel_alley', 0.9, 0, 31.6); barrel('barrel_plaza', -3.5, 0, 125); barrel('capacitor_sub', 0, 4, 198);

  // coletáveis
  pickup('pk_alley_ammo', 'ammo9', 30, 3.0, 0.35, 37.2);
  pickup('pk_av_med', 'medkit', 35, -12.6, 0.35, 52); pickup('pk_av_ammo', 'ammo9', 30, 11.5, 0.35, 47.5); pickup('pk_av_armor', 'armor', 25, 0, 0.35, 76.5);
  pickup('pk_shotgun', 'weapon_trovao', 1, -9.2, 1.0, 81.5); pickup('pk_nook_shells', 'shells', 6, -7.8, 1.0, 81.5);
  pickup('pk_store_med', 'medkit', 35, -3.3, 0.35, 85.4);
  pickup('pk_duct_ammo', 'ammo9', 30, 9, 0.35, 92); pickup('pk_duct_shells', 'shells', 4, 10.2, 1.35, 89.2); pickup('pk_duct_armor', 'armor', 50, 11.2, 0.35, 94.5); pickup('pk_duct_pecas', 'pecas', 30, 7.7, 1.55, 94.2);
  pickup('pk_basso_med', 'medkit', 35, -18.4, 0.35, 120.4); pickup('pk_basso_shells', 'shells', 4, -18.4, 0.35, 121.6); pickup('pk_basso_ammo', 'ammo9', 30, -17.4, 0.35, 121);
  pickup('pk_plaza_ammo', 'ammo9', 30, 11.4, 0.35, 118.6); pickup('pk_plaza_armor', 'armor', 25, -13, 0.35, 100);
  pickup('pk_yard_med', 'medkit', 35, -12, 4.35, 172.5); pickup('pk_yard_ammo', 'ammo9', 30, 12, 4.35, 181);
  pickup('pk_sub_ammo', 'ammo9', 30, -10.5, 4.35, 187); pickup('pk_secret_armor', 'armor', 50, 10.6, 4.35, 186); pickup('pk_secret_pecas', 'pecas', 50, 10.6, 4.35, 187.2);

  // mescla estática
  for (const [mat, geos] of bins) { const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat); mesh.receiveShadow = true; mesh.castShadow = mat !== M.asphalt; mesh.matrixAutoUpdate = false; root.add(mesh); }

  // grupos de encontro (GDD §9.3.3) — 12 inimigos no total, máx. 4 regulares ativos
  L.groups = {
    eg01: { sector: 'z02_alley', trigger: (p) => p.z > 17 && p.z < 40, units: [
      { type: 'E01', x: -2.6, y: 0, z: 33.4, role: 'hold', first: true },
      { type: 'E01', x: 2.7, y: 0, z: 36.5, role: 'flank', path: [[2.9, 29.5], [2.9, 23]] }] },
    eg02: { sector: 'z03_avenue', trigger: (p) => p.z > 45.5 && p.z < 80, units: [
      { type: 'E01', x: -8.5, y: 0, z: 66.6, role: 'hold' },
      { type: 'E01', x: 5.6, y: 0, z: 74.5, role: 'flank', path: [[9.5, 66], [9.5, 59]] },
      { type: 'E02', x: 13.1, y: 5.01, z: 65, role: 'sniper' }] },
    eg03: { sector: 'z05_vespera_plaza', trigger: null, units: [
      { type: 'E01', x: -6.5, y: 0, z: 130, role: 'flank', path: [[-10, 122], [-9, 112]], portal: true },
      { type: 'E01', x: 7, y: 0, z: 129.5, role: 'hold', path: [[7, 124]], portal: true },
      { type: 'DRONE', x: 0, y: 5.2, z: 129, role: 'drone' }] },
    eg05: { sector: 'z06_walkway', trigger: (p) => p.z > 163.3 && p.y > 3.5 && p.z < 184, units: [
      { type: 'E01', x: -2.6, y: 4.01, z: 183, role: 'hold', path: [[-5.2, 178.2]] },
      { type: 'E01', x: 2.6, y: 4.01, z: 183.2, role: 'flank', path: [[5, 180]] }] },
    eg04: { sector: 'z07_substation', trigger: (p) => p.z > 186.5, units: [
      { type: 'E01', x: -8.7, y: 4.01, z: 203.4, role: 'hold' },
      { type: 'E01', x: 8.7, y: 4.01, z: 195.4, role: 'flank', path: [[8.7, 190], [1, 188.5]] }] },
  };
  L.checkpoints = {
    cp00: { x: 0, y: 0.01, z: 2, yaw: 0 }, cp01: { x: 0, y: 0.01, z: 42.5, yaw: 0 },
    cp02: { x: 0, y: 4.01, z: 134, yaw: 0 }, cp03: { x: 0, y: 4.01, z: 186.2, yaw: 0 },
  };
  return L;
}

// Reatribui as 6 luzes reais aos pontos mais próximos do jogador, com fade.
export function updateLights(L, p, dt) {
  const spots = L.lights.filter((s) => s.intensity > 0).sort((a, b) => a.pos.distanceToSquared(p) - b.pos.distanceToSquared(p)).slice(0, L.lightPool.length);
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
