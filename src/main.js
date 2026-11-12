// QUEBRA NO TEMPO — vertical slice A1-M1 "Rua Quebrada".
// Laço fixo de 60 Hz, máquina única de interface, missão guiada por flags (GDD §9.3 / §46).
import * as THREE from 'three';
import { G, CFG, DIFF } from './state.js';
import { input, initInput, requestLock, releaseLock, hit, pollPad, endFrame } from './input.js';
import { buildLevel, updateLights, sectorAt, SECTOR_NAMES } from './level.js';
import { loadCharacters, Actor } from './characters.js';
import { P, createPlayer, resetPlayer, updatePlayer, updateCamera, giveWeapon, WEAPONS, AMMO_CAP } from './player.js';
import { enemies, createEnemyPools, initEnemyList } from './enemies.js';
import { initFx, updateFx, sparks, flash, shake, makeSeal, makeGate, makePortal } from './fx.js';
import { audio, initAudio, setVolumes, setPaused, setIntensity, sfx } from './audio.js';
import { loadAll, commit, SAVE_SCHEMA, CONTENT_VERSION, setSimulateSaveFailure } from './save.js';

const $ = (id) => document.getElementById(id);
const EXIT = CFG.slice.exit, MX = CFG.missionExit;
let store = loadAll();
if (store.settings) Object.assign(G.settings, store.settings);
const persistSettings = () => { store.settings = { ...G.settings }; commit(store); };

// ------------------------------------------------------------------ interface (máquina única)
const ui = { mode: 'boot', stack: [] };
const LAYERS = ['boot', 'menu', 'newgame', 'options', 'controls', 'pause', 'doc', 'dead', 'results'];
function renderUi() {
  const top = ui.stack[ui.stack.length - 1];
  for (const id of LAYERS) $(id).classList.toggle('on', id === top || (!top && id === ui.mode));
  $('hud').classList.toggle('on', ui.mode === 'play');
  setPaused(ui.mode === 'play' && ui.stack.length > 0);
}
const simActive = () => ui.mode === 'play' && ui.stack.length === 0;
function push(id) { if (ui.stack.includes(id)) return; ui.stack.push(id); if (ui.mode === 'play') releaseLock(); renderUi(); const f = $(id).querySelector('.btn'); if (f) f.focus(); }
function pop() {
  const id = ui.stack.pop(); renderUi();
  if (id === 'options') persistSettings();
  if (simActive()) { P.inputLock = 0.15; input.lmb = false; input.pressed.clear(); }   // trava de 150 ms contra tiro acidental
  return id;
}
function back() {   // Esc / B: fecha somente a camada superior
  const top = ui.stack[ui.stack.length - 1];
  if (!top) { if (ui.mode === 'play' && !exitSeq) { fillPause(); push('pause'); } return; }
  if (top === 'dead' || top === 'results') return;
  pop();
}
function toast(t, dur = 2.2) { const e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => (e.style.opacity = 0), dur * 1000); }
const talk = { q: [], t: 0 };
function say(who, text, dur) { talk.q.push({ who, text, dur: dur || Math.max(2.6, text.length * 0.058) }); }
function updateTalk(dt) {
  const e = $('sub');
  if (talk.t > 0) { talk.t -= dt; if (talk.t <= 0) e.style.display = 'none'; return; }
  const n = talk.q.shift(); if (!n) return;
  e.innerHTML = `<b>${n.who}</b>${n.text}`; e.style.display = 'block'; talk.t = n.dur; sfx.talk();
}

// ------------------------------------------------------------------ cena
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0e18); scene.fog = new THREE.FogExp2(0x0a0e18, 0.011);
const camera = new THREE.PerspectiveCamera(G.settings.fov, 1, 0.08, 260);
G.scene = scene; G.camera = camera; G.renderer = renderer;
scene.add(new THREE.HemisphereLight(0x9db4e6, 0x242630, 1.5));
const moon = new THREE.DirectionalLight(0xb4c8ff, 1.2); moon.position.set(30, 60, -25); scene.add(moon, moon.target);
moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 140 }); moon.shadow.bias = -0.0015;
function applyQuality() {
  const q = CFG.graphics.quality[G.settings.quality] || CFG.graphics.quality.medium;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5) * q.renderScale);
  renderer.setSize(innerWidth, innerHeight, false);
  const sh = G.settings.quality === 'high';
  if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; moon.castShadow = sh; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', applyQuality);

let L, dancers = [], gate, portal, sealFx, pickupMeshes = {}, drops = [], doorAnim = {};
const PICK_COL = { ammo9: 0xffb030, shells: 0xff5a30, medkit: 0x4dff88, armor: 0x35e6ff, pecas: 0xd0a0ff, weapon_trovao: 0xffffff };
function makePickupMesh(type) {
  const g = new THREE.Group(), c = PICK_COL[type];
  if (type === 'weapon_trovao') { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a9099 })), new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34).translate(0, -0.03, -0.4), new THREE.MeshLambertMaterial({ color: 0x6b4526 }))); g.rotation.y = 1.2; }
  else g.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.24), new THREE.MeshLambertMaterial({ color: 0x20242b })), new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), new THREE.MeshBasicMaterial({ color: c })));
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 20), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); halo.rotation.x = -Math.PI / 2; halo.position.y = -0.2; g.add(halo);
  scene.add(g); return g;
}

// ------------------------------------------------------------------ estado da missão
const newS = () => ({ missionId: 'A1-M1', flags: {}, seals: [], pickups: [], groupsDone: [], destroyed: [], oneShots: [], archives: [], secrets: [], clock: 2, checkpointId: 'cp00', pecas: 0, exitGateInteracted: false,
  stats: { time: 0, shots: 0, hits: 0, kills: 0, dmgTaken: 0, deaths: 0 } });
let activeGroups = new Set(), exitSeq = null, deathT = 0, lastSafe = null, puzzleT = 0, hintLevel = 0, timers = [];
const after = (t, fn) => timers.push({ t, fn });
const once = (id) => { if (G.S.oneShots.includes(id)) return false; G.S.oneShots.push(id); return true; };
const F = () => G.S.flags;

function setDoor(name, open, instant) {
  const d = L.doors[name]; d.col.enabled = !open; doorAnim[name] = open ? 1 : 0;
  if (instant) d.mesh.position.y = open ? 3.2 : 0; else if (open) sfx.door();
}
function applyWorldState() {
  const S = G.S, f = S.flags;
  setDoor('door_garage', !!f.got_pistol, true); setDoor('door_alley', !!f.alley_open, true); setDoor('door_shutter', !!f.generator_on, true); setDoor('door_basso', !!f.vespera_first_contact, true);
  const gl = S.destroyed.includes('glass'); L.glass.mesh.visible = !gl; L.glass.col.enabled = !gl;
  for (const b of L.barrels) { b.alive = !S.destroyed.includes(b.id); b.hp = 30; b.mesh.visible = b.alive; b.col.enabled = b.alive; }
  const sp = !!f.secret_substation; L.secretPanel.mesh.visible = !sp;
  L.genLamp.material = f.generator_on ? L.M.lampOn : L.M.lampOff; L.storeLight.intensity = f.generator_on ? 26 : 5;
  L.breakerLamp.a.material = f.substation_breaker_a ? L.M.lampOn : L.M.lampOff; L.breakerLamp.b.material = f.substation_breaker_b ? L.M.lampOn : L.M.lampOff;
  const pw = f.substation_breaker_a && f.substation_breaker_b; for (const l of L.subLights) l.intensity = pw ? 34 : 0;
  L.termLamp.material = f.extraction_terminal_armed ? L.M.lampOn : L.M.lampOff;
  L.clockHand.rotation.z = S.clock * Math.PI / 2;
  const bus = S.oneShots.includes('bus'); L.bus.state = bus ? 'SETTLED' : 'INTACT'; L.bus.col.enabled = bus;
  if (bus) { L.bus.group.position.set(9.3, 0, 72.8); L.bus.group.rotation.set(0, 0.06, 0.08); } else { L.bus.group.position.set(8.6, 7.5, 76.6); L.bus.group.rotation.set(-0.12, 0.25, 0); }
  for (const pk of L.pickups) pickupMeshes[pk.id].visible = pickupVisible(pk);
  for (const d of drops) d.mesh.removeFromParent(); drops = [];
  portal.target = 0; portal.k = 0; sealFx.group.visible = false; gate.flare = 0;
  activeGroups = new Set(); exitSeq = null; deathT = 0; timers = []; talk.q.length = 0; puzzleT = 0; hintLevel = 0;
  $('fade').style.opacity = 0;
}
const pickupVisible = (pk) => !G.S.pickups.includes(pk.id) && (!pk.id.startsWith('pk_secret') || G.S.flags.secret_substation);
const gateStable = () => G.S.seals.length >= EXIT.sealsRequired && EXIT.requiredFlags.every((k) => G.S.flags[k]);

function grantSeal(id, pos) {
  if (G.S.seals.includes(id)) return;                 // duplicateSealIdsCountOnce
  G.S.seals.push(id);
  const n = Math.min(G.S.seals.length, EXIT.sealsRequired);
  toast(`SELO DE CONTINUIDADE • ${n}/${EXIT.sealsRequired}${G.S.seals.length > EXIT.sealsRequired ? ' • BÔNUS' : ''}`, 2.4); sfx.seal();
  sealFx.group.position.copy(pos); sealFx.group.visible = true; sealFx.life = 2.2; sparks(pos, 0xffc35a, 24, 3, 0.9);
  if (G.S.seals.length === EXIT.sealsRequired) say('ÍRIS-9', gateStable() ? 'Dois selos. A Fenda de Saída está estável.' : 'Dois selos registrados. Falta só energizar a Fenda na subestação.');
}
function saveCheckpoint(id) {
  G.S.checkpointId = id;
  // kit mínimo contra softlock (GDD §4.4)
  const snap = { saveSchemaVersion: SAVE_SCHEMA, contentVersion: CONTENT_VERSION, missionId: 'A1-M1', checkpointId: id, difficulty: G.settings.difficulty,
    player: { ...L.checkpoints[id], x: id === 'cp00' ? L.checkpoints.cp00.x : P.body.pos.x, y: id === 'cp00' ? 0.01 : P.body.pos.y, z: id === 'cp00' ? L.checkpoints.cp00.z : P.body.pos.z, yaw: P.yaw, hp: P.hp, armor: P.armor, weapons: P.weapons, ammo: P.ammo, current: P.current },
    S: JSON.parse(JSON.stringify(G.S)) };
  store.checkpoint = JSON.parse(JSON.stringify(snap));
  if (commit(store)) { const e = $('saved'); e.style.opacity = 1; setTimeout(() => (e.style.opacity = 0), 1800); }   // "Salvo" só após confirmar
  else toast('Não foi possível gravar o checkpoint');
}
function startMission(snap) {
  enemies.clear();
  if (snap) { G.S = JSON.parse(JSON.stringify(snap.S)); G.settings.difficulty = snap.difficulty || G.settings.difficulty; }
  else G.S = newS();
  applyWorldState();
  const pl = snap ? { ...snap.player } : { ...L.pts.spawn };
  if (snap) { pl.hp = Math.max(pl.hp, 40); if (pl.weapons.martelo9.have && pl.weapons.martelo9.mag + pl.ammo.ammo9 < 30) pl.ammo.ammo9 = 30 - pl.weapons.martelo9.mag; }
  resetPlayer(pl); lastSafe = null; G.time = 0;
  ui.mode = 'play'; ui.stack = []; renderUi(); requestLock();
  if (!snap) {
    saveCheckpoint('cp00');
    say('ÍRIS-9', 'Bracelete ativo. O noticiário acabou de mostrar você explodindo o reator municipal, Gael.');
    say('GAEL', 'Engraçado. Eu me lembro de estar aqui, sem explodir nada.');
    say('ÍRIS-9', 'Então alguém editou a lembrança da cidade inteira. Pegue a Martelo-9 no armário e saia pelo beco.');
  } else toast(`CHECKPOINT ${snap.checkpointId.toUpperCase()}`);
}

// ------------------------------------------------------------------ objetivos e interações
function objective() {
  const f = F(), S = G.S, sec = sectorAt(P.body.pos);
  if (!f.got_pistol) return 'Pegue a Martelo-9 no armário da garagem';
  if (!f.alley_open) return 'Abra caminho pelo Beco de Oficina';
  if (!S.groupsDone.includes('eg02') && sec === 'z03_avenue') return 'Cruze a avenida até a Loja de Ferragens';
  if (!f.generator_on && (sec === 'z03_avenue' || sec === 'z04_hardware')) return f.fuse_collected ? 'Instale o fusível e ligue o gerador da loja' : 'Loja sem energia: encontre o fusível';
  if (!f.vespera_first_contact && (sec === 'z05_vespera_plaza' || sec === 'z04_hardware')) return 'Vá à praça e atenda o interfone do Clube Véspera';
  if (activeGroups.has('eg03')) return 'Sobreviva à emboscada na Praça do Relógio';
  if (sec !== 'z07_substation' && !(f.substation_breaker_a && f.substation_breaker_b)) return 'Suba à passarela e alcance a subestação';
  if (!(f.substation_breaker_a && f.substation_breaker_b)) return `Ligue os dois disjuntores (${(f.substation_breaker_a ? 1 : 0) + (f.substation_breaker_b ? 1 : 0)}/2)`;
  if (!f.extraction_terminal_armed) return 'Arme o terminal de extração';
  if (S.seals.length < EXIT.sealsRequired) return 'Recupere mais 1 Selo de Continuidade (painel do relógio da praça ou gerador da loja)';
  return 'Alcance a Fenda de Saída';
}
const DOCS = {
  doc1: { k: 'ARQUIVO DE MEMÓRIA 01', t: 'Recibo que não existe', b: 'FERRAGENS IRMÃOS LUME — 14/03/2039\n\n1 x fusível industrial 40A ........ pago\n1 x "conserto de relógio de praça" . pago\n\nObservação do balconista:\nO cliente jura que comprou isto ontem. Eu juro que a loja estava fechada ontem. A câmera mostra os dois: ele comprando e a porta trancada. No mesmo minuto.\n\nRabisco no verso, outra letra:\n"Se o relógio da praça voltar a marcar III, a lembrança certa aparece. — S."' },
  doc2: { k: 'ARQUIVO DE MEMÓRIA 02', t: 'Fita do ensaio', b: 'TRANSCRIÇÃO — CLUBE VÉSPERA, BASTIDORES\n\nSOL: Cifra, solta a faixa sete sem os graves.\nDJ CIFRA: Sem os graves fica só o chiado.\nSOL: Não é chiado. Escuta o compasso: três batidas, pausa, uma. Repete a noite inteira, embaixo de qualquer música.\nDJ CIFRA: ...isso não está no meu arquivo original.\nSOL: Nem no meu ensaio de ontem. Alguém gravou por cima do que a gente lembra.\nMARA: Então a gente guarda a fita verdadeira num lugar que ninguém lembre de procurar.\n\n[fim da fita — etiqueta: "estoque da ferragem, mezanino"]' },
};
function interactables() {
  const f = F(), I = L.interact, list = [];
  const add = (pos, text, use, ok = true) => list.push({ pos, text, use, ok });
  if (!f.got_pistol) add(I.locker, 'Abrir armário', () => { f.got_pistol = true; giveWeapon('martelo9'); P.ammo.ammo9 = 45; setDoor('door_garage', true); sfx.pickup(); toast('MARTELO-9 ADQUIRIDA'); say('GAEL', 'Martelo-9. Velha, feia e pontual. Minha cara.'); say('ÍRIS-9', 'O alvo amarelo reage a tiros, se quiser aquecer. Botão direito mira, Alt rola.'); });
  if (!f.alley_open) add(I.alley_switch, 'Acionar chave de emergência do portão', () => { f.alley_open = true; setDoor('door_alley', true); });
  if (!f.fuse_collected) add(I.fuse, 'Pegar fusível', () => { f.fuse_collected = true; sfx.pickup(); toast('FUSÍVEL 40A'); puzzleT = 0; });
  if (!f.generator_on) add(I.generator, f.fuse_collected ? 'Instalar fusível e ligar o gerador' : 'Gerador sem fusível', () => {
    if (!f.fuse_collected) { toast('Falta o fusível — procure nos armários da loja'); sfx.empty(); return; }
    f.generator_on = true; f.generator_state = 'ON'; sfx.power(); setDoor('door_shutter', true); L.genLamp.material = L.M.lampOn; L.storeLight.intensity = 26;
    after(0.7, () => { grantSeal('seal_a1m1_shop', L.pts.seal_shop); say('ÍRIS-9', 'Registro verdadeiro recuperado. Isso é um Selo de Continuidade: dois deles firmam uma Fenda de Saída.'); });
  });
  for (const id of ['doc1', 'doc2']) add(I[id], 'Ler arquivo de memória', () => { if (!G.S.archives.includes(id)) { G.S.archives.push(id); if (id === 'doc2' && !G.S.secrets.includes('duct')) G.S.secrets.push('duct'); } const d = DOCS[id]; $('docK').textContent = d.k; $('docT').textContent = d.t; $('docB').textContent = d.b; push('doc'); });
  if (!f.vespera_first_contact) add(I.intercom, 'Atender o interfone do Véspera', () => {
    f.vespera_first_contact = true; setDoor('door_basso', true);
    say('MARA', 'Clube Véspera. Se veio prender alguém, entre na fila. Se veio entender o sinal, escute.');
    say('SOL', 'A trilha do palco carrega uma frequência escondida. Ela regrava o que as pessoas lembram.');
    say('SOL', 'O relógio da praça marca a hora errada desde que isso começou. O letreiro ainda sabe a certa.');
    say('BASSO', 'Porta lateral destrancada. Tem curativo, cartucho e nenhuma bebida. Não abuse.');
    say('MARA', 'A origem do pulso é a subestação, depois da passarela. E Gael: não banque o herói sozinho.');
    after(9, () => { if (!G.S.groupsDone.includes('eg03') && !activeGroups.has('eg03')) startAmbush(); });
  });
  if (!f.clock_panel_solved) add(I.clock_panel, 'Girar o ponteiro do relógio', () => {
    G.S.clock = (G.S.clock + 1) % 4; L.clockHand.rotation.z = G.S.clock * Math.PI / 2; sfx.ui();
    if (G.S.clock === 1) { f.clock_panel_solved = true; sfx.power(); after(0.5, () => { grantSeal('seal_a1m1_plaza', L.pts.seal_plaza); say('SOL', 'Três em ponto. A praça inteira acabou de lembrar que horas são.'); }); }
  });
  for (const k of ['a', 'b']) if (!f['substation_breaker_' + k]) add(I['breaker_' + k], `Ligar disjuntor ${k.toUpperCase()}`, () => {
    f['substation_breaker_' + k] = true; sfx.power(); L.breakerLamp[k].material = L.M.lampOn;
    if (f.substation_breaker_a && f.substation_breaker_b) { f.both_breakers_ON = true; for (const l of L.subLights) l.intensity = 34; after(0.8, () => { grantSeal('seal_a1m1_substation', L.pts.seal_substation); say('ÍRIS-9', 'Energia estável. Arme o terminal para firmar a Fenda.'); }); }
  });
  if (!f.secret_substation) add(I.secret_panel, 'Remover painel solto', () => { f.secret_substation = true; G.S.secrets.push('substation_panel'); L.secretPanel.mesh.visible = false; sfx.door(); toast('SEGREDO ENCONTRADO'); for (const pk of L.pickups) pickupMeshes[pk.id].visible = pickupVisible(pk); });
  if (!f.extraction_terminal_armed) add(I.terminal, f.substation_breaker_a && f.substation_breaker_b ? 'Armar terminal de extração' : 'Terminal sem energia', () => {
    if (!(f.substation_breaker_a && f.substation_breaker_b)) { toast('Ligue os dois disjuntores primeiro'); sfx.empty(); return; }
    f.extraction_terminal_armed = true; L.termLamp.material = L.M.lampOn; sfx.power();
    say('ÍRIS-9', gateStable() ? 'Fenda de Saída estável. Atravesse quando quiser.' : 'Fenda energizada, mas instável: falta um Selo. O painel do relógio na praça resolve.');
  });
  add(L.pts.gate.clone().setY(L.pts.gate.y + 1.2), gateStable() ? 'Atravessar a Fenda de Saída' : 'Fenda de Saída instável', () => {
    if (!gateStable()) { toast(G.S.seals.length < EXIT.sealsRequired ? `FENDA INSTÁVEL • SELOS ${G.S.seals.length}/${EXIT.sealsRequired}` : 'FENDA SEM ENERGIA • disjuntores e terminal'); sfx.empty(); return; }
    if (exitSeq || P.dead) return;                      // evento idempotente
    G.S.exitGateInteracted = true; exitSeq = { t: 0, phase: 0 }; P.inputLock = 99; sfx.gate(); say('ÍRIS-9', 'Primeiro pulso identificado. Origem: o palco do Véspera.');
  });
  return list;
}
let prompt = null;
G.hooks.hasPrompt = () => !!prompt;
function updateInteraction() {
  const p = P.body.pos; let best = null, bd = 2.5;
  for (const it of interactables()) { const d = Math.hypot(it.pos.x - p.x, (it.pos.y - (p.y + 1)) * 0.6, it.pos.z - p.z); if (d < bd) { bd = d; best = it; } }
  prompt = best;
  const e = $('prompt');
  if (best && !P.dead && !exitSeq) { e.style.display = 'block'; const key = input.usingPad ? 'X' : 'E'; if (e.dataset.t !== key + best.text) { e.dataset.t = key + best.text; e.innerHTML = `<kbd>${key}</kbd>${best.text}`; } } else e.style.display = 'none';
  if (best && !P.dead && !exitSeq && P.inputLock <= 0 && (hit('KeyE') || (input.pad && input.pad.hit.x))) best.use();
}
function startAmbush() {
  portal.target = 1; sfx.portal(); activeGroups.add('eg03'); G.S.flags.eg03_started = true;
  say('ÍRIS-9', 'Fenda abrindo sobre a praça! Drone e reforços — troque a altura da mira.');
  after(1.2, () => enemies.spawnGroup('eg03', L.groups.eg03));
  after(4.5, () => {            // pulso: 1 carga demonstrativa de Eco Cronal (não permanente)
    if (!once('eco_pulse')) return;
    G.S.flags.eco_teaser_seen = true; G.S.flags.eco_teaser_available = true; P.eco.charges = CFG.eco.teaserCharges; P.eco.teaser = true;
    flash(P.body.pos.clone().setY(P.body.pos.y + 1), 3, 0.5, 0x35e6ff); sfx.eco();
    say('ÍRIS-9', 'O pulso carregou o bracelete: uma carga de Eco Cronal. Q devolve você para onde estava há três segundos.');
  });
  after(7, () => (portal.target = 0));
}
G.hooks.onEcoUsed = () => { G.S.flags.eco_teaser_used = true; G.S.flags.eco_teaser_available = false; P.eco.teaser = false; say('SOL', 'Você... voltou no tempo um pouquinho? Isso explicaria muito sobre os meus ensaios.'); };
G.hooks.toast = toast;
G.hooks.onDeath = () => { deathT = 0; G.S.stats.deaths++; };
G.hooks.hitMarker = (head, kill) => { const e = $('hitm'); e.style.color = kill ? '#ff3048' : head ? '#ffb030' : '#fff'; e.style.opacity = 1; e.style.transition = 'none'; requestAnimationFrame(() => { e.style.transition = 'opacity .25s'; e.style.opacity = 0; }); };
G.hooks.onEnemyKilled = (e) => {
  if (e.type === 'DRONE' || Math.random() > 0.5 * DIFF[G.settings.difficulty].res) return;
  const type = P.weapons.trovao_duplo.have && Math.random() < 0.35 ? 'shells' : P.hp < 45 && Math.random() < 0.5 ? 'medkit' : 'ammo9';
  const pos = e.body.pos.clone(); pos.y += 0.35; const mesh = makePickupMesh(type); mesh.position.copy(pos);
  drops.push({ type, amount: type === 'shells' ? 2 : type === 'medkit' ? 20 : 12, pos, mesh });
};
G.hooks.onShootCollider = (c, dmg, point) => {
  if (c.glass && dmg > 0 && !G.S.destroyed.includes('glass')) { G.S.destroyed.push('glass'); L.glass.mesh.visible = false; L.glass.col.enabled = false; sfx.glass(); sparks(point, 0xbfefff, 40, 5, 0.8); if (!G.S.secrets.includes('vitrine')) { G.S.secrets.push('vitrine'); toast('VITRINE QUEBRADA • algo brilha lá dentro'); } }
  if (c.barrel && dmg > 0) { const b = L.barrels.find((x) => x.id === c.barrel); if (b && b.alive) { b.hp -= dmg; if (b.hp <= 0) explodeBarrel(b); } }
  if (c.target && dmg > 0) { flash(point, 0.4, 0.12, 0xffe060); if (once('target_hit')) toast('ALVO REATIVO • mira calibrada'); }
};
function explodeBarrel(b) { b.alive = false; b.mesh.visible = false; b.col.enabled = false; G.S.destroyed.push(b.id); enemies.explode(b.pos, b.id === 'capacitor_sub' ? 7 : 5.5, 130); }

function collect(type, amount) {
  const res = DIFF[G.settings.difficulty].res;
  if (type === 'ammo9' || type === 'shells') { if (P.ammo[type] >= AMMO_CAP[type]) return false; P.ammo[type] = Math.min(AMMO_CAP[type], P.ammo[type] + Math.round(amount * res)); toast(type === 'ammo9' ? `+ MUNIÇÃO 9 mm` : `+ CARTUCHOS`, 1.2); }
  else if (type === 'medkit') { if (P.hp >= CFG.player.maxHealth) return false; P.hp = Math.min(CFG.player.maxHealth, P.hp + amount); toast('+ KIT MÉDICO', 1.2); }
  else if (type === 'armor') { if (P.armor >= CFG.player.maxArmor) return false; P.armor = Math.min(CFG.player.maxArmor, P.armor + amount); toast('+ ARMADURA', 1.2); }
  else if (type === 'pecas') { G.S.pecas += amount; toast(`+ ${amount} PEÇAS CRONAIS`, 1.6); }
  else if (type === 'weapon_trovao') { giveWeapon('trovao_duplo'); P.ammo.shells = Math.min(AMMO_CAP.shells, P.ammo.shells + 4); toast('TROVÃO DUPLO ADQUIRIDA • tecla 2', 2.6); say('GAEL', 'Dois canos, zero sutileza. Agora sim a noite ficou educada.'); }
  sfx.pickup(); return true;
}

// ------------------------------------------------------------------ simulação (60 Hz)
function tick(dt) {
  const S = G.S, p = P.body.pos, f = S.flags;
  G.time += dt; S.stats.time += dt;
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const fn = timers[i].fn; timers.splice(i, 1); fn(); } }
  if (exitSeq) { runExit(dt); P.body.vel.set(0, 0, 0); }
  updatePlayer(dt, enemies);
  enemies.update(dt);
  if (P.dead) { deathT += dt; if (deathT > 1.4 && !ui.stack.includes('dead')) { $('deadTip').textContent = ['Role (Alt) quando o visor do inimigo piscar — o tiro vem logo depois.', 'O laser vermelho do atirador trava meio segundo antes do disparo. Saia da linha.', 'Barris vermelhos e o capacitor da subestação resolvem grupos inteiros.', 'Armadura absorve 65% do dano. Procure os kits azuis.'][Math.floor(Math.random() * 4)]; push('dead'); } return; }
  updateInteraction();
  // coletáveis
  for (const pk of L.pickups) { const m = pickupMeshes[pk.id]; if (!m.visible) continue; if (Math.hypot(pk.pos.x - p.x, pk.pos.z - p.z) < 0.95 && Math.abs(pk.pos.y - (p.y + 0.6)) < 1.3 && collect(pk.type, pk.amount)) { S.pickups.push(pk.id); m.visible = false; } }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; if (Math.hypot(d.pos.x - p.x, d.pos.z - p.z) < 0.95 && Math.abs(d.pos.y - (p.y + 0.6)) < 1.3 && collect(d.type, d.amount)) { d.mesh.removeFromParent(); drops.splice(i, 1); } }
  // encontros
  for (const id in L.groups) {
    const g = L.groups[id]; if (S.groupsDone.includes(id)) continue;
    if (!activeGroups.has(id)) { if (g.trigger && g.trigger(p)) { activeGroups.add(id); enemies.spawnGroup(id, g); onGroupStart(id); } }
    else if (enemies.aliveInGroup(id) === 0 && !(id === 'eg03' && timers.length && !enemies.all.some((e) => e.active && e.group === 'eg03'))) { activeGroups.delete(id); S.groupsDone.push(id); onGroupDone(id); }
  }
  // eventos de posição
  const sec = sectorAt(p);
  if (sec === 'z03_avenue' && p.z > 57 && once('bus')) { L.bus.state = 'FALLING'; L.bus.t = 0; }
  if (sec === 'z04_hardware' && once('store_enter')) say('ÍRIS-9', 'Portão de enrolar sem energia. Gerador nos fundos, fusível em algum armário.');
  if (sec === 'z04b_duct' && p.x > 0 && once('duct')) { if (!S.secrets.includes('duct')) S.secrets.push('duct'); toast('SEGREDO ENCONTRADO • duto de ventilação'); }
  if (sec === 'z05_vespera_plaza' && p.z > 98 && once('neon')) say('GAEL', 'Esse letreiro acabou de me mostrar um aniversário que eu nunca tive.');
  if (sec === 'z06_walkway' && p.z > 137 && once('walk_tip')) say('ÍRIS-9', 'Bordas com faixa amarela aguentam você. Segure Espaço para saltar mais alto e agarrar.');
  if (sec === 'z07_substation' && once('sub_enter')) say('ÍRIS-9', 'Dois disjuntores, um em cada parede. O capacitor vermelho no meio explode bonito.');
  // checkpoints
  if (S.checkpointId === 'cp00' && f.alley_open && p.z > 41.6) { saveCheckpoint('cp01'); say('ÍRIS-9', 'Beco limpo. Atirador na sacada à esquerda da avenida: o laser avisa antes do disparo.'); }
  if ((S.checkpointId === 'cp00' || S.checkpointId === 'cp01') && p.z > 132.4 && p.z < 136 && p.y > 3.8 && P.body.grounded) { P.eco.charges = 0; P.eco.teaser = false; f.eco_teaser_available = false; saveCheckpoint('cp02'); }
  if (S.checkpointId !== 'cp03' && p.z > 185.3 && P.body.grounded) saveCheckpoint('cp03');
  // passarela: queda repõe na última borda segura, com dano moderado
  if (sec === 'z06_walkway' && p.z < 170) {
    if (P.body.grounded && p.y > 3.5 && P.state === 'GROUNDED') { if (!lastSafe) lastSafe = new THREE.Vector3(); const g = P.body.ground; if (g && p.z > g.min[2] + 0.5 && p.z < g.max[2] - 0.5) lastSafe.copy(p); }
    if (p.y < 1.6) { const s = lastSafe || new THREE.Vector3(0, 4.01, 134); p.copy(s); P.body.vel.set(0, 0, 0); P.hp = Math.max(1, P.hp - 10); S.stats.dmgTaken += 10; sfx.hurt(); flash(p.clone().setY(p.y + 1), 1, 0.3, 0x35e6ff); toast('Queda • reposicionado na última borda'); P.inputLock = 0.25; }
  }
  // dicas graduais do puzzle da loja
  if (sec === 'z04_hardware' && !f.generator_on && G.settings.hints) { puzzleT += dt; if (puzzleT > 180 && hintLevel === 0) { hintLevel = 1; say('ÍRIS-9', 'Dica: há um armário metálico na parede à direita de quem entra na loja.'); } if (puzzleT > 300 && hintLevel === 1) { hintLevel = 2; say('ÍRIS-9', 'O fusível está no armário da parede direita; o gerador fica do outro lado, perto do portão de enrolar.'); } }
  setIntensity(enemies.activeAlive() > 0 ? 1 : 0);
}
function onGroupStart(id) {
  if (id === 'eg01') say('ÍRIS-9', 'Dois Saqueadores Cronais. O barril vermelho não está ali de enfeite.');
  if (id === 'eg05') say('ÍRIS-9', 'Dois saindo da subestação. Use as caixas do pátio.');
}
function onGroupDone(id) {
  if (id === 'eg01' && !F().alley_open) { F().alley_open = true; setDoor('door_alley', true); }
  if (id === 'eg02') say('GAEL', 'Avenida liberada. A loja de ferragens ainda tem luz de emergência.');
  if (id === 'eg03') { if (!F().eco_teaser_used) say('SOL', 'O bracelete piscou e você nem ligou. Tudo bem, a noite é longa.'); say('MARA', 'Praça limpa. A escada do fundo leva à passarela.'); }
}
function runExit(dt) {
  const q = exitSeq; q.t += dt;
  if (q.phase === 0) { gate.flare = Math.min(1, q.t / MX.gateInteractionSeconds) * 0.5; if (q.t >= MX.gateInteractionSeconds) { q.phase = 1; q.t = 0; $('fade').style.transition = `opacity ${MX.gateTransitionSeconds}s`; $('fade').style.opacity = 1; } }
  else if (q.phase === 1 && q.t >= MX.gateTransitionSeconds) {
    // transação: só confirma mission_complete depois de persistir (requiresSaveCommitBeforeMissionComplete)
    const S = G.S, prev = JSON.stringify(store);
    const acc = S.stats.shots ? S.stats.hits / S.stats.shots : 0;
    const best = store.campaign.completed['A1-M1'];
    store.campaign.completed['A1-M1'] = { time: best ? Math.min(best.time, S.stats.time) : S.stats.time, seals: Math.max(best ? best.seals : 0, S.seals.length) };
    if (!store.campaign.unlocked.includes(CFG.eco.unlockMission)) store.campaign.unlocked.push('A1-M2');
    if (!store.campaign.rewardsGranted['A1-M1']) { store.campaign.rewardsGranted['A1-M1'] = true; store.campaign.pecasCronais += S.pecas; }   // recompensa só uma vez
    store.checkpoint = null;
    if (commit(store)) { S.flags.mission_complete = true; exitSeq = null; showResults(acc); }
    else { store = JSON.parse(prev); S.exitGateInteracted = false; exitSeq = null; gate.flare = 0; P.inputLock = 0.3; $('fade').style.opacity = 0; toast('Falha ao gravar o progresso — a Fenda continua ativa. Tente de novo.', 4); }
  }
}
function showResults(acc) {
  const S = G.S, t = S.stats.time, mm = Math.floor(t / 60), ss = String(Math.floor(t % 60)).padStart(2, '0');
  const pts = (t < 16 * 60 ? 1 : 0) + (acc > 0.45 ? 1 : 0) + (S.stats.dmgTaken < 150 ? 1 : 0) + (S.secrets.length >= 2 ? 1 : 0) + (S.seals.length >= 3 ? 1 : 0);
  $('rMedal').textContent = pts >= 4 ? '★ MEDALHA DE OURO' : pts >= 2 ? '★ MEDALHA DE PRATA' : '★ MEDALHA DE BRONZE';
  const st = [['TEMPO', `${mm}:${ss}`], ['PRECISÃO', `${Math.round(acc * 100)}%`], ['INIMIGOS', `${S.stats.kills}/12`], ['SELOS', `${S.seals.length}/${MX.normalSealsAvailable}`], ['SEGREDOS', `${S.secrets.length}/3`], ['QUEDAS', `${S.stats.deaths}`]];
  $('rStats').innerHTML = st.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  $('rText').textContent = `Dificuldade ${DIFF[G.settings.difficulty].name}. ${S.pecas} Peças Cronais recolhidas. A1-M2 — Noite de Neon foi desbloqueada na campanha (o interior do Clube Véspera é o próximo marco de produção).`;
  $('fade').style.transition = 'opacity .6s'; $('fade').style.opacity = 0; releaseLock(); ui.stack = ['results']; renderUi();
}
function fillPause() {
  $('pObj').textContent = objective(); $('pSeal').textContent = `${Math.min(G.S.seals.length, 2)}/2 obrigatórios${G.S.seals.length > 2 ? ' + 1 bônus' : ''}`;
  $('pSec').textContent = `${G.S.secrets.length}/3`; $('pCp').textContent = G.S.checkpointId.toUpperCase();
}
function restartCheckpoint() {
  const deaths = G.S.stats.deaths, time = G.S.stats.time;
  const snap = store.checkpoint; if (!snap) { startMission(null); return; }
  startMission(snap); G.S.stats.deaths = deaths; G.S.stats.time = time;
}
function toMenu() { enemies.clear(); releaseLock(); ui.mode = 'menu'; ui.stack = []; refreshMenu(); renderUi(); setIntensity(0); }
function refreshMenu() {
  store = loadAll(); const cp = store.checkpoint;
  $('bCont').disabled = !cp; $('contInfo').textContent = cp ? `A1-M1 • ${cp.checkpointId.toUpperCase()} • ${DIFF[cp.difficulty]?.name || ''}` : (store.campaign.completed['A1-M1'] ? 'A1-M1 concluída — inicie uma nova campanha para repetir' : 'Nenhum checkpoint salvo');
}

// ------------------------------------------------------------------ por quadro
let hudCache = {};
const setTxt = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
function updateHud() {
  const S = G.S; setTxt('objT', objective());
  const n = Math.min(S.seals.length, EXIT.sealsRequired); setTxt('sealN', `${n}/${EXIT.sealsRequired}`);
  if (hudCache.sealDots !== n) { hudCache.sealDots = n; document.querySelectorAll('#seals i').forEach((e, i) => e.classList.toggle('got', i < n)); }
  setTxt('sector', SECTOR_NAMES[sectorAt(P.body.pos)]);
  setTxt('hpN', String(Math.ceil(P.hp))); setTxt('arN', String(Math.ceil(P.armor)));
  $('hpB').style.width = P.hp + '%'; $('arB').style.width = P.armor + '%';
  $('vign').style.boxShadow = `inset 0 0 180px rgba(255,0,30,${P.hp < 35 ? 0.5 * (1 - P.hp / 35) + 0.1 : 0})`;
  if (P.current) { const w = WEAPONS[P.current]; setTxt('wN', w.name); setTxt('wM', String(P.weapons[P.current].mag)); setTxt('wA', '/ ' + P.ammo[w.ammo]); setTxt('wR', P.reloadT > 0 ? 'RECARREGANDO' : P.weapons[P.current].mag === 0 ? 'SEM MUNIÇÃO NO PENTE' : ''); $('weapon').style.visibility = 'visible'; }
  else $('weapon').style.visibility = 'hidden';
  $('eco').style.display = P.eco.charges > 0 ? 'flex' : 'none';
  // retículo comunica a dispersão real
  const w = P.current ? WEAPONS[P.current] : null, sp = w ? ((P.ads ? w.adsSpread : w.spread) + P.bloom + (P.speed > 4 ? 0.006 : 0)) : 0.01;
  const px = Math.max(5, sp / Math.tan(camera.fov * Math.PI / 360) * innerHeight / 2 + 4), show = P.current ? '' : 'none';
  const set = (id, l, t, ww, hh) => { const e = $(id).style; e.left = l + 'px'; e.top = t + 'px'; e.width = ww + 'px'; e.height = hh + 'px'; e.display = show; };
  set('c1', -1, -px - 7, 2, 7); set('c2', -1, px, 2, 7); set('c3', -px - 7, -1, 7, 2); set('c4', px, -1, 7, 2);
  // direção do dano
  const dm = $('dmg'); while (dm.children.length < P.hitDirs.length) dm.appendChild(document.createElement('i')); while (dm.children.length > P.hitDirs.length) dm.lastChild.remove();
  P.hitDirs.forEach((h, i) => { const rel = P.yaw - h.ang; dm.children[i].style.transform = `rotate(${rel}rad)`; dm.children[i].style.opacity = Math.min(1, h.t); });
  setTxt('hint', !input.locked && !input.freeLook && !input.usingPad ? 'CLIQUE NA TELA PARA CAPTURAR O MOUSE' : '');
}
let solT = 0, solI = 0; const DANCES = ['Superlove_Pop_Dance', 'All_Night_Dance', 'Not_Your_Mom'];
function frameUpdate(dt, sim) {
  const t = performance.now() / 1000;
  // portas
  for (const n in doorAnim) { const d = L.doors[n], ty = doorAnim[n] ? 3.2 : 0; if (Math.abs(d.mesh.position.y - ty) > 0.01) d.mesh.position.y += Math.sign(ty - d.mesh.position.y) * Math.min(Math.abs(ty - d.mesh.position.y), dt * 3.2); }
  // ônibus
  const bus = L.bus;
  if (bus.state === 'FALLING' && sim) { bus.t += dt; const k = Math.min(1, bus.t / 1.25), e = k * k; bus.group.position.set(8.6 + 0.7 * k, 7.5 - 7.5 * e, 76.6 - 3.8 * k); bus.group.rotation.set(-0.12 - 1.0 * Math.sin(k * 3.14), 0.25 - 0.19 * k, 0.08 * k);
    if (k >= 1) { bus.state = 'SETTLED'; const p = P.body.pos; if (!(p.x > 6.8 && p.x < 11.8 && p.z > 68 && p.z < 77.6)) bus.col.enabled = true; sfx.crash(); shake(0.5); sparks(new THREE.Vector3(9.3, 0.5, 72.8), 0xffc060, 60, 8, 1); say('GAEL', 'Aquele ônibus tinha horário. Agora tem cratera.'); } }
  if (bus.state === 'SETTLED' && !bus.col.enabled) { const p = P.body.pos; if (!(p.x > 6.8 && p.x < 11.8 && p.z > 68 && p.z < 77.6)) bus.col.enabled = true; }
  // letreiro do Véspera falhando
  const gl = Math.sin(t * 0.9) > 0.9 || Math.sin(t * 7.3) > 0.985; L.neon.material.map = L.neonTex[gl ? 1 : 0]; L.neonLight.color = gl ? 0x35e6ff : 0xff4fd0;
  // Sol Vega na vitrine-palco
  const ref = ui.mode === 'play' ? P.body.pos : camera.position;
  const near = Math.abs(ref.z - 117) < 70;
  if (near) { solT -= dt; if (solT <= 0) { solI = (solI + 1) % DANCES.length; solT = 14; } }
  for (const d of dancers) {
    d.root.visible = near; if (!near) continue;
    d.play(DANCES[(solI + d.off) % DANCES.length], 0.6); d.update(dt);
    const wantHolo = G.settings.attenuate; if (d.isHolo !== wantHolo) { d.isHolo = wantHolo; d.mesh.material = wantHolo ? d.holoMat : d.baseMaterial; }
  }
  // coletáveis flutuando
  for (const pk of L.pickups) { const m = pickupMeshes[pk.id]; if (m.visible) { m.position.y = pk.pos.y + Math.sin(t * 2.5 + pk.pos.x) * 0.06; m.rotation.y += dt * 1.2; } }
  for (const d of drops) d.mesh.rotation.y += dt * 1.2;
  if (sealFx.life > 0) { sealFx.life -= dt; sealFx.group.position.y += dt * 0.5; sealFx.group.scale.setScalar(Math.min(1, sealFx.life)); if (sealFx.life <= 0) sealFx.group.visible = false; }
  gate.stable = ui.mode === 'play' && gateStable();
  L.water.material.opacity = 0.45 + 0.12 * Math.sin(t * 3);
  if (ui.mode === 'play') {
    P.actor.update(dt); enemies.frame(dt); updateCamera(dt);
    updateLights(L, P.body.pos, dt); moon.target.position.copy(P.body.pos); moon.position.set(P.body.pos.x + 30, P.body.pos.y + 60, P.body.pos.z - 25);
    updateHud();
  } else {   // câmera de menu: órbita lenta diante do Véspera
    camera.position.set(3 + Math.sin(t * 0.12) * 5, 3.2 + Math.sin(t * 0.2) * 0.4, 108 + Math.cos(t * 0.12) * 4); camera.lookAt(-15, 4.6, 116);
    if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
    updateLights(L, new THREE.Vector3(-8, 3, 114), dt);
  }
  updateFx(dt); updateTalk(sim || ui.mode !== 'play' ? dt : 0);
}
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, CFG.simulation.maxDeltaSecondsAfterTabReturn); last = now;
  pollPad();
  if (hit('Escape') || (input.pad && (input.pad.hit.start || (input.pad.hit.bb && ui.stack.length)))) back();
  if (ui.stack[ui.stack.length - 1] === 'doc' && hit('KeyE')) pop();
  const sim = simActive();
  if (sim) { acc += dt; let n = 0; while (acc >= 1 / CFG.simulation.fixedHz && n < 6) { tick(1 / CFG.simulation.fixedHz); acc -= 1 / CFG.simulation.fixedHz; n++; endFrame(); } }
  else { acc = 0; endFrame(); }
  frameUpdate(dt, sim);
  renderer.render(scene, camera);
}

// ------------------------------------------------------------------ inicialização
function bindUi() {
  const click = (id, fn) => $(id).addEventListener('click', () => { initAudio(); sfx.ui(); fn(); });
  click('bNew', () => push('newgame')); click('bOpt', () => { fillOptions(); push('options'); }); click('bCtl', () => push('controls'));
  click('bCont', () => { if (store.checkpoint) startMission(store.checkpoint); });
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx.ui(); pop(); }));
  document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => { initAudio(); G.settings.difficulty = b.dataset.diff; persistSettings(); startMission(null); }));
  click('bResume', () => { pop(); requestLock(); }); click('bRestart', restartCheckpoint); click('bPOpt', () => { fillOptions(); push('options'); }); click('bPCtl', () => push('controls')); click('bQuit', toMenu);
  click('bDocClose', pop); click('bRetry', restartCheckpoint); click('bDeadMenu', toMenu);
  click('bReplay', () => startMission(null)); click('bResMenu', toMenu);
  canvas.addEventListener('mousedown', () => { initAudio(); if (simActive() && !input.locked) requestLock(); });
  const o = (id, key, fmt, apply) => { const e = $(id); e.addEventListener('input', () => { G.settings[key] = e.type === 'checkbox' ? e.checked : e.tagName === 'SELECT' ? e.value : parseFloat(e.value); if (fmt) $(id + 'v').textContent = fmt(G.settings[key]); if (apply) apply(); }); };
  o('oQ', 'quality', null, applyQuality); o('oF', 'fov', (v) => v + '°'); o('oS', 'sens', (v) => v.toFixed(2)); o('oI', 'invertY');
  o('oV', 'volume', (v) => Math.round(v * 100), () => { audio.volume = G.settings.volume; setVolumes(); }); o('oM', 'music', (v) => Math.round(v * 100), () => { audio.music = G.settings.music; setVolumes(); });
  o('oK', 'shake'); o('oH', 'hints'); o('oA', 'attenuate');
}
function fillOptions() {
  const s = G.settings; $('oQ').value = s.quality; $('oF').value = s.fov; $('oFv').textContent = s.fov + '°'; $('oS').value = s.sens; $('oSv').textContent = s.sens.toFixed(2); $('oI').checked = s.invertY;
  $('oV').value = s.volume; $('oVv').textContent = Math.round(s.volume * 100); $('oM').value = s.music; $('oMv').textContent = Math.round(s.music * 100); $('oK').checked = s.shake; $('oH').checked = s.hints; $('oA').checked = s.attenuate;
}
async function boot() {
  applyQuality(); audio.volume = G.settings.volume; audio.music = G.settings.music;
  L = buildLevel(scene); G.level = L; initFx(scene);
  await loadCharacters((k) => ($('bootP').style.width = 20 + k * 70 + '%'));
  createPlayer(scene); createEnemyPools(scene); initEnemyList();
  // dançarinas na vitrine-palco: mesmo modelo, figurinos diferentes via máscara (ver OUTFITS em characters.js)
  const holoMat = new THREE.MeshBasicMaterial({ color: 0xff7ad8, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  dancers = [['sol', 0.75, 0], ['lux', -0.8, 1]].map(([outfit, dz, off]) => { const a = new Actor('sol', { scale: 1.0, outfit }); a.root.position.copy(L.pts.sol); a.root.position.z += dz; a.root.rotation.y = Math.PI / 2; scene.add(a.root); a.holoMat = holoMat; a.off = off; a.play('Idle', 0); return a; });
  gate = makeGate(); gate.group.position.copy(L.pts.gate); scene.add(gate.group);
  portal = makePortal(); portal.group.position.copy(L.pts.portal); scene.add(portal.group);
  sealFx = makeSeal(); sealFx.group.visible = false; sealFx.life = 0; scene.add(sealFx.group);
  for (const pk of L.pickups) { const m = makePickupMesh(pk.type); m.position.copy(pk.pos); pickupMeshes[pk.id] = m; }
  G.S = newS(); applyWorldState(); resetPlayer({ ...L.pts.spawn });
  initInput(canvas, () => { if (simActive() && !input.freeLook) { fillPause(); push('pause'); } });
  bindUi(); $('bootP').style.width = '100%';
  renderer.compile(scene, camera);
  ui.mode = 'menu'; refreshMenu(); renderUi();
  requestAnimationFrame(frame);
}
// ganchos de teste/QA (console): window.QNT
window.QNT = { G, P, updateCamera, get dancers() { return dancers; }, enemies, ui, input, restartCheckpoint, get L() { return L; }, get store() { return store; }, startMission, saveCheckpoint, grantSeal, gateStable, setSimulateSaveFailure, tick, back, objective, interactables };
boot().catch((e) => { $('bootT').textContent = 'ERRO AO CARREGAR: ' + e.message; console.error(e); });
