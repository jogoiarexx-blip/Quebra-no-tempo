// A1-M1 — RUA QUEBRADA (GDD §9 / §9.3). Geometria, encontros, puzzles e eventos da missão.
import * as THREE from 'three';
import { addCollider } from '../physics.js';
import { createBuilder, canvasTex, boxGeo, makeSky, makeSkyline, makeRain, streetLamp } from '../world.js';
import { CFG } from '../state.js';

const SECTOR_NAMES = {
  z01_garage: 'Garagem', z02_alley: 'Beco de Oficina', z03_avenue: 'Avenida Destruída', z04_hardware: 'Loja de Ferragens',
  z04b_duct: 'Duto de Ventilação', z05_vespera_plaza: 'Clube Véspera • Praça do Relógio', z06_walkway: 'Passarela', z07_substation: 'Subestação',
};
function sectorAt(p) {
  const z = p.z;
  if (z < 12.25) return 'z01_garage';
  if (z < 40.25) return 'z02_alley';
  if (z < 80.25) return 'z03_avenue';
  if (z < 96.25) return p.x > -1.75 ? 'z04b_duct' : 'z04_hardware';
  if (z < 136.2) return 'z05_vespera_plaza';
  if (z < 184.25) return 'z06_walkway';
  return 'z07_substation';
}

function build(scene) {
  const L = createBuilder(scene);
  const { M, root, B, D, light } = L;
  const pickup = L.pickup;
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
  const barrel = L.barrel;
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

  L.finish();

  // grupos de encontro (GDD §9.3.3) — 12 inimigos no total, máx. 4 regulares ativos
  L.groups = {
    eg01: { sector: 'z02_alley', trigger: (p) => p.z > 17 && p.z < 40, units: [
      { type: 'E01', x: -2.6, y: 0, z: 33.4, role: 'hold', first: true },
      { type: 'E01', x: 2.7, y: 0, z: 36.5, role: 'flank', path: [[2.9, 29.5], [2.9, 23]] }] },
    eg02: { sector: 'z03_avenue', trigger: (p) => p.z > 45.5 && p.z < 80, units: [
      { type: 'E01', x: -8.5, y: 0, z: 66.6, role: 'hold' },
      { type: 'E01', x: 5.6, y: 0, z: 74.5, role: 'flank', path: [[9.5, 66], [9.5, 59]] },
      { type: 'E02', x: 13.1, y: 5.01, z: 65, role: 'sniper', alt: [[13.1, 67.2], [13.1, 62.8]] }] },
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
  // atmosfera: céu, skyline, chuva e postes (melhoria v0.2)
  makeSky(L); makeSkyline(L, 0, 105, 190); makeRain(L);
  for (const [x, z, s] of [[-3.6, 46, 1], [3.6, 60, -1], [-3.6, 72, 1], [-11, 103, 1], [11, 128, -1]]) streetLamp(L, x, z, 0, 0xffc070, s);
  return L;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DOCS = {
  doc1: { k: 'ARQUIVO DE MEMÓRIA 01', t: 'Recibo que não existe', b: 'FERRAGENS IRMÃOS LUME — 14/03/2039\n\n1 x fusível industrial 40A ........ pago\n1 x "conserto de relógio de praça" . pago\n\nObservação do balconista:\nO cliente jura que comprou isto ontem. Eu juro que a loja estava fechada ontem. A câmera mostra os dois: ele comprando e a porta trancada. No mesmo minuto.\n\nRabisco no verso, outra letra:\n"Se o relógio da praça voltar a marcar III, a lembrança certa aparece. — S."' },
  doc2: { k: 'ARQUIVO DE MEMÓRIA 02', t: 'Fita do ensaio', b: 'TRANSCRIÇÃO — CLUBE VÉSPERA, BASTIDORES\n\nSOL: Cifra, solta a faixa sete sem os graves.\nDJ CIFRA: Sem os graves fica só o chiado.\nSOL: Não é chiado. Escuta o compasso: três batidas, pausa, uma. Repete a noite inteira, embaixo de qualquer música.\nDJ CIFRA: ...isso não está no meu arquivo original.\nSOL: Nem no meu ensaio de ontem. Alguém gravou por cima do que a gente lembra.\nMARA: Então a gente guarda a fita verdadeira num lugar que ninguém lembre de procurar.\n\n[fim da fita — etiqueta: "estoque da ferragem, mezanino"]' },
};
const DANCES = ['Superlove_Pop_Dance', 'All_Night_Dance', 'Not_Your_Mom'];
let lastSafe = null, puzzleT = 0, hintLevel = 0, solT = 0, solI = 0;

export default {
  id: 'A1-M1', name: 'Rua Quebrada', sectorNames: SECTOR_NAMES, sectorAt,
  sealsRequired: CFG.slice.exit.sealsRequired, sealsAvailable: 3, requiredFlags: CFG.slice.exit.requiredFlags,
  enemiesTotal: 12, secretsTotal: 3, next: 'A1-M2', ambientTrack: 0,
  build(scene, X) {
    const L = build(scene);
    // dançarinas na vitrine-palco: mesmo modelo, figurinos diferentes via máscara
    L.dancers = [['sol', 0.75, 0], ['lux', -0.8, 1]].map(([outfit, dz, off]) => { const a = X.npc({ asset: 'sol', outfit, x: L.pts.sol.x, y: L.pts.sol.y, z: L.pts.sol.z + dz, yaw: Math.PI / 2, anim: 'Idle', performer: true }); a.off = off; return a; });
    return L;
  },
  newState: () => ({ clock: 2 }),
  outdoor: (p) => !(p.z < 12.25 || (p.z > 80.5 && p.z < 96 && p.x < 13.5) || p.z > 184.3),
  apply(X) {
    const { S, L } = X, f = S.flags;
    X.setDoor('door_garage', !!f.got_pistol, true); X.setDoor('door_alley', !!f.alley_open, true); X.setDoor('door_shutter', !!f.generator_on, true); X.setDoor('door_basso', !!f.vespera_first_contact, true);
    const gl = S.destroyed.includes('glass'); L.glass.mesh.visible = !gl; L.glass.col.enabled = !gl;
    L.secretPanel.mesh.visible = !f.secret_substation;
    L.genLamp.material = f.generator_on ? L.M.lampOn : L.M.lampOff; L.storeLight.intensity = f.generator_on ? 26 : 5;
    L.breakerLamp.a.material = f.substation_breaker_a ? L.M.lampOn : L.M.lampOff; L.breakerLamp.b.material = f.substation_breaker_b ? L.M.lampOn : L.M.lampOff;
    const pw = f.substation_breaker_a && f.substation_breaker_b; for (const l of L.subLights) l.intensity = pw ? 34 : 0;
    L.termLamp.material = f.extraction_terminal_armed ? L.M.lampOn : L.M.lampOff;
    L.clockHand.rotation.z = S.clock * Math.PI / 2;
    const bus = S.oneShots.includes('bus'); L.bus.state = bus ? 'SETTLED' : 'INTACT'; L.bus.col.enabled = bus;
    if (bus) { L.bus.group.position.set(9.3, 0, 72.8); L.bus.group.rotation.set(0, 0.06, 0.08); } else { L.bus.group.position.set(8.6, 7.5, 76.6); L.bus.group.rotation.set(-0.12, 0.25, 0); }
    lastSafe = null; puzzleT = 0; hintLevel = 0;
  },
  pickupVisible: (X, pk) => !pk.id.startsWith('pk_secret') || X.S.flags.secret_substation,
  intro(X) {
    X.say('ÍRIS-9', 'Bracelete ativo. O noticiário acabou de mostrar você explodindo o reator municipal, Gael.');
    X.say('GAEL', 'Engraçado. Eu me lembro de estar aqui, sem explodir nada.');
    X.say('ÍRIS-9', 'Então alguém editou a lembrança da cidade inteira. Pegue a Martelo-9 no armário e saia pelo beco.');
  },
  objective(X) {
    const f = X.S.flags, S = X.S, sec = sectorAt(X.P.body.pos);
    if (!f.got_pistol) return 'Pegue a Martelo-9 no armário da garagem';
    if (!f.alley_open) return 'Abra caminho pelo Beco de Oficina';
    if (!S.groupsDone.includes('eg02') && sec === 'z03_avenue') return 'Cruze a avenida até a Loja de Ferragens';
    if (!f.generator_on && (sec === 'z03_avenue' || sec === 'z04_hardware')) return f.fuse_collected ? 'Instale o fusível e ligue o gerador da loja' : 'Loja sem energia: encontre o fusível';
    if (!f.vespera_first_contact && (sec === 'z05_vespera_plaza' || sec === 'z04_hardware' || sec === 'z04b_duct')) return 'Vá à praça e atenda o interfone do Clube Véspera';
    if (X.activeGroups.has('eg03')) return 'Sobreviva à emboscada na Praça do Relógio';
    if (sec !== 'z07_substation' && !(f.substation_breaker_a && f.substation_breaker_b)) return 'Suba à passarela e alcance a subestação';
    if (!(f.substation_breaker_a && f.substation_breaker_b)) return `Ligue os dois disjuntores (${(f.substation_breaker_a ? 1 : 0) + (f.substation_breaker_b ? 1 : 0)}/2)`;
    if (!f.extraction_terminal_armed) return 'Arme o terminal de extração';
    if (S.seals.length < this.sealsRequired) return 'Recupere mais 1 Selo de Continuidade (painel do relógio da praça ou gerador da loja)';
    return 'Alcance a Fenda de Saída';
  },
  // marcador do objetivo atual (só rota principal; segredos nunca são marcados)
  waypoint(X) {
    const f = X.S.flags, S = X.S, I = X.L.interact, p = X.P.body.pos, sec = sectorAt(p);
    if (!f.got_pistol) return I.locker;
    if (!f.alley_open) return S.groupsDone.includes('eg01') || !X.activeGroups.has('eg01') ? I.alley_switch : null;
    if (!f.generator_on) { if (sec === 'z01_garage' || sec === 'z02_alley' || sec === 'z03_avenue') return V(-6, 1, 80.8); return f.fuse_collected ? I.generator : I.fuse; }
    if (!f.vespera_first_contact) return sec === 'z04_hardware' ? V(-7, 1, 96.3) : I.intercom;
    if (X.activeGroups.has('eg03')) return null;
    if (!(f.substation_breaker_a && f.substation_breaker_b)) {
      if (p.z < 126) return V(0, 1, 126); if (p.z < 184 && p.y < 3.5) return V(0, 4.5, 133);
      if (p.z < 185) return V(0, 5, 186);
      return !f.substation_breaker_a ? I.breaker_a : I.breaker_b;
    }
    if (!f.extraction_terminal_armed) return I.terminal;
    if (S.seals.length < this.sealsRequired) return null;
    return X.L.pts.gate.clone().setY(X.L.pts.gate.y + 1.2);
  },
  interactables(X, add) {
    const { S, L, P } = X, f = S.flags, I = L.interact;
    if (!f.got_pistol) add(I.locker, 'Abrir armário', () => { f.got_pistol = true; X.giveWeapon('martelo9'); P.ammo.ammo9 = 45; X.setDoor('door_garage', true); X.sfx.pickup(); X.toast('MARTELO-9 ADQUIRIDA'); X.say('GAEL', 'Martelo-9. Velha, feia e pontual. Minha cara.'); X.say('ÍRIS-9', 'O alvo amarelo reage a tiros. Botão direito mira, Alt rola, C agacha, F dá coronhada.'); });
    if (!f.alley_open) add(I.alley_switch, 'Acionar chave de emergência do portão', () => { f.alley_open = true; X.setDoor('door_alley', true); });
    if (!f.fuse_collected) add(I.fuse, 'Pegar fusível', () => { f.fuse_collected = true; X.sfx.pickup(); X.toast('FUSÍVEL 40A'); puzzleT = 0; });
    if (!f.generator_on) add(I.generator, f.fuse_collected ? 'Instalar fusível e ligar o gerador' : 'Gerador sem fusível', () => {
      if (!f.fuse_collected) { X.toast('Falta o fusível — procure nos armários da loja'); X.sfx.empty(); return; }
      f.generator_on = true; f.generator_state = 'ON'; X.sfx.power(); X.setDoor('door_shutter', true); L.genLamp.material = L.M.lampOn; L.storeLight.intensity = 26;
      X.after(0.7, () => { X.grantSeal('seal_a1m1_shop', L.pts.seal_shop); X.say('ÍRIS-9', 'Registro verdadeiro recuperado. Isso é um Selo de Continuidade: dois deles firmam uma Fenda de Saída.'); });
    });
    for (const id of ['doc1', 'doc2']) add(I[id], 'Ler arquivo de memória', () => { if (!S.archives.includes(id)) { S.archives.push(id); if (id === 'doc2' && !S.secrets.includes('duct')) S.secrets.push('duct'); } X.openDoc(DOCS[id]); });
    if (!f.vespera_first_contact) add(I.intercom, 'Atender o interfone do Véspera', () => {
      f.vespera_first_contact = true; X.setDoor('door_basso', true);
      X.say('MARA', 'Clube Véspera. Se veio prender alguém, entre na fila. Se veio entender o sinal, escute.');
      X.say('SOL', 'A trilha do palco carrega uma frequência escondida. Ela regrava o que as pessoas lembram.');
      X.say('SOL', 'O relógio da praça marca a hora errada desde que isso começou. O letreiro ainda sabe a certa.');
      X.say('BASSO', 'Porta lateral destrancada. Tem curativo, cartucho e nenhuma bebida. Não abuse.');
      X.say('MARA', 'A origem do pulso é a subestação, depois da passarela. E Gael: não banque o herói sozinho.');
      X.after(9, () => { if (!S.groupsDone.includes('eg03') && !X.activeGroups.has('eg03')) startAmbush(X); });
    });
    if (!f.clock_panel_solved) add(I.clock_panel, 'Girar o ponteiro do relógio', () => {
      S.clock = (S.clock + 1) % 4; L.clockHand.rotation.z = S.clock * Math.PI / 2; X.sfx.ui();
      if (S.clock === 1) { f.clock_panel_solved = true; X.sfx.power(); X.after(0.5, () => { X.grantSeal('seal_a1m1_plaza', L.pts.seal_plaza); X.say('SOL', 'Três em ponto. A praça inteira acabou de lembrar que horas são.'); }); }
    });
    for (const k of ['a', 'b']) if (!f['substation_breaker_' + k]) add(I['breaker_' + k], `Ligar disjuntor ${k.toUpperCase()}`, () => {
      f['substation_breaker_' + k] = true; X.sfx.power(); L.breakerLamp[k].material = L.M.lampOn;
      if (f.substation_breaker_a && f.substation_breaker_b) { f.both_breakers_ON = true; for (const l of L.subLights) l.intensity = 34; X.after(0.8, () => { X.grantSeal('seal_a1m1_substation', L.pts.seal_substation); X.say('ÍRIS-9', 'Energia estável. Arme o terminal para firmar a Fenda.'); }); }
    });
    if (!f.secret_substation) add(I.secret_panel, 'Remover painel solto', () => { f.secret_substation = true; S.secrets.push('substation_panel'); L.secretPanel.mesh.visible = false; X.sfx.door(); X.toast('SEGREDO ENCONTRADO'); X.refreshPickups(); });
    if (!f.extraction_terminal_armed) add(I.terminal, f.substation_breaker_a && f.substation_breaker_b ? 'Armar terminal de extração' : 'Terminal sem energia', () => {
      if (!(f.substation_breaker_a && f.substation_breaker_b)) { X.toast('Ligue os dois disjuntores primeiro'); X.sfx.empty(); return; }
      f.extraction_terminal_armed = true; L.termLamp.material = L.M.lampOn; X.sfx.power();
      X.say('ÍRIS-9', X.gateStable() ? 'Fenda de Saída estável. Atravesse quando quiser.' : 'Fenda energizada, mas instável: falta um Selo. O painel do relógio na praça resolve.');
    });
  },
  gateHint(X) { return X.S.seals.length < this.sealsRequired ? `FENDA INSTÁVEL • SELOS ${X.S.seals.length}/${this.sealsRequired}` : 'FENDA SEM ENERGIA • disjuntores e terminal'; },
  exitLine: 'Primeiro pulso identificado. Origem: o palco do Véspera.',
  tick(X, dt) {
    const { S, P, L } = X, p = P.body.pos, f = S.flags, sec = sectorAt(p);
    if (sec === 'z03_avenue' && p.z > 57 && X.once('bus')) { L.bus.state = 'FALLING'; L.bus.t = 0; }
    if (sec === 'z04_hardware' && X.once('store_enter')) X.say('ÍRIS-9', 'Portão de enrolar sem energia. Gerador nos fundos, fusível em algum armário.');
    if (sec === 'z04b_duct' && p.x > 0 && X.once('duct')) { if (!S.secrets.includes('duct')) S.secrets.push('duct'); X.toast('SEGREDO ENCONTRADO • duto de ventilação'); }
    if (sec === 'z05_vespera_plaza' && p.z > 98 && X.once('neon')) X.say('GAEL', 'Esse letreiro acabou de me mostrar um aniversário que eu nunca tive.');
    if (sec === 'z06_walkway' && p.z > 137 && X.once('walk_tip')) X.say('ÍRIS-9', 'Bordas com faixa amarela aguentam você. Segure Espaço para saltar mais alto e agarrar.');
    if (sec === 'z07_substation' && X.once('sub_enter')) X.say('ÍRIS-9', 'Dois disjuntores, um em cada parede. O capacitor vermelho no meio explode bonito.');
    if (S.checkpointId === 'cp00' && f.alley_open && p.z > 41.6) { X.saveCheckpoint('cp01'); X.say('ÍRIS-9', 'Beco limpo. Atirador na sacada à esquerda da avenida: o laser avisa antes do disparo.'); }
    if ((S.checkpointId === 'cp00' || S.checkpointId === 'cp01') && p.z > 132.4 && p.z < 136 && p.y > 3.8 && P.body.grounded) { if (!P.eco.unlocked) { P.eco.charges = 0; P.eco.teaser = false; } f.eco_teaser_available = false; X.saveCheckpoint('cp02'); }
    if (S.checkpointId !== 'cp03' && p.z > 185.3 && P.body.grounded) X.saveCheckpoint('cp03');
    if (sec === 'z06_walkway' && p.z < 170) {
      if (P.body.grounded && p.y > 3.5 && P.state === 'GROUNDED') { if (!lastSafe) lastSafe = new THREE.Vector3(); const g = P.body.ground; if (g && p.z > g.min[2] + 0.5 && p.z < g.max[2] - 0.5) lastSafe.copy(p); }
      if (p.y < 1.6) X.fallRecover(lastSafe || V(0, 4.01, 134));
    }
    if (sec === 'z04_hardware' && !f.generator_on && X.settings.hints) { puzzleT += dt; if (puzzleT > 180 && hintLevel === 0) { hintLevel = 1; X.say('ÍRIS-9', 'Dica: há um armário metálico na parede à direita de quem entra na loja.'); } if (puzzleT > 300 && hintLevel === 1) { hintLevel = 2; X.say('ÍRIS-9', 'O fusível está no armário da parede direita; o gerador fica do outro lado, perto do portão de enrolar.'); } }
  },
  groupPending: (X, id) => id === 'eg03' && X.hasTimers(),
  onGroupStart(X, id) {
    if (id === 'eg01') X.say('ÍRIS-9', 'Dois Saqueadores Cronais. O barril vermelho não está ali de enfeite.');
    if (id === 'eg05') X.say('ÍRIS-9', 'Dois saindo da subestação. Use as caixas do pátio.');
  },
  onGroupDone(X, id) {
    const f = X.S.flags;
    if (id === 'eg01' && !f.alley_open) { f.alley_open = true; X.setDoor('door_alley', true); }
    if (id === 'eg02') X.say('GAEL', 'Avenida liberada. A loja de ferragens ainda tem luz de emergência.');
    if (id === 'eg03') { if (!f.eco_teaser_used && !X.P.eco.unlocked) X.say('SOL', 'O bracelete piscou e você nem ligou. Tudo bem, a noite é longa.'); X.say('MARA', 'Praça limpa. A escada do fundo leva à passarela.'); }
  },
  onShootCollider(X, c, dmg, point) {
    const S = X.S, L = X.L;
    if (c.glass && dmg > 0 && !S.destroyed.includes('glass')) { S.destroyed.push('glass'); L.glass.mesh.visible = false; L.glass.col.enabled = false; X.sfx.glass(); X.fx.sparks(point, 0xbfefff, 40, 5, 0.8); if (!S.secrets.includes('vitrine')) { S.secrets.push('vitrine'); X.toast('VITRINE QUEBRADA • algo brilha lá dentro'); } }
    if (c.target && dmg > 0) { X.fx.flash(point, 0.4, 0.12, 0xffe060); if (X.once('target_hit')) X.toast('ALVO REATIVO • mira calibrada'); }
  },
  barrelRadius: (id) => (id === 'capacitor_sub' ? 7 : 5.5),
  onEcoUsed(X) { if (!X.P.eco.unlocked) { X.S.flags.eco_teaser_used = true; X.S.flags.eco_teaser_available = false; X.say('SOL', 'Você... voltou no tempo um pouquinho? Isso explicaria muito sobre os meus ensaios.'); } },
  deathTips: ['Role (Alt ou Z) quando o visor do inimigo piscar — o tiro vem logo depois.', 'O laser vermelho do atirador trava meio segundo antes do disparo. Saia da linha.', 'Barris vermelhos e o capacitor da subestação resolvem grupos inteiros.', 'Armadura absorve 65% do dano. Procure os kits azuis.', 'Coronhada (F) derruba um Saqueador de perto e abre espaço.'],
  frame(X, dt, t, sim) {
    const { L, P } = X;
    const bus = L.bus;
    if (bus.state === 'FALLING' && sim) { bus.t += dt; const k = Math.min(1, bus.t / 1.25), e = k * k; bus.group.position.set(8.6 + 0.7 * k, 7.5 - 7.5 * e, 76.6 - 3.8 * k); bus.group.rotation.set(-0.12 - 1.0 * Math.sin(k * 3.14), 0.25 - 0.19 * k, 0.08 * k);
      if (k >= 1) { bus.state = 'SETTLED'; X.sfx.crash(); X.fx.shake(0.5); X.fx.sparks(V(9.3, 0.5, 72.8), 0xffc060, 60, 8, 1); X.say('GAEL', 'Aquele ônibus tinha horário. Agora tem cratera.'); } }
    if (bus.state === 'SETTLED' && !bus.col.enabled) { const p = P.body.pos; if (!(p.x > 6.8 && p.x < 11.8 && p.z > 68 && p.z < 77.6)) bus.col.enabled = true; }
    const gl = Math.sin(t * 0.9) > 0.9 || Math.sin(t * 7.3) > 0.985; L.neon.material.map = L.neonTex[gl ? 1 : 0]; L.neonLight.color = gl ? 0x35e6ff : 0xff4fd0;
    const ref = X.playing ? P.body.pos : X.camera.position, near = Math.abs(ref.z - 117) < 70;
    if (near) { solT -= dt; if (solT <= 0) { solI = (solI + 1) % DANCES.length; solT = 14; } }
    for (const d of L.dancers) { d.setVisible(near); if (near) d.actor.play(DANCES[(solI + d.off) % DANCES.length], 0.6); }
    L.water.material.opacity = 0.45 + 0.12 * Math.sin(t * 3);
  },
  menuCam(t, cam) { cam.position.set(3 + Math.sin(t * 0.12) * 5, 3.2 + Math.sin(t * 0.2) * 0.4, 108 + Math.cos(t * 0.12) * 4); cam.lookAt(-15, 4.6, 116); return V(-8, 3, 114); },
  resultsText: (X) => `${X.S.pecas} Peças Cronais recolhidas. A1-M2 — Noite de Neon está liberada: o Véspera espera por você.`,
};

function startAmbush(X) {
  const S = X.S, P = X.P;
  X.portal.target = 1; X.sfx.portal(); X.startGroup('eg03', false); S.flags.eg03_started = true;
  X.say('ÍRIS-9', 'Fenda abrindo sobre a praça! Drone e reforços — troque a altura da mira.');
  X.after(1.2, () => X.spawnGroup('eg03'));
  X.after(4.5, () => {            // pulso: 1 carga demonstrativa de Eco Cronal (não permanente)
    if (!X.once('eco_pulse') || P.eco.unlocked) return;
    S.flags.eco_teaser_seen = true; S.flags.eco_teaser_available = true; P.eco.charges = CFG.eco.teaserCharges; P.eco.teaser = true;
    X.fx.flash(P.body.pos.clone().setY(P.body.pos.y + 1), 3, 0.5, 0x35e6ff); X.sfx.eco();
    X.say('ÍRIS-9', 'O pulso carregou o bracelete: uma carga de Eco Cronal. Q devolve você para onde estava há três segundos.');
  });
  X.after(7, () => (X.portal.target = 0));
}
