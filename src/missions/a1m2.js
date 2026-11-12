// A1-M2 — NOITE DE NEON (GDD §28). Clube Véspera: zona social, show, painel de luz, jukebox, porta VIP,
// apagão com Eco Cronal definitivo, invasão com transmissor, bastidores (agachar/saltar/câmera), elevador e metrô.
import * as THREE from 'three';
import { addCollider, lineOfSight } from '../physics.js';
import { createBuilder, canvasTex, makeSky, makeSkyline, makeRain, streetLamp } from '../world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SECTOR_NAMES = {
  street: 'Rua do Elevador', reception: 'Véspera • Recepção', vip: 'Véspera • Camarote VIP', hall: 'Véspera • Salão Principal', bath: 'Véspera • Banheiros',
  service: 'Corredor de Serviço', backstage: 'Bastidores', metro: 'Túnel de Serviço do Metrô',
};
function sectorAt(p) {
  if (p.y < -2.5) return 'metro';
  if (p.z < 14.25) return 'street';
  if (p.z < 22.25) return p.x > 7.25 ? 'vip' : 'reception';
  if (p.z < 50.75) { if (p.x < -14.75) return 'bath'; if (p.x > 14.75) return 'service'; return 'hall'; }
  if (p.x < -15) return 'bath';
  return 'backstage';
}
const CHANNELS = [['CIANO', 0x35e6ff], ['ÂMBAR', 0xffb030], ['MAGENTA', 0xff3ad0], ['VERDE', 0x4dff88]];
const DANCES = ['Superlove_Pop_Dance', 'All_Night_Dance', 'Not_Your_Mom'];
const DOCS = {
  bath: { k: 'ARQUIVO DE MEMÓRIA 03', t: 'Propaganda no banheiro', b: 'CARTAZ COLADO SOBRE O ESPELHO (impressão ainda úmida):\n\n"NOVA AURORA LEMBRA: GAEL ROCHA EXPLODIU O REATOR.\nVOCÊ VIU. VOCÊ SEMPRE SOUBE."\n\nNo canto, a letra miúda da gráfica:\n"Tiragem autorizada pela Comissão de Memória Pública — data de impressão: amanhã."\n\nAlguém escreveu embaixo, de batom:\n"Amanhã ainda não chegou, gênio. — R."' },
  arcade: { k: 'ARQUIVO DE MEMÓRIA 04', t: 'Registro corrompido', b: 'FLIPERAMA "CORRIDA DE NÉON" — TABELA DE RECORDES\n\n1. SOL ........ 998.120\n2. CIFRA ...... 640.300\n3. MARA ....... 512.000\n4. GAEL ....... 000.003   ← (inserido 14/03/2039, 23:61)\n\nNota do técnico: o horário 23:61 não existe. O placar se reescreve sozinho toda vez que a faixa sete toca.\nO Gael nunca jogou aqui. A máquina jura que sim.' },
  vip: { k: 'ARQUIVO DE MEMÓRIA 05', t: 'Gravação original', b: 'CAIXA DE FITA — COFRE DO CAMAROTE\nEtiqueta à mão: "NOITE DE 13/03. NÃO REGRAVAR."\n\nTRANSCRIÇÃO PARCIAL:\n[música, aplausos]\nMARA: ...então o noticiário passou a mostrar o reator, mas o Gael estava sentado ali no bar, comendo amendoim.\nBASSO: Três copos d\'água. Eu cobrei os três.\n[ruído — três bipes, pausa, um]\nVOZ DESCONHECIDA: Regravação iniciada. Público: 214. Sujeito: G. Rocha.\n\nCom esta fita, existe uma prova que a cidade não editou.' },
};
let camYaw = 0, camDir = 1, elevY = 0, train = null;

function build(scene, X) {
  const L = createBuilder(scene);
  const { M, root, B, D, light } = L;
  const pickup = L.pickup;
  L.fogColor = 0x0c0a14; L.fogDensity = 0.014; L.hemi = 0.9; L.moon = 0.5;

  // ---------------- piso (com o poço do elevador aberto) ----------------
  B(M.wet, -24, 24, -1, 0, -14, 14.5, { tile: 6 });
  B(M.clubFloor, -24, 24, -1, 0, 14.5, 60.5, { tile: 4 });
  B(M.floor, -24, -13.5, -1, 0, 60.5, 66); B(M.floor, -10.5, 24, -1, 0, 60.5, 66); B(M.floor, -13.5, -10.5, -1, 0, 63.5, 66);

  // ---------------- RUA ----------------
  B(M.building, -24, -12, 0, 14, -14, 14); B(M.building, 12, 24, 0, 14, -14, 14); B(M.building, -12, 12, 0, 14, -14, -5);
  B(M.car2, -9.8, -7.8, 0, 1.4, 1, 5.4); B(M.car, 7.6, 9.6, 0, 1.4, 6, 10.4); B(M.rust, -10.8, -9.6, 0, 1.3, 9.5, 11.4);
  // fachada do clube
  B(M.wallClub, -24, -1.5, 0, 14, 14, 14.5); B(M.wallClub, 1.5, 24, 0, 14, 14, 14.5); B(M.wallClub, -1.5, 1.5, 3, 14, 14, 14.5);
  B(M.neonPink, -1.8, 1.8, 3.0, 3.15, 13.9, 14, { noCol: true }); B(M.neonPink, -1.8, -1.65, 0, 3.0, 13.9, 14, { noCol: true }); B(M.neonPink, 1.65, 1.8, 0, 3.0, 13.9, 14, { noCol: true });
  B(M.velvet, -3.2, -2.6, 0, 1.0, 12.6, 13.0); B(M.velvet, 2.6, 3.2, 0, 1.0, 12.6, 13.0);      // cordão de entrada
  { const mk = (txt, sub, col) => canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#12060f'; g.fillRect(0, 0, w, h); g.shadowColor = col; g.shadowBlur = 34; g.fillStyle = col; g.font = 'bold 150px Georgia, serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, 150); g.shadowBlur = 12; g.font = '34px Arial'; g.fillStyle = '#ffd9a0'; g.fillText(sub, w / 2, 220); }, false);
    L.neonTex = [mk('VÉSPERA', 'CLUBE • SHOW AO VIVO • ABERTO ATÉ AS 3', '#ff4fd0'), mk('VÉSPERA', 'HOJE: SOL VEGA • RUBI • MAYA • JADE', '#9a5cff')];
    L.neon = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.4), new THREE.MeshBasicMaterial({ map: L.neonTex[0] })); L.neon.position.set(0, 6.2, 13.94); L.neon.rotation.y = Math.PI; root.add(L.neon); }
  light(0, 5, 11.5, 0xff4fd0, 50, 18); light(0, 2.6, 15.5, 0xff8ad8, 18, 8);
  streetLamp(L, -7, 8, 0, 0xffc070, 1); streetLamp(L, 7, 4, 0, 0xffc070, -1);
  L.pts.spawn = { x: 0, y: 0.01, z: 2, yaw: 0 };

  // ---------------- RECEPÇÃO ----------------
  B(M.wallClub, -7.5, -7, 0, 3.6, 14.5, 22); B(M.wallClub, 7, 7.5, 0, 3.6, 14.5, 17); B(M.wallClub, 7, 7.5, 0, 3.6, 19, 22); B(M.wallClub, 7, 7.5, 2.6, 3.6, 17, 19);
  B(M.dark, -7.5, 15.5, 3.6, 3.9, 14.5, 22);
  B(M.dark, -24, -7.5, 0, 14, 14.5, 22); B(M.dark, 15.5, 24, 0, 14, 14.5, 22);
  B(M.bar, -6, -3, 0, 1.1, 16, 16.9);                                   // chapelaria
  B(M.neonViolet, -6, -3, 1.1, 1.14, 16, 16.9, { noCol: true });
  L.doors.door_vip = D(M.metal, 7.05, 7.45, 0, 2.6, 17, 19);
  B(M.metal, 6.84, 7.0, 1.2, 1.6, 15.9, 16.3, { noCol: true }); L.keypadLamp = L.mesh(new THREE.BoxGeometry(0.03, 0.06, 0.2), M.lampRed, 6.83, 1.5, 16.1);
  L.interact.keypad = V(6.4, 1.3, 16.1);
  light(0, 3.2, 18, 0xffb0e0, 20, 10);

  // ---------------- CAMAROTE VIP ----------------
  B(M.velvet, 9, 14.8, 0, 0.9, 20.6, 21.9); B(M.velvet, 14.0, 14.9, 0, 0.9, 15, 20.5);
  B(M.bar, 10.5, 12.5, 0, 0.5, 17.6, 19.2);
  B(M.metal, 14.1, 14.95, 0, 1.0, 15.0, 15.9);                           // cofre
  L.safeDoor = L.mesh(new THREE.BoxGeometry(0.05, 0.6, 0.6), M.metal, 14.07, 0.55, 15.45);
  L.interact.safe = V(13.6, 1.0, 15.45);
  light(11, 3.2, 18, 0xffc070, 16, 9);
  L.pts.seal_vip = V(13.2, 1.4, 16.4);

  // ---------------- SALÃO PRINCIPAL ----------------
  B(M.wallClub, -24, -1.5, 0, 7.3, 22, 22.5); B(M.wallClub, 1.5, 24, 0, 7.3, 22, 22.5); B(M.wallClub, -1.5, 1.5, 3, 7.3, 22, 22.5);
  B(M.wallClub, -15, -14.5, 0, 7.3, 22.5, 42); B(M.wallClub, -15, -14.5, 0, 7.3, 44, 50.5); B(M.wallClub, -15, -14.5, 2.6, 7.3, 42, 44);
  B(M.wallClub, 14.5, 15, 0, 7.3, 22.5, 30); B(M.wallClub, 14.5, 15, 0, 7.3, 32, 50.5); B(M.wallClub, 14.5, 15, 2.6, 7.3, 30, 32);
  B(M.wallClub, -24, -20.3, 0, 7.3, 50.5, 51); B(M.wallClub, -18.5, -1.5, 0, 7.3, 50.5, 51); B(M.wallClub, 1.5, 15, 0, 7.3, 50.5, 51); B(M.wallClub, -1.5, 1.5, 2.6, 7.3, 50.5, 51);
  B(M.dark, -15, 15, 7.3, 7.6, 22, 51);
  L.doors.door_service = D(M.metal, 14.55, 14.95, 0, 2.6, 30, 32);
  L.doors.door_stage = D(M.velvet, -1.5, 1.5, 1.0, 2.6, 50.55, 50.95);
  // palco + passarela
  B(M.dark, -8, 8, 0, 1.0, 43, 50.5); B(M.dark, -1.5, 1.5, 0, 1.0, 35, 43);
  B(M.neonPink, -8, 8, 0.96, 1.02, 42.95, 43.02, { noCol: true }); B(M.neonPink, -1.55, -1.48, 0.96, 1.02, 35, 43, { noCol: true }); B(M.neonPink, 1.48, 1.55, 0.96, 1.02, 35, 43, { noCol: true }); B(M.neonPink, -1.5, 1.5, 0.96, 1.02, 34.95, 35.02, { noCol: true });
  for (const sx of [1, -1]) { B(M.metal, 8 * sx, 8.8 * sx, 0, 0.9, 44, 46); B(M.metal, 8.8 * sx, 9.6 * sx, 0, 0.45, 44, 46); }
  B(M.velvet, -8, 8, 1.0, 7.3, 50.3, 50.5, { noCol: true });
  for (const [x, z] of [[0, 39.6], [-5, 47.2], [5, 47.2]]) L.mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.3, 8), M.rail, x, 4.15, z);
  // canhões de luz (o canal "fora do compasso" é o sinal escondido)
  L.spots = CHANNELS.map(([, col], i) => {
    const x = -6 + i * 4, cone = new THREE.Mesh(new THREE.ConeGeometry(2.0, 6.0, 20, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    cone.position.set(x, 4.2, 46); root.add(cone);
    const head = L.mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.45, 10), new THREE.MeshBasicMaterial({ color: col }), x, 7.1, 46);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 1.03, 46); root.add(pool);
    return { cone, head, pool, col, l: light(x, 5.5, 45.5, col, 22, 9), on: true, cut: 0 };
  });
  L.pts.seal_stage = V(12, 3.8, 44.5);
  // bar
  B(M.bar, -11, -10.3, 0, 1.1, 26, 38); B(M.neonAmber, -10.35, -10.28, 0.9, 0.95, 26, 38, { noCol: true });
  B(M.bar, -14.5, -13.8, 0, 2.4, 25, 39);
  { const bottle = new THREE.BoxGeometry(0.1, 0.32, 0.1); const cols = [0x35e6ff, 0xffb030, 0x4dff88, 0xff4fd0, 0x9a5cff];
    for (let i = 0; i < 26; i++) L.mesh(bottle, new THREE.MeshBasicMaterial({ color: cols[i % 5] }), -14.0, 1.1 + (i % 2) * 0.62, 25.6 + i * 0.5); }
  for (let z = 27; z <= 37; z += 2.5) L.mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 10), M.velvet, -9.6, 0.4, z);
  L.interact.basso = V(-10, 1.3, 31);
  // mesas (cobertura)
  L.tables = [[-6, 27.5], [-3, 31.5], [4, 28.5], [7.5, 33], [-7, 36], [5.5, 38.5], [-4.5, 40.5]];
  for (const [x, z] of L.tables) { L.mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.0, 14), M.bar, x, 0.5, z); addCollider(x - 0.55, x + 0.55, 0, 1.0, z - 0.55, z + 0.55); L.mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), M.neonAmber, x, 1.03, z); }
  // cabine de luz (elevada) com escada
  B(M.dark, 9, 14.5, 0, 2.4, 40, 48);
  for (let k = 0; k < 6; k++) B(M.metal, 12.6, 14.5, 0, 0.4 * (k + 1), 34 + k, 35 + k, { tile: 2 });
  B(M.rail, 9, 9.08, 2.4, 3.4, 40, 48, { col: { seeThrough: true } });
  B(M.metal, 14.2, 14.5, 3.0, 4.2, 43.3, 45.9, { noCol: true });
  L.panelBtns = CHANNELS.map(([, col], i) => L.mesh(new THREE.BoxGeometry(0.06, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: col }), 14.17, 3.6, 43.6 + i * 0.6));
  B(M.metal, 9.4, 10.6, 2.4, 3.4, 46.6, 47.8); L.consoleLamp = L.mesh(new THREE.BoxGeometry(0.9, 0.1, 0.4), M.lampOff, 10, 3.45, 47.2);
  L.interact.console = V(10.2, 3.6, 46.4);
  L.pts.panel = V(13.6, 3.6, 44.5);
  // jukebox e fliperama
  B(M.bar, 11.8, 13.2, 0, 1.7, 22.5, 23.3); L.jukeLamp = L.mesh(new THREE.BoxGeometry(1.1, 0.5, 0.05), M.neonAmber, 12.5, 1.2, 23.33);
  L.interact.jukebox = V(12.5, 1.2, 24.0);
  B(M.dark, -13.6, -12.4, 0, 1.8, 22.5, 23.3); L.arcadeScreen = L.mesh(new THREE.BoxGeometry(0.9, 0.6, 0.04), M.neonCyan, -13, 1.35, 23.33);
  L.interact.arcade = V(-13, 1.2, 24.0);
  // TVs CRT e cartazes
  const tvTex = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#0b1a24'; g.fillRect(0, 0, w, h); g.fillStyle = '#35e6ff'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('PLANTÃO', w / 2, 50); g.fillStyle = '#ffd9a0'; g.font = '18px Arial'; g.fillText('REATOR: SUSPEITO À SOLTA', w / 2, 100); g.fillText('"VOCÊ VIU. VOCÊ SABE."', w / 2, 140); }, false);
  for (const [x, z, ry] of [[-14.45, 30, Math.PI / 2], [14.45, 38, -Math.PI / 2], [-14.45, 46, Math.PI / 2]]) { const m = L.mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshBasicMaterial({ map: tvTex }), x, 4.3, z); m.rotation.y = ry; }
  L.hallLights = [light(-6, 6.6, 28, 0xff4fd0, 26, 14), light(6, 6.6, 30, 0x9a5cff, 26, 14), light(-6, 6.6, 38, 0xffb030, 22, 12), light(6, 6.6, 40, 0x35e6ff, 22, 12), light(-11.5, 3, 31, 0xffb070, 18, 9)];
  L.emLights = [light(0, 6.8, 25, 0xff1a1a, 0, 18), light(-10, 6.8, 40, 0xff1a1a, 0, 16), light(10, 6.8, 36, 0xff1a1a, 0, 16), light(16.8, 3, 40, 0xff1a1a, 0, 12)];
  L.emBeacons = [[0, 7.2, 22.6], [-14.4, 6.8, 36], [14.4, 6.8, 44]].map(([x, y, z]) => L.mesh(new THREE.BoxGeometry(0.4, 0.25, 0.25), M.lampOff, x, y, z));
  L.barrel('fog_a', -9.6, 0, 42.4, 30); L.barrel('fog_b', 9.8, 0, 26.2, 30);
  // transmissor portátil (aparece na invasão)
  { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), M.metal)); const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), M.rail); ant.position.y = 1.0; g.add(ant);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); lamp.position.y = 1.75; g.add(lamp);
    g.position.set(0, 0.35, 27); g.visible = false; root.add(g);
    L.transmitter = { group: g, lamp, hp: 160, alive: false, col: addCollider(-0.45, 0.45, 0, 1.05, 26.7, 27.3, { transmitter: true }) }; L.transmitter.col.enabled = false; }

  // ---------------- BANHEIROS + duto secreto ----------------
  B(M.tile, -22.5, -22, 0, 3.2, 37.5, 48.5); B(M.tile, -22.5, -15, 0, 3.2, 37.5, 38); B(M.tile, -22.5, -20.3, 0, 3.2, 48, 48.5); B(M.tile, -18.5, -15, 0, 3.2, 48, 48.5); B(M.tile, -20.3, -18.5, 1.25, 3.2, 48, 48.5);
  B(M.dark, -22.5, -15, 3.2, 3.5, 37.5, 48.5); B(M.tile, -22, -15, 0, 0.02, 38, 48, { noCol: true });
  for (let i = 0; i < 3; i++) B(M.tile, -21.9, -21.3, 0, 0.9, 39 + i * 1.6, 40 + i * 1.6);
  for (let i = 0; i < 3; i++) B(M.tile, -17.3 + i * 0.0, -15.1, 0, 2.2, 39.2 + i * 2.6, 39.3 + i * 2.6);
  L.mirror = D(M.mirror, -21.98, -21.92, 1.2, 2.3, 39, 43.8, { mirror: true });
  L.grate = D(M.metal, -20.2, -18.6, 0, 1.2, 48.1, 48.3, { grate: true });
  L.interact.poster = V(-18.6, 1.6, 38.6); L.mesh(new THREE.PlaneGeometry(0.9, 1.2), new THREE.MeshBasicMaterial({ color: 0xd8c08a }), -18.6, 1.7, 38.03);
  // duto (só agachado: teto a 1,25 m)
  B(M.metal, -20.3, -20.0, 0, 1.6, 48.5, 53); B(M.metal, -18.8, -18.5, 0, 1.6, 48.5, 51.2); B(M.metal, -20.3, -18.5, 1.25, 1.6, 48.5, 53);
  B(M.metal, -20.3, -15.5, 0, 1.6, 52.7, 53); B(M.metal, -18.8, -15.5, 0, 1.6, 51.2, 51.5); B(M.metal, -20.3, -15.5, 1.25, 1.6, 51.2, 53);
  B(M.dark, -24, -20.3, 0, 7, 48.5, 66); B(M.dark, -18.5, -15.5, 0, 7, 48.5, 51.2); B(M.dark, -20.3, -15.5, 0, 7, 53, 66);
  light(-18.5, 2.9, 43, 0xdde6ff, 14, 9);

  // ---------------- CORREDOR DE SERVIÇO ----------------
  B(M.concrete, 18.5, 19, 0, 3.3, 22.5, 51); B(M.concrete, 15, 18.5, 0, 3.3, 22, 22.5); B(M.dark, 15, 19, 3.3, 3.6, 22, 51);
  B(M.rust, 15, 18.5, 1.25, 1.6, 38, 38.8);                               // viga caída: só passa agachado
  B(M.rust, 15, 18.5, 0, 0.95, 44, 44.5);                                 // estante tombada: saltar/escalar
  B(M.wood, 15.2, 16.4, 0, 1.2, 25, 26.4); B(M.wood, 17.2, 18.4, 0, 1.0, 33, 34.2);
  B(M.hazard, 15, 18.5, 1.6, 1.8, 38.1, 38.7, { noCol: true, tile: 1 });
  L.emLights.push(light(16.8, 3, 28, 0xff1a1a, 0, 10));

  // ---------------- BASTIDORES ----------------
  B(M.concrete, -15.5, -15, 0, 3.4, 51, 51.5); B(M.concrete, -15.5, -15, 0, 3.4, 52.7, 64.5);       // parede oeste com saída do duto
  B(M.concrete, -15.5, -15, 1.25, 3.4, 51.5, 52.7);
  B(M.concrete, 18.5, 19, 0, 3.4, 51, 64.5); B(M.concrete, -15.5, 19, 0, 3.4, 64, 64.5); B(M.dark, -15.5, 19, 3.4, 3.7, 51, 64.5);
  B(M.concrete, -15, -11, 0, 3.4, 55, 55.5); B(M.concrete, -9, -1, 0, 3.4, 55, 55.5); B(M.concrete, 1, 9, 0, 3.4, 55, 55.5); B(M.concrete, 11, 18.5, 0, 3.4, 55, 55.5);
  B(M.concrete, -11, -9, 2.6, 3.4, 55, 55.5); B(M.concrete, -1, 1, 2.6, 3.4, 55, 55.5); B(M.concrete, 9, 11, 2.6, 3.4, 55, 55.5);
  B(M.concrete, -6, -5.5, 0, 3.4, 55.5, 64); B(M.concrete, 6, 6.5, 0, 3.4, 55.5, 64);
  L.doors.door_office = D(M.metal, -11, -9, 0, 2.6, 55.05, 55.45);
  L.doors.door_dressing = D(M.velvet, -1, 1, 0, 2.6, 55.05, 55.45);
  { const t = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#1a0a14'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7ad8'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('CAMARIM • SÓ ARTISTAS', w / 2, 40); }, false);
    const s = L.mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: t }), 0, 2.85, 54.98); s.rotation.y = Math.PI; }
  B(M.wood, 2.5, 3.7, 0, 1.3, 51.6, 52.8); B(M.wood, 7.0, 8.2, 0, 1.3, 53.4, 54.6); B(M.wood, 12.2, 13.4, 0, 1.3, 51.6, 52.8);   // caixas (cobertura da câmera)
  B(M.metal, 15.8, 18.3, 0, 1.0, 58, 59.4); B(M.metal, 16.2, 18.3, 1.0, 1.25, 61, 63.6);        // estúdio do Cifra
  L.backupLamp = L.mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), M.neonCyan, 17.4, 1.45, 62.2);
  L.interact.backup = V(16.6, 1.2, 62.2); L.pts.seal_backstage = V(15.6, 1.5, 61);
  B(M.bar, -14.5, -12, 0, 0.9, 56, 57.2); L.interact.mara_desk = V(-12.6, 1.2, 57.9);
  light(-8, 3.1, 53, 0xfff0d0, 14, 10); light(8, 3.1, 53, 0xfff0d0, 14, 10); light(12, 3.1, 60, 0x9ad0ff, 16, 9); light(-10, 3.1, 60, 0xffc070, 14, 9);
  // câmera de segurança (varre o corredor; atirar nela desliga)
  { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.5), M.dark); body.position.z = 0.22; g.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), M.lampRed); lens.rotation.x = Math.PI / 2; lens.position.z = 0.48; g.add(lens);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(0.36) * 18, 18, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
    cone.rotation.x = -Math.PI / 2; cone.position.z = 9.3; g.add(cone);
    g.position.set(-4, 3.0, 51.8); root.add(g);
    L.cam = { group: g, lens, cone, pos: V(-4, 3.0, 51.8), alive: true, col: addCollider(-4.2, -3.8, 2.85, 3.15, 51.6, 52.3, { secCam: true }) }; }

  // ---------------- ELEVADOR + TÚNEL DO METRÔ ----------------
  L.elevator = D(M.hazard, -13.5, -10.5, -0.3, 0, 60.5, 63.5); L.interact.elevator = V(-12, 1.2, 62);
  B(M.metal, -14, -13.5, -6, 0, 60, 64); B(M.metal, -10.5, -10, -6, 0, 60, 64); B(M.metal, -14, -10, -6, 0, 63.5, 64);
  B(M.concrete, -16, -8, -10, -9, 56, 152); B(M.dark, -8, 0, -10.6, -9.6, 56, 152);
  B(M.concrete, -16.5, -16, -10, -2.7, 56, 152); B(M.concrete, 0, 0.5, -10.6, -2.7, 56, 152);
  B(M.concrete, -16.5, 0.5, -10.6, -2.7, 55.5, 56); B(M.concrete, -16.5, 0.5, -10.6, -2.7, 152, 152.5);
  B(M.dark, -16.5, 0.5, -3, -2.7, 64, 152);
  B(M.hazard, -8.2, -8, -9.02, -8.98, 56, 152, { noCol: true, tile: 1 });
  for (const x of [-5.6, -2.4]) B(M.rail, x - 0.05, x + 0.05, -9.6, -9.45, 56, 152, { noCol: true });
  for (let z = 58; z < 152; z += 1.2) B(M.wood, -6.4, -1.6, -9.62, -9.58, z, z + 0.3, { noCol: true });
  B(M.metal, -16, -10, -5.9, -5.6, 117, 123); B(M.metal, -10.1, -10, -5.6, -4.9, 117, 123, { col: { seeThrough: true } });   // passarela do atirador
  for (const z of [117.2, 122.6]) B(M.metal, -10.3, -10.1, -9, -5.9, z, z + 0.2);
  B(M.concrete, -14.5, -13, -9, -7.7, 96, 97.4); B(M.concrete, -11, -9.5, -9, -7.8, 108, 109.5); B(M.concrete, -14.6, -13.2, -9, -7.8, 132, 133.4); B(M.concrete, -11.5, -10, -9, -7.8, 139, 140.4);
  L.relays = [80, 104, 128].map((z, i) => { B(M.metal, -16, -15.6, -8.4, -6.9, z - 0.5, z + 0.5, { noCol: true }); const lamp = L.mesh(new THREE.BoxGeometry(0.06, 0.2, 0.5), M.lampRed, -15.56, -6.7, z); L.interact['relay_' + (i + 1)] = V(-15.2, -7.8, z); return lamp; });
  L.tunnelLights = [64, 78, 92, 106, 120, 134, 146].map((z, i) => { L.mesh(new THREE.BoxGeometry(0.6, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0xffc070 }), -15.7, -4.2, z); return light(-14.8, -4.5, z, i % 2 ? 0xffb060 : 0x9ad0ff, 18, 12); });
  B(M.concrete, -16, -8, -9, -8.85, 142, 152, { tile: 2 });                // plataforma final
  L.pts.gate = V(-12, -8.85, 148.6); L.pts.gateYaw = 0;
  { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const car = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.4, 13), L.M.train); car.position.set(0, 1.7, -k * 13.6); g.add(car); }
    const hl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff6c0 })); hl.position.set(0, 2.4, 6.55); g.add(hl);
    g.position.set(-4, -9.6, 20); g.visible = false; root.add(g); L.train = g; }

  // ---------------- coletáveis ----------------
  pickup('m2_bar_med', 'medkit', 35, -12.6, 0.35, 35.5); pickup('m2_bar_ammo', 'ammo9', 30, -12.6, 0.35, 27.5);
  pickup('m2_vip_armor', 'armor', 50, 9.6, 0.35, 15.6); pickup('m2_vip_pecas', 'pecas', 40, 12.0, 0.85, 18.4);
  pickup('m2_bath_ammo', 'ammo9', 30, -16, 0.35, 47); pickup('m2_duct_shells', 'shells', 4, -17.5, 0.35, 52.1);
  pickup('m2_arcade_pecas', 'pecas', 25, -12.0, 0.35, 23.9);
  pickup('m2_svc_ammo', 'ammo9', 30, 17.8, 0.35, 47.5); pickup('m2_studio_shells', 'shells', 6, 14.4, 0.35, 63.2); pickup('m2_office_med', 'medkit', 35, -8, 0.35, 63);
  pickup('m2_tun_med', 'medkit', 35, -14, -8.65, 100); pickup('m2_tun_ammo', 'ammo9', 30, -9.6, -8.65, 110.6); pickup('m2_tun_armor', 'armor', 25, -14, -8.65, 135);

  makeSky(L, 0x05040b, 0x1a1428, 0x4a1a4a); makeSkyline(L, 0, 0, 120, 30, 7); makeRain(L, 700);
  L.finish();

  // ---------------- grupos de encontro (máx. 4 regulares simultâneos) ----------------
  L.groups = {
    eg11: { units: [
      { type: 'E01', x: -0.8, y: 0, z: 18.5, role: 'hold', path: [[-0.5, 23.6], [-2.5, 25.5]], portal: true, first: true },
      { type: 'E01', x: 1.0, y: 0, z: 16.5, role: 'flank', path: [[0.5, 23.6], [4.5, 25], [9, 30]], portal: true },
      { type: 'E01', x: -18.5, y: 0, z: 43, role: 'flank', path: [[-16, 43], [-12.5, 43], [-8, 40]], portal: true }] },
    eg12: { units: [
      { type: 'E01', x: 0.8, y: 0, z: 18.5, role: 'flank', path: [[0, 23.6], [-6, 24.5], [-8.5, 33]], portal: true },
      { type: 'E01', x: -1.0, y: 0, z: 16.5, role: 'hold', path: [[0, 23.6], [2, 25]], portal: true },
      { type: 'DRONE', x: 0, y: 5.5, z: 32, role: 'drone' }] },
    eg13: { units: [
      { type: 'E01', x: -12.5, y: 0, z: 53.5, role: 'flank', path: [[-6, 53.3], [2, 53]], portal: true },
      { type: 'E01', x: -13.5, y: 0, z: 52.2, role: 'hold', path: [[-8, 52]], portal: true }] },
    eg14: { trigger: (p) => p.y < -5 && p.z > 90, units: [
      { type: 'E01', x: -12.5, y: -8.99, z: 113, role: 'hold', path: [[-12.5, 110.5]] },
      { type: 'E01', x: -9.5, y: -8.99, z: 117, role: 'flank', path: [[-9.2, 107]] },
      { type: 'E02', x: -13, y: -5.59, z: 120, role: 'sniper', alt: [[-14.5, 118], [-14.5, 122]] }] },
    eg15: { units: [
      { type: 'E01', x: -13, y: -8.84, z: 147, role: 'hold', path: [[-13, 143]], portal: true },
      { type: 'E01', x: -9.5, y: -8.84, z: 146, role: 'flank', path: [[-9.5, 138]], portal: true }] },
  };
  L.checkpoints = { cp00: { x: 0, y: 0.01, z: 2, yaw: 0 }, cp00i: { x: 12.4, y: 2.41, z: 45.5, yaw: -Math.PI / 2 }, cp01: { x: 0, y: 0.01, z: 30, yaw: 0 }, cp02: { x: -12, y: -8.99, z: 62, yaw: 0, force: true } };

  // ---------------- NPCs: equipe, público e performers (mesmos 2 modelos, figurinos por máscara) ----------------
  L.jill = X.npc({ name: 'Jill', asset: 'jill', scale: 1, x: -12.4, z: 31, yaw: Math.PI / 2 });
  L.dante = X.npc({ name: 'Dante', outfit: 'dante', x: 2.9, z: 12.3, yaw: Math.PI });
  L.cifra = X.npc({ name: 'Cifra', outfit: 'cifra', ledMask: 0x35e6ff, x: 11.6, y: 2.4, z: 46.6, yaw: -Math.PI / 2, endYaw: Math.PI, endAnim: 'Crouch' });
  L.performers = [['Sol', 'sol', 0, 36.4, 0], ['Rubi', 'lux', -5, 46.6, 1], ['Maya', 'ambar', 5, 46.6, 2], ['Jade', 'violeta', 0, 48.2, 1]].map(([name, outfit, x, z, off]) => { const n = X.npc({ name, asset: 'sol', outfit, x, y: 1.0, z, yaw: Math.PI, performer: true }); n.off = off; return n; });
  L.patrons = [['p1', -9.4, 28.6, -Math.PI / 2], ['p2', -9.4, 34.4, -Math.PI / 2], ['p3', -4.2, 33.2, 0.15], ['p4', 3, 30.4, -0.1], ['p5', 6.8, 35.4, -0.45], ['p1', -6.2, 38.6, 0.4], ['p3', 3.4, 37.2, -0.2], ['p2', 8.4, 30.2, -0.5]]
    .map(([outfit, x, z, yaw]) => X.npc({ outfit, x, z, yaw }));
  return L;
}

// ---------------- eventos ----------------
function blackout(X) {
  const { S, L } = X, f = S.flags;
  if (f.blackout) return; f.blackout = true;
  X.sfx.blackout(); X.audio.setMusic(false); X.audio.setAlarm(true); X.fx.shake(0.25);
  applyLighting(X);
  L.patrons.forEach((n, i) => n.panic([[n.home.x * 0.5, 0, 26], [0, 0, 21.5], [0, 0, 16], [0, 0, 9]], 0.2 + i * 0.15));
  L.performers.forEach((n, i) => n.panic([[n.home.x, 1, 49.5], [0, 1, 50.2]], 0.3 + i * 0.2));
  L.cifra.panic([[11.6, 2.4, 41], [13.5, 2.4, 40.5], [13.5, 0, 34], [14.2, 0, 31]], 0.4, true);      // some pela porta de serviço; reaparece no estúdio
  L.jill.facePlayer = 0; L.jill.actor.play('CrouchIdle', 0.18); L.jill.o.anim = null;
  X.say('MARA', 'Apagaram o palco! Dante, tira o público pela frente. Ninguém volta pra dentro!');
  X.say('ÍRIS-9', 'Gael, o pulso está rasgando o bracelete. O console analógico do Cifra aguenta — estabilize ali, agora.');
}
function applyLighting(X) {
  const { S, L } = X, dark = !!S.flags.blackout, cleared = !!S.flags.invasion_cleared;
  for (const l of L.hallLights) l.intensity = dark ? 0 : l.base;
  for (const l of L.emLights) l.intensity = dark ? (cleared ? 10 : 22) : 0;
  for (const b of L.emBeacons) b.material = dark ? L.M.lampRed : L.M.lampOff;
  for (const s of L.spots) { s.cone.visible = s.pool.visible = !dark; s.head.visible = true; s.l.intensity = dark ? 0 : 22; }
  L.jukeLamp.material = L.M.neonAmber;
}
function startInvasion(X) {
  const { L } = X;
  X.after(1.6, () => { X.sfx.bang(); X.fx.flash(V(0, 1.5, 21.6), 1.6, 0.4, 0xff2020); X.fx.flash(V(-14.6, 1.5, 43), 1.4, 0.4, 0xff2020); X.say('ÍRIS-9', 'Duas entradas: porta da frente e banheiros. Use o balcão do bar como cobertura.'); });
  X.after(3.0, () => {
    X.startGroup('eg11');
    const T = L.transmitter; T.alive = true; T.hp = 160; T.group.visible = true; T.col.enabled = true;
    X.after(2.0, () => X.say('ÍRIS-9', 'Eles plantaram um transmissor portátil no meio do salão. Se continuar ligado, regrava todo mundo que ficou lá fora. Destrua!'));
  });
}
function finishInvasionIfDone(X) {
  const { S, L } = X, f = S.flags;
  if (f.invasion_cleared || !f.bracelet_stabilized) return;
  if (S.groupsDone.includes('eg11') && S.groupsDone.includes('eg12') && f.transmitter_destroyed) {
    f.invasion_cleared = true; X.audio.setAlarm(false); applyLighting(X); L.cifra.place(12.5, 0, 59.5, Math.PI); L.cifra.actor.play('Crouch', 0);
    X.setDoor('door_service', true); X.saveCheckpoint('cp01');
    X.say('MARA', 'Salão limpo e o público lá fora inteiro. Obrigada, Gael.');
    X.say('MARA', 'Abri o corredor de serviço. O Cifra se trancou no estúdio, nos bastidores, com o backup da gravação.');
    X.say('JILL', 'Tem uma viga caída no corredor. Abaixa a cabeça, campeão — tecla C.');
  }
}
function destroyTransmitter(X) {
  const { S, L } = X, T = L.transmitter;
  if (!T.alive) return;
  T.alive = false; T.group.visible = false; T.col.enabled = false; S.flags.transmitter_destroyed = true;
  X.fx.sparks(T.group.position.clone().setY(1), 0xff3ad0, 50, 7, 0.9); X.fx.flash(T.group.position.clone().setY(1), 2.2, 0.35, 0xff3ad0); X.sfx.explosion(); X.fx.shake(0.3);
  X.say('SOL', 'Rádio da Sol: o chiado sumiu daqui de fora. A rua inteira acabou de respirar.');
  finishInvasionIfDone(X);
}
function startTrain(X) {
  const { S, L } = X;
  if (S.flags.train_passed) return;
  X.sfx.horn(); X.say('ÍRIS-9', 'Relés ligados. Trem de manutenção vindo pela linha — fique na passarela!');
  train = { t: -1.8 };
  L.train.visible = true; L.train.position.set(-4, -9.6, 20);
}

export default {
  id: 'A1-M2', name: 'Noite de Neon', sectorNames: SECTOR_NAMES, sectorAt,
  sealsRequired: 2, sealsAvailable: 3, requiredFlags: ['metro_relays_on'],
  enemiesTotal: 13, secretsTotal: 3, next: null, ambientTrack: 2,
  build: (scene, X) => build(scene, X),
  newState: () => ({ signal: Math.floor(Math.random() * 4), jukebox: 2 }),
  outdoor: (p) => p.z < 14.2 && p.y > -1,
  startLoadout: () => ({ weapons: { martelo9: { have: true, mag: 15 }, trovao_duplo: { have: true, mag: 2 } }, ammo: { ammo9: 45, shells: 6 }, current: 'martelo9', holster: true }),
  ecoLocked: (X) => !X.S.flags.bracelet_stabilized,
  apply(X) {
    const { S, L } = X, f = S.flags;
    train = null; camYaw = 0; camDir = 1;
    X.setDoor('door_vip', !!f.vip_open, true); X.setDoor('door_service', !!f.invasion_cleared, true); X.setDoor('door_office', !!f.vespera_backup_secured, true);
    X.setDoor('door_dressing', false, true); X.setDoor('door_stage', false, true);
    L.keypadLamp.material = f.vip_open ? L.M.lampOn : L.M.lampRed; L.safeDoor.rotation.y = f.vip_safe ? -1.4 : 0;
    L.consoleLamp.material = f.bracelet_stabilized ? L.M.lampOn : L.M.lampOff;
    L.spots.forEach((s, i) => { s.cut = 0; s.on = !(f.panel_solved && i === S.signal); });
    L.panelBtns.forEach((b, i) => (b.visible = !(f.panel_solved && i === S.signal)));
    const gr = S.destroyed.includes('grate'); L.grate.mesh.visible = !gr; L.grate.col.enabled = !gr;
    L.mirror.mesh.material = S.destroyed.includes('mirror') ? L.M.dark : L.M.mirror;
    const T = L.transmitter, tAlive = f.bracelet_stabilized && !f.transmitter_destroyed && f.transmitter_placed; T.alive = !!tAlive; T.hp = 160; T.group.visible = !!tAlive; T.col.enabled = !!tAlive;
    const camAlive = !S.destroyed.includes('seccam'); L.cam.alive = camAlive; L.cam.group.visible = camAlive; L.cam.col.enabled = camAlive;
    L.backupLamp.material = f.vespera_backup_secured ? L.M.lampOn : L.M.neonCyan;
    L.relays.forEach((lamp, i) => (lamp.material = f['relay_' + (i + 1)] ? L.M.lampOn : L.M.lampRed));
    elevY = f.metro_reached ? -9 : 0; setElevator(L, elevY);
    L.train.visible = false;
    // NPCs conforme o estado salvo (evacuados não reaparecem — GDD §28.5)
    if (f.blackout) {
      for (const n of [...L.patrons, ...L.performers]) n.hideSafe();
      if (f.invasion_cleared) { L.cifra.place(12.5, 0, 59.5, Math.PI); L.cifra.actor.play('Crouch', 0); } else L.cifra.hideSafe(); L.cifra.o.anim = null;
      L.jill.facePlayer = 0; L.jill.actor.play('CrouchIdle', 0); L.jill.o.anim = null;
    } else { L.cifra.o.anim = 'Idle'; L.jill.o.anim = 'Idle'; }
    applyLighting(X);
    X.audio.setTrack(S.jukebox); X.audio.setMusic(!f.blackout); X.audio.setAlarm(!!f.blackout && !f.invasion_cleared);
  },
  afterReset(X) { if (X.S.flags.bracelet_stabilized) X.setHolster(false); },
  intro(X) {
    X.say('ÍRIS-9', 'Clube Véspera. Mara confirmou: o pessoal daqui guardou a única gravação limpa do sinal.');
    X.say('GAEL', 'E eu de jaqueta de oficina na porta de uma casa noturna. Clássico.');
    X.say('DANTE', 'Arma no coldre lá dentro. Regra da casa, não minha. A Jill está te esperando no bar.');
  },
  onResume(X) {
    const f = X.S.flags;
    if (f.bracelet_stabilized && !f.invasion_cleared) { X.say('ÍRIS-9', 'Eles estão voltando. Posição!'); startInvasion(X); }
  },
  objective(X) {
    const { S } = X, f = S.flags;
    if (!f.talked_basso) return 'Entre no Véspera e fale com Jill no bar';
    if (!f.panel_solved) return f.sol_talked ? 'Cabine de luz: corte o canal que pisca fora do ritmo' : 'Fale com Sol na ponta da passarela';
    if (!f.blackout) return 'Assista ao show enquanto Cifra rastreia o sinal';
    if (!f.bracelet_stabilized) return 'Estabilize o bracelete no console analógico da cabine';
    if (!f.invasion_cleared) return `Defenda o Véspera${f.transmitter_destroyed ? '' : ' e destrua o transmissor portátil'}`;
    if (!f.vespera_backup_secured) return 'Bastidores: recupere o backup no estúdio do Cifra';
    if (!f.metro_reached) return 'Escritório da Mara: desça pelo elevador de serviço';
    const n = [1, 2, 3].filter((i) => f['relay_' + i]).length;
    if (n < 3) return `Religue os relés do túnel (${n}/3)`;
    return 'Atravesse a Fenda de Saída na plataforma';
  },
  waypoint(X) {
    const { S, L, P } = X, f = S.flags, I = L.interact, p = P.body.pos, sec = sectorAt(p);
    if (!f.talked_basso) return sec === 'street' ? V(0, 1.5, 14.5) : sec === 'reception' ? V(0, 1.5, 22.3) : I.basso;
    if (!f.panel_solved) { if (!f.sol_talked) return V(0, 1.6, 35.4); if (p.y < 2) return V(13.5, 1, 34.5); return L.pts.panel; }
    if (!f.blackout) return null;
    if (!f.bracelet_stabilized) return p.y < 2 ? V(13.5, 1, 34.5) : I.console;
    if (!f.invasion_cleared) return f.transmitter_destroyed || !L.transmitter.alive ? null : L.transmitter.group.position.clone().setY(1.2);
    if (!f.vespera_backup_secured) { if (sec === 'hall' || sec === 'reception') return V(14.7, 1.3, 31); if (sec === 'service') return V(16.8, 1, 50.6); return p.x > 8 && p.z > 55.4 ? I.backup : V(10, 1.3, 55.3); }
    if (!f.metro_reached) return sec === 'backstage' && p.z > 55.5 && p.x < -6 ? I.elevator : V(-10, 1.3, 55.3);
    for (let i = 1; i <= 3; i++) if (!f['relay_' + i]) return I['relay_' + i];
    return L.pts.gate.clone().setY(L.pts.gate.y + 1.2);
  },
  interactables(X, add) {
    const { S, L, P } = X, f = S.flags, I = L.interact;
    // --- conversas ---
    if (!f.blackout) add(I.basso, f.talked_basso ? 'Conversar com Jill' : 'Falar com Jill', () => {
      L.jill.talk(5);
      if (!f.talked_basso) {
        f.talked_basso = true;
        X.say('JILL', 'Gael Rocha, o homem que o noticiário explodiu. Senta. Água, porque hoje você precisa enxergar direito.');
        X.say('JILL', 'A Sol quer você na ponta da passarela. O Cifra está na cabine de luz, lá no alto à direita.');
        X.say('JILL', 'E a jukebox anda tocando uma faixa sete que ninguém botou lá. Se quiser ouvir o que o clube esconde, começa por ela.');
        X.say('MARA', 'Gael, aqui é a Mara, pelo rádio. Ninguém saca arma no meu salão enquanto o show estiver de pé. Combinado?');
      } else X.say('JILL', ['O kit de primeiros socorros fica atrás do balcão. Só pega se sangrar.', 'O camarote VIP tem cofre. O código mora numa música, não na minha cabeça.', 'Mara confia em pouca gente. Você entrou na lista hoje.'][Math.floor(Math.random() * 3)]);
    });
    if (!f.blackout) add(V(0, 1.6, 35.4), 'Falar com Sol', () => {
      L.performers[0].talk(6);
      if (!f.sol_talked) {
        f.sol_talked = true;
        X.say('SOL', 'Você veio. Olha pras luzes, não pra mim — dessa vez é sério.');
        X.say('SOL', `Quatro canhões: ciano, âmbar, magenta e verde. Três seguem a batida. Um pisca fora do compasso: três vezes, pausa, uma.`);
        X.say('SOL', 'Esse canal é o sinal deles. Corta ele no painel da cabine e a gente descobre quem está editando a noite.');
      } else X.say('SOL', f.panel_solved ? 'Achou. Agora segura firme, porque alguém lá fora acabou de perceber.' : 'O que pisca fora do ritmo. Confia no teu ouvido, Gael.');
    });
    if (!f.blackout) for (const [i, x, txt] of [[1, -5, 'Se o noticiário disser que você estava no palco hoje, eu desminto. Por uma bebida.'], [2, 5, 'Cuidado com o Cifra, ele chama desligar luz de "arte".'], [3, 3.2, 'A Sol ouviu o sinal antes da gente. A gente só confia porque ela nunca errou um compasso.']]) {
      const n = L.performers[i]; add(V(x, 1.6, 42.6), `Falar com ${n.name}`, () => { n.talk(4); X.say(n.name.toUpperCase(), txt); });
    }
    if (sectorAt(P.body.pos) === 'street' && L.dante.visible) add(V(2.9, 1.4, 11.6), 'Falar com Dante', () => { L.dante.talk(4); X.say('DANTE', f.blackout ? 'Público seguro aqui fora. Vai lá e termina isso.' : ['Regra da casa: olhos no palco, mãos longe do coldre.', 'Se algo der errado, eu tiro todo mundo pela frente. É o meu trabalho.'][Math.floor(Math.random() * 2)]); });
    if (!f.blackout && P.body.pos.y > 2) add(V(11.4, 3.6, 45.8), 'Falar com Cifra', () => { L.cifra.talk(4); X.say('CIFRA', f.panel_solved ? 'Sinal isolado. Agora é só torcer pra ninguém do outro lado ter notado.' : 'Painel liberado. Corta o canal errado e a Sol me mata — mas eu religo em três segundos.'); });
    // --- painel de luz ---
    if (!f.panel_solved) CHANNELS.forEach(([name], i) => add(V(13.7, 3.6, 43.6 + i * 0.6), `Cortar canal ${name}`, () => {
      X.sfx.click(); const s = L.spots[i];
      if (i === S.signal) {
        f.panel_solved = true; f.sol_detected_signal = true; s.on = false; L.panelBtns[i].visible = false; X.sfx.power();
        X.after(0.6, () => X.grantSeal('seal_a1m2_stage', L.pts.seal_stage));
        X.say('CIFRA', 'É esse! Sem o canal, o compasso fecha. E olha a origem... está vindo de uma van aqui na frente.');
        X.after(5.5, () => blackout(X));
      } else { s.cut = 3; X.say('CIFRA', `${name} não — o palco ficou sem cor. Religo em três segundos.`); }
    }));
    if (f.blackout && !f.bracelet_stabilized) add(I.console, 'Estabilizar o bracelete no console analógico', () => {
      f.bracelet_stabilized = true; f.eco_unlocked = true; L.consoleLamp.material = L.M.lampOn;
      X.unlockEco(); X.setHolster(false); X.sfx.eco(); X.fx.flash(P.body.pos.clone().setY(P.body.pos.y + 1), 2.6, 0.5, 0x35e6ff);
      X.say('ÍRIS-9', 'Estável. O Eco Cronal agora é seu: duas cargas, recarga sozinha a cada 25 s. Q quando precisar.');
      X.say('GAEL', 'E a arma sai do coldre. Desculpa, Mara.');
      X.saveCheckpoint('cp00i'); startInvasion(X);
    });
    // --- jukebox (analógica: funciona mesmo no apagão) / fliperama / VIP ---
    add(I.jukebox, `Jukebox • trocar faixa (tocando ${S.jukebox})`, () => {
      S.jukebox = (S.jukebox % 8) + 1; X.audio.setTrack(S.jukebox); X.audio.setMusic(true); X.sfx.click(); X.toast(`JUKEBOX • FAIXA ${S.jukebox}`, 1.4);
      if (S.jukebox === 7 && !f.vip_code_known) { f.vip_code_known = true; X.after(2.4, () => { X.say('ÍRIS-9', 'Embaixo da faixa sete: três bipes, pausa, um. Se for código, é 3-0-1.'); X.say('GAEL', 'O teclado do camarote VIP tem três dígitos. Coincidência é coisa de gente sem bracelete.'); }); }
    });
    add(I.arcade, 'Jogar no fliperama', () => { if (!S.secrets.includes('arcade')) { S.secrets.push('arcade'); X.toast('SEGREDO ENCONTRADO • registro corrompido'); } X.openDoc(DOCS.arcade); });
    if (!f.vip_open) add(I.keypad, f.vip_code_known ? 'Digitar 3-0-1 no teclado do VIP' : 'Teclado do camarote VIP (3 dígitos)', () => {
      if (!f.vip_code_known) { X.sfx.empty(); X.toast('CÓDIGO DE 3 DÍGITOS • alguém no clube deve saber'); return; }
      f.vip_open = true; X.setDoor('door_vip', true); L.keypadLamp.material = L.M.lampOn; X.sfx.power();
    });
    if (f.vip_open && !f.vip_safe) add(I.safe, 'Abrir o cofre do camarote', () => {
      f.vip_safe = true; L.safeDoor.rotation.y = -1.4; X.sfx.door();
      if (!S.secrets.includes('vip')) S.secrets.push('vip');
      X.after(0.5, () => X.grantSeal('seal_a1m2_vip', L.pts.seal_vip)); X.openDoc(DOCS.vip);
    });
    // --- banheiro ---
    if (!S.destroyed.includes('grate')) add(V(-19.4, 0.9, 47.7), 'Arrancar a grade solta do duto', () => { S.destroyed.push('grate'); L.grate.mesh.visible = false; L.grate.col.enabled = false; X.sfx.door(); X.toast('DUTO ABERTO • passe agachado (C)'); });
    add(I.poster, 'Ler o cartaz sobre o espelho', () => { if (!S.secrets.includes('bath')) { S.secrets.push('bath'); X.toast('SEGREDO ENCONTRADO • propaganda temporal'); } X.openDoc(DOCS.bath); });
    // --- bastidores ---
    if (f.invasion_cleared && !f.vespera_backup_secured) add(I.backup, 'Recuperar o backup do DJ Cifra', () => {
      f.vespera_backup_secured = true; L.backupLamp.material = L.M.lampOn; X.sfx.power(); L.cifra.talk(5);
      X.after(0.6, () => X.grantSeal('seal_a1m2_backstage', L.pts.seal_backstage));
      X.say('CIFRA', 'Backup copiado. Gravação original, sem a edição deles. Agora some daqui antes que mandem mais gente.');
      X.say('MARA', 'Abri meu escritório no fim do corredor. O elevador de serviço desce para o túnel do metrô.');
      X.setDoor('door_office', true);
    });
    if (f.vespera_backup_secured) add(I.mara_desk, 'Ler bilhete na mesa da Mara', () => X.openDoc({ k: 'BILHETE', t: 'Mesa da Mara', b: 'Gael,\n\nSe estiver lendo isto, o Cifra entregou o backup e o clube ainda está de pé.\nO túnel de serviço passa embaixo de três quarteirões. Os relés estão desligados desde a última "manutenção" da prefeitura.\nLiga os três, a linha volta, e ninguém segue um trem.\n\nE não me agradeça. Traz a verdade de volta e a gente empata.\n\n— M.' }));
    if (f.vespera_backup_secured && !f.metro_reached && !L.elevMoving) add(L.interact.elevator, 'Descer pelo elevador de serviço', () => {
      const p = P.body.pos; if (!(p.x > -13.4 && p.x < -10.6 && p.z > 60.6 && p.z < 63.4)) { X.toast('Suba na plataforma do elevador'); return; }
      L.elevMoving = true; X.sfx.elevator(); X.say('ÍRIS-9', 'Descendo. Sinal de rádio cai em dez metros — a partir daqui, somos só nós dois.');
    });
    for (let i = 1; i <= 3; i++) if (f.metro_reached && !f['relay_' + i]) add(I['relay_' + i], `Religar relé ${i}`, () => {
      f['relay_' + i] = true; L.relays[i - 1].material = L.M.lampOn; X.sfx.power();
      const n = [1, 2, 3].filter((k) => f['relay_' + k]).length; X.toast(`RELÉ ${n}/3`);
      if (n === 3) { f.metro_relays_on = true; X.after(1.2, () => startTrain(X)); }
    });
  },
  gateHint(X) { return X.S.flags.metro_relays_on ? `FENDA INSTÁVEL • SELOS ${X.S.seals.length}/2` : 'FENDA SEM ENERGIA • religue os três relés do túnel'; },
  exitLine: 'Gravação original segura. O sinal aponta para a Usina Norte.',
  tick(X, dt) {
    const { S, L, P } = X, f = S.flags, p = P.body.pos, sec = sectorAt(p);
    if (sec === 'reception' && X.once('enter_club')) { X.say('ÍRIS-9', 'Lá dentro é zona social: arma no coldre até alguém começar a confusão.'); }
    if (sec === 'hall' && X.once('enter_hall')) X.say('GAEL', 'Neon, rock e quatrocentas pessoas fingindo que não me viram no noticiário. Me sinto em casa.');
    if (sec === 'bath' && X.once('bath_tip')) X.say('GAEL', 'A grade do duto aqui atrás está solta. Uma coronhada resolve.');
    if (sec === 'service' && X.once('svc_tip')) X.say('ÍRIS-9', 'Viga caída à frente: C para agachar e passar por baixo. Na estante tombada, salte.');
    if (sec === 'backstage' && L.cam.alive && X.once('cam_tip')) X.say('ÍRIS-9', 'Câmera de segurança no corredor, varrendo. Espere ela virar, use as caixas ou atire nela.');
    if (sec === 'metro' && X.once('metro_tip')) X.say('ÍRIS-9', 'Três relés na parede esquerda do túnel. Passos à frente — não estamos sozinhos.');
    // invasão: segunda onda quando a primeira está quase no fim e o transmissor está ativo
    if (f.bracelet_stabilized && !f.invasion_cleared) {
      if (!f.transmitter_placed && L.transmitter.alive) f.transmitter_placed = true;
      if (!S.groupsDone.includes('eg12') && !X.activeGroups.has('eg12') && X.activeGroups.has('eg11') === false && S.groupsDone.includes('eg11')) X.startGroup('eg12');
      else if (!X.activeGroups.has('eg12') && !S.groupsDone.includes('eg12') && X.activeGroups.has('eg11') && X.enemies.aliveInGroup('eg11') <= 1 && X.activeGroups.get('eg11').spawned) { X.say('ÍRIS-9', 'Reforços pela porta da frente e um drone pela claraboia!'); X.startGroup('eg12'); }
      finishInvasionIfDone(X);
      if (L.transmitter.alive) { L.transmitter.lamp.visible = Math.sin(performance.now() / 120) > 0; }
    }
    // câmera de segurança
    if (L.cam.alive && !f.cam_alarm && sec === 'backstage' && !P.dead) {
      const c = L.cam.pos, dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      const dir = Math.atan2(dx, dz), da = Math.atan2(Math.sin(dir - (Math.PI / 2 + camYaw)), Math.cos(dir - (Math.PI / 2 + camYaw)));
      if (d < 18 && Math.abs(da) < 0.36 && lineOfSight(c.x, c.y - 0.2, c.z + 0.3, p.x, p.y + P.body.h - 0.15, p.z)) {
        f.cam_alarm = true; X.audio.setAlarm(true); X.sfx.bang(); X.say('ÍRIS-9', 'A câmera te viu! Dois vindo do escritório.'); X.after(1.5, () => X.startGroup('eg13')); X.after(9, () => { if (f.invasion_cleared) X.audio.setAlarm(false); });
      }
    }
    // elevador
    if (L.elevMoving) {
      elevY = Math.max(-9, elevY - 2.2 * dt); setElevator(L, elevY); p.y = elevY + 0.001; P.body.vel.set(0, 0, 0); P.inputLock = 0.2;
      if (elevY <= -9) { L.elevMoving = false; f.metro_reached = true; P.body.grounded = true; X.saveCheckpoint('cp02'); }
    }
    // trem: passa uma vez; quem estiver nos trilhos leva o empurrão (telegrafado por buzina + farol)
    if (train) {
      train.t += dt; const z = 20 + Math.max(0, train.t) * 42; L.train.position.z = z;
      if (train.t > 0 && X.once('train_sound')) X.sfx.train();
      if (train.t > 0 && p.y < -5 && p.x > -8.2 && Math.abs(p.z - (z - 13)) < 21) { X.damagePlayer(45, V(-4, -8, z)); p.x = -9.6; X.fx.shake(0.6); }
      if (z > 190) { train = null; L.train.visible = false; f.train_passed = true; X.startGroup('eg15'); X.portal.group.position.set(-11, -6.5, 146); X.portal.target = 1; X.after(3, () => (X.portal.target = 0)); X.say('ÍRIS-9', 'Fenda abrindo na plataforma — e trouxeram companhia.'); }
    }
    // queda no fosso dos trilhos não mata: só volta à passarela
    if (sec === 'metro' && p.y < -12) X.fallRecover(V(-12, -8.99, Math.min(Math.max(p.z, 64), 140)));
  },
  onGroupDone(X, id) {
    if (id === 'eg11' || id === 'eg12') finishInvasionIfDone(X);
    if (id === 'eg13') X.say('ÍRIS-9', 'Corredor limpo. O estúdio do Cifra é a porta da direita.');
    if (id === 'eg14') X.say('GAEL', 'Túnel livre. Agora os relés.');
  },
  onShootCollider(X, c, dmg, point) {
    const { S, L } = X;
    if (c.transmitter && dmg > 0 && L.transmitter.alive) { L.transmitter.hp -= dmg; X.fx.sparks(point, 0xff3ad0, 6, 3, 0.3); if (L.transmitter.hp <= 0) destroyTransmitter(X); }
    if (c.secCam && dmg > 0 && L.cam.alive) { L.cam.alive = false; L.cam.group.visible = false; L.cam.col.enabled = false; S.destroyed.push('seccam'); X.fx.sparks(point, 0xffffff, 20, 4, 0.5); X.sfx.glass(); X.toast('CÂMERA DESLIGADA'); }
    if (c.grate && dmg > 0 && !S.destroyed.includes('grate')) { S.destroyed.push('grate'); L.grate.mesh.visible = false; L.grate.col.enabled = false; X.sfx.door(); X.toast('GRADE SOLTA • duto para os bastidores (agachado)'); }
    if (c.mirror && dmg > 0 && !S.destroyed.includes('mirror')) { S.destroyed.push('mirror'); L.mirror.mesh.material = L.M.dark; X.sfx.glass(); X.fx.sparks(point, 0xdde6ff, 30, 4, 0.6); X.say('GAEL', 'Sete anos de azar. Considerando a semana, é um upgrade.'); }
  },
  barrelRadius: () => 5,
  deathTips: ['O balcão do bar segura tiro. Agache (C) atrás dele.', 'O Eco Cronal (Q) tem duas cargas: use para sair de um flanco ruim.', 'Os cilindros de fumaça perto do palco explodem.', 'No túnel, o atirador fica na passarela suspensa à esquerda: o laser avisa.', 'Coronhada (F) derruba um invasor de perto.'],
  frame(X, dt, t, sim) {
    const { S, L, P } = X, f = S.flags;
    L.neon.material.map = L.neonTex[Math.sin(t * 0.5) > 0.6 ? 1 : 0];
    // show: 3 canais na batida (~120 bpm), o sinal pisca "3, pausa, 1"
    const beat = (t * 2) % 1, bar = Math.floor(t * 4) % 8;
    L.spots.forEach((s, i) => {
      if (s.cut > 0) s.cut -= dt;
      let v = 0.55 + 0.45 * Math.max(0, 1 - beat * 2.2);
      if (i === S.signal && !f.panel_solved) v = [1, 0.1, 1, 0.1, 1, 0.1, 0.1, 1][bar] > 0.5 ? 1 : 0.06;
      if (!s.on || s.cut > 0 || f.blackout) v = 0;
      s.cone.material.opacity = 0.13 * v; s.pool.material.opacity = 0.3 * v; s.head.material.color.setHex(v > 0.05 ? s.col : 0x222222); if (!f.blackout) s.l.intensity = 22 * v;
    });
    if (!f.blackout) for (const n of L.performers) if (n.state === 'idle' && n.facePlayer <= 0) n.actor.play(DANCES[(Math.floor(t / 14) + n.off) % DANCES.length], 0.6);
    if (f.blackout) { const k = Math.sin(t * 6) > 0; for (const b of L.emBeacons) b.material = k ? L.M.lampRed : L.M.lampOff; }
    // câmera de segurança varrendo
    if (L.cam.alive) { if (sim) { camYaw += camDir * dt * 0.35; if (Math.abs(camYaw) > 0.6) camDir *= -1; } L.cam.group.rotation.y = Math.PI / 2 + camYaw; L.cam.cone.material.opacity = f.cam_alarm ? 0.14 : 0.07; }
    if (L.transmitter.alive) L.transmitter.group.rotation.y += dt * 0.8;
    L.dante.setVisible(true);
  },
  menuCam(t, cam) { cam.position.set(6 + Math.sin(t * 0.1) * 4, 3.4 + Math.sin(t * 0.2) * 0.3, 27 + Math.cos(t * 0.1) * 2); cam.lookAt(0, 2.2, 44); return V(0, 3, 38); },
  resultsText: (X) => `${X.S.pecas} Peças Cronais recolhidas. Eco Cronal permanente desbloqueado. A gravação original está com a resistência; A1-M3 — Usina Norte é o próximo marco de produção.`,
};
function setElevator(L, y) { const e = L.elevator; e.mesh.position.y = y; e.col.min[1] = y - 0.3; e.col.max[1] = y; }
