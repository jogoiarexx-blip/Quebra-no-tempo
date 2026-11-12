// QUEBRA NO TEMPO — motor do slice (A1-M1 Rua Quebrada → A1-M2 Noite de Neon).
// Laço fixo de 60 Hz, máquina única de interface, missões como módulos guiados por flags (GDD §9.3 / §28 / §46).
import * as THREE from 'three';
import { G, CFG, DIFF } from './state.js';
import { input, initInput, requestLock, releaseLock, hit, pollPad, endFrame, resetInput } from './input.js';
import { updateLights, building } from './world.js';
import { raycast } from './physics.js';
import { PICKUPS, createPickupMesh, disposePickupAssets } from './pickups.js';
import { applyResourcePickup, chooseEnemyDrop } from './loot.js';
import { loadCharacters } from './characters.js';
import { initTouch } from './touch.js';
import { NPC } from './npcs.js';
import { P, createPlayer, resetPlayer, updatePlayer, updateCamera, giveWeapon, switchWeapon, setHolster, unlockEco, damagePlayer, WEAPONS, AMMO_CAP } from './player.js';
import { enemies, createEnemyPools, initEnemyList } from './enemies.js';
import { initFx, updateFx, sparks, flash, shake, makeSeal, makeGate, makePortal } from './fx.js';
import { audio, initAudio, setVolumes, setPaused, setIntensity, setTrack, setMusic, setAlarm, sfx } from './audio.js';
import { loadAll, commit, SAVE_SCHEMA, CONTENT_VERSION, setSimulateSaveFailure } from './save.js';
import a1m1 from './missions/a1m1.js';
import a1m2 from './missions/a1m2.js';
import a1m3 from './missions/a1m3.js';
import { improveMissionScenery } from './scenery-details.js';

const MISSIONS = { 'A1-M1': a1m1, 'A1-M2': a1m2, 'A1-M3': a1m3 };
const ORDER = ['A1-M1', 'A1-M2', 'A1-M3'];
const $ = (id) => document.getElementById(id);
const MX = CFG.missionExit;
let store = loadAll();
store.campaign.flags = store.campaign.flags || {};
if (store.settings) Object.assign(G.settings, store.settings);
const persistSettings = () => { store.settings = { ...G.settings }; commit(store); };

// ------------------------------------------------------------------ interface (máquina única)
const ui = { mode: 'boot', stack: [] };
let touchControls;
const LAYERS = ['boot', 'menu', 'missions', 'newgame', 'options', 'controls', 'pause', 'doc', 'dead', 'results'];
function renderUi() {
  const top = ui.stack[ui.stack.length - 1];
  for (const id of LAYERS) $(id).classList.toggle('on', id === top || (!top && id === ui.mode));
  $('hud').classList.toggle('on', ui.mode === 'play' && !top);
  touchControls?.sync(ui.mode === 'play' && !top);
  setPaused(ui.mode === 'play' && ui.stack.length > 0);
}
const simActive = () => ui.mode === 'play' && ui.stack.length === 0;
function push(id) { if (ui.stack.includes(id)) return; ui.stack.push(id); resetInput(); if (ui.mode === 'play') releaseLock(); renderUi(); const f = $(id).querySelector('.btn:not([disabled])'); if (f) f.focus(); }
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
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0e18); scene.fog = new THREE.FogExp2(0x0d1220, 0.011);
const camera = new THREE.PerspectiveCamera(G.settings.fov, 1, 0.08, 900);
G.scene = scene; G.camera = camera; G.renderer = renderer;
const hemi = new THREE.HemisphereLight(0x9db4e6, 0x242630, 1.5); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xb4c8ff, 1.2); moon.position.set(30, 60, -25); scene.add(moon, moon.target);
moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 140 }); moon.shadow.bias = -0.0015;
function applyQuality() {
  const q = CFG.graphics.quality[G.settings.quality] || CFG.graphics.quality.medium;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5) * q.renderScale);
  renderer.setSize(innerWidth, innerHeight, false);
  const sh = G.settings.quality === 'high';
  if (renderer.shadowMap.enabled !== sh) { renderer.shadowMap.enabled = sh; moon.castShadow = sh; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', applyQuality);

let L = null, mission = null, gate, portal, sealFx, pickupMeshes = {}, drops = [], doorAnim = {};
function makePickupMesh(type) {
  const mesh = createPickupMesh(type);
  (L ? L.root : scene).add(mesh);
  return mesh;
}
const resourceLimits = () => ({ maxHealth: CFG.player.maxHealth, maxArmor: CFG.player.maxArmor, ammoCaps: AMMO_CAP, res: (DIFF[G.settings.difficulty] || DIFF.mercenario).res });

// ------------------------------------------------------------------ estado da missão
const newS = (m) => ({ missionId: m.id, flags: {}, seals: [], pickups: [], groupsDone: [], destroyed: [], oneShots: [], archives: [], secrets: [], checkpointId: 'cp00', pecas: 0, exitGateInteracted: false,
  stats: { time: 0, shots: 0, hits: 0, kills: 0, dmgTaken: 0, deaths: 0 }, ...(m.newState ? m.newState() : {}) });
let activeGroups = new Map(), exitSeq = null, deathT = 0, timers = [];
const after = (t, fn) => timers.push({ t, fn });
const once = (id) => { if (G.S.oneShots.includes(id)) return false; G.S.oneShots.push(id); return true; };

function setDoor(name, open, instant) {
  const d = L.doors[name]; if (!d) return; d.col.enabled = !open; doorAnim[name] = open ? 1 : 0;
  const h = d.box[3] - d.box[2] + 0.2;
  if (instant) d.mesh.position.y = open ? h : 0; else if (open) sfx.door();
  d.openH = h;
}
const pickupVisible = (pk) => !G.S.pickups.includes(pk.id) && (!mission.pickupVisible || mission.pickupVisible(X, pk));
const gateStable = () => G.S.seals.length >= mission.sealsRequired && mission.requiredFlags.every((k) => G.S.flags[k]);
function grantSeal(id, pos) {
  if (G.S.seals.includes(id)) return;                 // duplicateSealIdsCountOnce
  G.S.seals.push(id);
  const req = mission.sealsRequired, n = Math.min(G.S.seals.length, req);
  toast(`SELO DE CONTINUIDADE • ${n}/${req}${G.S.seals.length > req ? ' • BÔNUS' : ''}`, 2.4); sfx.seal();
  sealFx.group.position.copy(pos); sealFx.group.visible = true; sealFx.life = 2.2; sparks(pos, 0xffc35a, 24, 3, 0.9);
  if (G.S.seals.length === req) say('ÍRIS-9', gateStable() ? 'Selos suficientes. A Fenda de Saída está estável.' : 'Selos suficientes. Falta só energizar a Fenda.');
}
function saveCheckpoint(id) {
  G.S.checkpointId = id;
  const cp = L.checkpoints[id] || L.pts.spawn, useCp = id === 'cp00' || cp.force;
  const snap = { saveSchemaVersion: SAVE_SCHEMA, contentVersion: CONTENT_VERSION, missionId: mission.id, checkpointId: id, difficulty: G.settings.difficulty,
    player: { x: useCp ? cp.x : P.body.pos.x, y: useCp ? cp.y : P.body.pos.y, z: useCp ? cp.z : P.body.pos.z, yaw: useCp ? cp.yaw : P.yaw, hp: P.hp, armor: P.armor, weapons: P.weapons, ammo: P.ammo, current: P.current, holster: P.holster },
    S: JSON.parse(JSON.stringify(G.S)) };
  store.checkpoint = JSON.parse(JSON.stringify(snap));
  if (commit(store)) { const e = $('saved'); e.style.opacity = 1; setTimeout(() => (e.style.opacity = 0), 1800); }   // "Salvo" só após confirmar
  else toast('Não foi possível gravar o checkpoint');
}
function refreshPickups() { for (const pk of L.pickups) pickupMeshes[pk.id].visible = pickupVisible(pk); }

// contexto entregue às missões (API estável entre motor e conteúdo)
const X = {
  get S() { return G.S; }, get L() { return L; }, P, enemies, sfx, camera, settings: G.settings,
  get activeGroups() { return activeGroups; }, get portal() { return portal; }, get playing() { return ui.mode === 'play'; }, get campaign() { return store.campaign; },
  fx: { sparks, flash, shake },
  say, toast, after, once, setDoor, grantSeal, saveCheckpoint, gateStable, refreshPickups, giveWeapon, switchWeapon, setHolster, damagePlayer,
  hasTimers: () => timers.length > 0,
  openDoc(d) { $('docK').textContent = d.k; $('docT').textContent = d.t; $('docB').textContent = d.b; push('doc'); },
  startGroup(id, spawn = true) { if (activeGroups.has(id) || G.S.groupsDone.includes(id)) return; activeGroups.set(id, { spawned: false }); if (spawn) X.spawnGroup(id); },
  spawnGroup(id) { const g = activeGroups.get(id); if (!g) return; enemies.spawnGroup(id, L.groups[id]); g.spawned = true; if (mission.onGroupStart) mission.onGroupStart(X, id); },
  npc(o) { const lv = building || L; const n = new NPC(lv.root, o); lv.npcs.push(n); return n; },
  unlockEco() { if (!store.campaign.flags.eco_unlocked) { store.campaign.flags.eco_unlocked = true; commit(store); } unlockEco(); },
  audio: { setTrack, setMusic, setAlarm },
  explodeBarrel,
  fallRecover(pos) { const p = P.body.pos; p.copy(pos); P.body.vel.set(0, 0, 0); P.hp = Math.max(1, P.hp - 10); G.S.stats.dmgTaken += 10; sfx.hurt(); flash(p.clone().setY(p.y + 1), 1, 0.3, 0x35e6ff); toast('Queda • reposicionado na última borda'); P.inputLock = 0.25; },
};

function loadMission(id) {
  if (mission && mission.id === id && L) return;
  enemies.clear();
  if (L) { L.dispose(); }
  disposePickupAssets();
  pickupMeshes = {}; drops = []; doorAnim = {};
  mission = MISSIONS[id]; G.mission = mission;
  L = mission.build(scene, X); improveMissionScenery(L,mission.id); G.level = L; L.npcs = L.npcs || [];
  for (const pk of L.pickups) { const m = makePickupMesh(pk.type); m.position.copy(pk.pos); pickupMeshes[pk.id] = m; }
  gate.group.position.copy(L.pts.gate); gate.group.rotation.y = L.pts.gateYaw || 0;
  if (L.pts.portal) portal.group.position.copy(L.pts.portal);
  scene.fog.color.set(L.fogColor ?? 0x0d1220); scene.fog.density = L.fogDensity ?? 0.011;
  hemi.intensity = L.hemi ?? 1.5; moon.intensity = L.moon ?? 1.2;
  renderer.compile(scene, camera);
}
function applyWorldState() {
  for (const b of L.barrels) { b.alive = !G.S.destroyed.includes(b.id); b.hp = b.maxHp; b.mesh.visible = b.alive; b.col.enabled = b.alive; }
  for (const d of drops) d.mesh.removeFromParent(); drops = [];
  for (const n of L.npcs) n.reset();
  portal.target = 0; portal.k = 0; sealFx.group.visible = false; gate.flare = 0;
  activeGroups = new Map(); exitSeq = null; deathT = 0; timers = []; talk.q.length = 0; talk.t = 0; $('sub').style.display = 'none';
  setAlarm(false); setMusic(true); setTrack(mission.ambientTrack || 0);
  mission.apply(X);
  refreshPickups();
  $('fade').style.opacity = 0;
}
function startMission(id, snap) {
  toast('', 0);
  loadMission(id);
  enemies.clear();
  if (snap) { G.S = JSON.parse(JSON.stringify(snap.S)); G.settings.difficulty = snap.difficulty || G.settings.difficulty; }
  else G.S = newS(mission);
  applyWorldState();
  const pl = snap ? { ...snap.player } : { ...L.pts.spawn, ...(mission.startLoadout ? mission.startLoadout(X) : {}) };
  if (snap && pl.weapons) { pl.hp = Math.max(pl.hp, 40); if (pl.weapons.martelo9.have && pl.weapons.martelo9.mag + pl.ammo.ammo9 < 30) pl.ammo.ammo9 = 30 - pl.weapons.martelo9.mag; }
  pl.ecoUnlocked = !!store.campaign.flags.eco_unlocked && !(mission.ecoLocked && mission.ecoLocked(X));
  resetPlayer(pl); G.time = 0;
  if (mission.afterReset) mission.afterReset(X);
  ui.mode = 'play'; ui.stack = []; renderUi(); requestLock();
  if (!snap) { saveCheckpoint('cp00'); mission.intro(X); }
  else { toast(`CHECKPOINT ${snap.checkpointId.toUpperCase()}`); if (mission.onResume) mission.onResume(X, snap); }
}

// ------------------------------------------------------------------ interações
let prompt = null;
G.hooks.hasPrompt = () => !!prompt;
function interactables() {
  const list = [];
  const add = (pos, text, use) => list.push({ pos, text, use });
  mission.interactables(X, add);
  add(L.pts.gate.clone().setY(L.pts.gate.y + 1.2), gateStable() ? 'Atravessar a Fenda de Saída' : 'Fenda de Saída instável', () => {
    if (!gateStable()) { toast(mission.gateHint(X)); sfx.empty(); return; }
    if (exitSeq || P.dead) return;                      // evento idempotente
    G.S.exitGateInteracted = true; exitSeq = { t: 0, phase: 0 }; P.inputLock = 99; sfx.gate(); say('ÍRIS-9', mission.exitLine);
  });
  return list;
}
function updateInteraction() {
  const p = P.body.pos; let best = null, bd = 2.5;
  for (const it of interactables()) { const d = Math.hypot(it.pos.x - p.x, (it.pos.y - (p.y + 1)) * 0.6, it.pos.z - p.z); if (d < bd) { bd = d; best = it; } }
  prompt = best;
  const use = $('touchInteract'); if (use) use.disabled = !best;
  const e = $('prompt');
  if (best && !P.dead && !exitSeq) { e.style.display = 'block'; const key = input.touchMode ? 'USAR' : input.usingPad ? 'X' : 'E'; if (e.dataset.t !== key + best.text) { e.dataset.t = key + best.text; e.innerHTML = `<kbd>${key}</kbd>${best.text}`; } } else e.style.display = 'none';
  if (best && !P.dead && !exitSeq && P.inputLock <= 0 && (hit('KeyE') || (input.pad && input.pad.hit.x))) best.use();
}
G.hooks.onEcoUsed = () => { if (mission.onEcoUsed) mission.onEcoUsed(X); };
G.hooks.toast = toast;
G.hooks.onDeath = () => { deathT = 0; G.S.stats.deaths++; };
G.hooks.hitMarker = (head, kill) => { const e = $('hitm'); e.style.color = kill ? '#ff3048' : head ? '#ffb030' : '#fff'; e.style.opacity = 1; e.style.transition = 'none'; requestAnimationFrame(() => { e.style.transition = 'opacity .25s'; e.style.opacity = 0; }); };
G.hooks.onEnemyKilled = (e) => {
  const drop = chooseEnemyDrop(e.type, P, resourceLimits());
  if (!drop) return;
  const pos = e.body.pos.clone();
  const ground = raycast(pos.x, pos.y + .25, pos.z, 0, -1, 0, 100, c => !c.noBody);
  pos.y = ground ? pos.y + .25 - ground.t + .35 : pos.y + .35;
  const mesh = makePickupMesh(drop.type); mesh.position.copy(pos);
  if (drops.length >= 24) drops.shift().mesh.removeFromParent();
  drops.push({ ...drop, pos, mesh });
};
G.hooks.onShootCollider = (c, dmg, point) => {
  if (c.barrel && dmg > 0) { const b = L.barrels.find((x) => x.id === c.barrel); if (b && b.alive) { b.hp -= dmg; if (b.hp <= 0) explodeBarrel(b); } }
  if (mission.onShootCollider) mission.onShootCollider(X, c, dmg, point);
};
function explodeBarrel(b) { b.alive = false; b.mesh.visible = false; b.col.enabled = false; G.S.destroyed.push(b.id); enemies.explode(b.pos, mission.barrelRadius ? mission.barrelRadius(b.id) : 5.5, 130); }

function collect(type, amount) {
  if (['ammo9', 'shells', 'medkit', 'armor'].includes(type)) {
    const gain = applyResourcePickup(P, type, amount, resourceLimits());
    if (!gain) return false;
    toast(`+${Math.ceil(gain)} ${PICKUPS[type].label}`, 1.3);
  }
  else if (type === 'pecas') { G.S.pecas += amount; toast(`+ ${amount} PEÇAS CRONAIS`, 1.6); }
  else if (type === 'weapon_trovao') { giveWeapon('trovao_duplo'); P.ammo.shells = Math.min(AMMO_CAP.shells, P.ammo.shells + 4); toast('TROVÃO DUPLO ADQUIRIDA • tecla 2', 2.6); say('GAEL', 'Dois canos, zero sutileza. Agora sim a noite ficou educada.'); }
  else return false;
  sfx.pickup(); return true;
}

// ------------------------------------------------------------------ simulação (60 Hz)
function tick(dt) {
  const S = G.S, p = P.body.pos;
  G.time += dt; S.stats.time += dt;
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const fn = timers[i].fn; timers.splice(i, 1); fn(); } }
  if (exitSeq) { runExit(dt); P.body.vel.set(0, 0, 0); }
  updatePlayer(dt, enemies);
  enemies.update(dt);
  if (P.dead) { deathT += dt; if (deathT > 1.4 && !ui.stack.includes('dead')) { const tips = mission.deathTips; $('deadTip').textContent = tips[Math.floor(Math.random() * tips.length)]; push('dead'); } return; }
  updateInteraction();
  for (const pk of L.pickups) { const m = pickupMeshes[pk.id]; if (!m.visible) continue; if (Math.hypot(pk.pos.x - p.x, pk.pos.z - p.z) < 0.95 && Math.abs(pk.pos.y - (p.y + 0.6)) < 1.3 && collect(pk.type, pk.amount)) { S.pickups.push(pk.id); m.visible = false; } }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; if (Math.hypot(d.pos.x - p.x, d.pos.z - p.z) < 0.95 && Math.abs(d.pos.y - (p.y + 0.6)) < 1.3 && collect(d.type, d.amount)) { d.mesh.removeFromParent(); drops.splice(i, 1); } }
  // encontros: gatilho por posição ou por evento da missão (X.startGroup)
  for (const id in L.groups) {
    const g = L.groups[id]; if (S.groupsDone.includes(id)) continue;
    const a = activeGroups.get(id);
    if (!a) { if (g.trigger && g.trigger(p, X)) X.startGroup(id); }
    else if (a.spawned && enemies.aliveInGroup(id) === 0) { activeGroups.delete(id); S.groupsDone.push(id); if (mission.onGroupDone) mission.onGroupDone(X, id); }
  }
  mission.tick(X, dt);
  setIntensity(enemies.activeAlive() > 0 ? 1 : 0);
}
function runExit(dt) {
  const q = exitSeq; q.t += dt;
  if (q.phase === 0) { gate.flare = Math.min(1, q.t / MX.gateInteractionSeconds) * 0.5; if (q.t >= MX.gateInteractionSeconds) { q.phase = 1; q.t = 0; $('fade').style.transition = `opacity ${MX.gateTransitionSeconds}s`; $('fade').style.opacity = 1; } }
  else if (q.phase === 1 && q.t >= MX.gateTransitionSeconds) {
    // transação: só confirma mission_complete depois de persistir (requiresSaveCommitBeforeMissionComplete)
    const S = G.S, prev = JSON.stringify(store), id = mission.id;
    const acc = S.stats.shots ? S.stats.hits / S.stats.shots : 0;
    const best = store.campaign.completed[id];
    store.campaign.completed[id] = { time: best ? Math.min(best.time, S.stats.time) : S.stats.time, seals: Math.max(best ? best.seals : 0, S.seals.length) };
    if (mission.next && !store.campaign.unlocked.includes(mission.next)) store.campaign.unlocked.push(mission.next);
    if (!store.campaign.rewardsGranted[id]) { store.campaign.rewardsGranted[id] = true; store.campaign.pecasCronais += S.pecas; }   // recompensa só uma vez
    if (mission.onComplete) mission.onComplete(X, store.campaign);
    store.checkpoint = null;
    if (commit(store)) { S.flags.mission_complete = true; exitSeq = null; showResults(acc); }
    else { store = JSON.parse(prev); S.exitGateInteracted = false; exitSeq = null; gate.flare = 0; P.inputLock = 0.3; $('fade').style.opacity = 0; toast('Falha ao gravar o progresso — a Fenda continua ativa. Tente de novo.', 4); }
  }
}
function showResults(acc) {
  const S = G.S, t = S.stats.time, mm = Math.floor(t / 60), ss = String(Math.floor(t % 60)).padStart(2, '0');
  const pts = (t < 16 * 60 ? 1 : 0) + (acc > 0.45 ? 1 : 0) + (S.stats.dmgTaken < 150 ? 1 : 0) + (S.secrets.length >= 2 ? 1 : 0) + (S.seals.length >= 3 ? 1 : 0);
  $('rKicker').textContent = `MISSÃO CONCLUÍDA • PROGRESSO SALVO`; $('rTitle').textContent = `${mission.id} — ${mission.name}`;
  $('rMedal').textContent = pts >= 4 ? '★ MEDALHA DE OURO' : pts >= 2 ? '★ MEDALHA DE PRATA' : '★ MEDALHA DE BRONZE';
  const st = [['TEMPO', `${mm}:${ss}`], ['PRECISÃO', `${Math.round(acc * 100)}%`], ['INIMIGOS', `${S.stats.kills}`], ['SELOS', `${S.seals.length}/${mission.sealsAvailable}`], ['SEGREDOS', `${S.secrets.length}/${mission.secretsTotal}`], ['QUEDAS', `${S.stats.deaths}`]];
  $('rStats').innerHTML = st.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  $('rText').textContent = `Dificuldade ${DIFF[G.settings.difficulty].name}. ${mission.resultsText(X)}`;
  const nx = mission.next && MISSIONS[mission.next]; $('bNext').style.display = nx ? '' : 'none'; if (nx) $('bNext').firstChild.textContent = `Próxima missão: ${nx.id} — ${nx.name}`;
  $('fade').style.transition = 'opacity .6s'; $('fade').style.opacity = 0; releaseLock(); ui.stack = ['results']; renderUi(); setAlarm(false);
}
function fillPause() {
  const req = mission.sealsRequired;
  $('pKicker').textContent = `${mission.id} • ${mission.name.toUpperCase()}`;
  $('pObj').textContent = mission.objective(X); $('pSeal').textContent = `${Math.min(G.S.seals.length, req)}/${req} obrigatórios${G.S.seals.length > req ? ' + 1 bônus' : ''}`;
  $('pSec').textContent = `${G.S.secrets.length}/${mission.secretsTotal}`; $('pCp').textContent = G.S.checkpointId.toUpperCase();
}
function restartCheckpoint() {
  const deaths = G.S.stats.deaths, time = G.S.stats.time;
  const snap = store.checkpoint; if (!snap || snap.missionId !== mission.id) { startMission(mission.id, null); return; }
  startMission(snap.missionId, snap); G.S.stats.deaths = deaths; G.S.stats.time = time;
}
function toMenu() { enemies.clear(); releaseLock(); setAlarm(false); setMusic(true); setTrack(0); ui.mode = 'menu'; ui.stack = []; refreshMenu(); renderUi(); setIntensity(0); }
function nextPlayable() { return ORDER.find((id) => store.campaign.unlocked.includes(id) && !store.campaign.completed[id]) || null; }
function refreshMenu() {
  store = loadAll(); store.campaign.flags = store.campaign.flags || {};
  const cp = store.checkpoint, np = nextPlayable();
  $('bCont').disabled = !cp && !np;
  $('contInfo').textContent = cp ? `${cp.missionId} • ${cp.checkpointId.toUpperCase()} • ${DIFF[cp.difficulty]?.name || ''}` : np ? `${np} — ${MISSIONS[np].name} (início)` : (store.campaign.completed['A1-M3'] ? 'Três missões concluídas — repita pelo menu Missões' : 'Nenhum checkpoint salvo');
  $('bMis').disabled = store.campaign.unlocked.length < 1;
  $('misList').innerHTML = ORDER.map((id) => { const m = MISSIONS[id], un = store.campaign.unlocked.includes(id), dn = store.campaign.completed[id];
    return `<button class="btn" data-mission="${id}" ${un ? '' : 'disabled'}>${id} — ${m.name}<small>${dn ? `Concluída • melhor tempo ${Math.floor(dn.time / 60)}:${String(Math.floor(dn.time % 60)).padStart(2, '0')} • selos ${dn.seals}/${m.sealsAvailable}` : un ? 'Disponível' : 'Bloqueada — conclua a missão anterior'}</small></button>`; }).join('') + `<button class="btn" data-back>Voltar</button>`;
  $('misList').querySelectorAll('[data-mission]').forEach((b) => b.addEventListener('click', () => { initAudio(); sfx.ui(); startMission(b.dataset.mission, null); }));
  $('misList').querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx.ui(); pop(); }));
}

// ------------------------------------------------------------------ por quadro
let hudCache = {};
const setTxt = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
const _wp = new THREE.Vector3();
function updateHud() {
  const S = G.S, req = mission.sealsRequired; setTxt('objT', mission.objective(X));
  const n = Math.min(S.seals.length, req); setTxt('sealN', `${n}/${req}`);
  if (hudCache.sealDots !== n + '/' + req) { hudCache.sealDots = n + '/' + req; const box = $('sealDots'); box.innerHTML = Array.from({ length: req }, (_, i) => `<i class="${i < n ? 'got' : ''}"></i>`).join(''); }
  setTxt('sector', mission.sectorNames[mission.sectorAt(P.body.pos)] || '');
  setTxt('hpN', String(Math.ceil(P.hp))); setTxt('arN', String(Math.ceil(P.armor)));
  $('hpB').style.width = P.hp + '%'; $('arB').style.width = P.armor + '%';
  $('vign').style.boxShadow = `inset 0 0 180px rgba(255,0,30,${P.hp < 35 ? 0.5 * (1 - P.hp / 35) + 0.1 : 0})`;
  if (P.current && !P.holster) { const w = WEAPONS[P.current]; setTxt('wN', w.name); setTxt('wM', String(P.weapons[P.current].mag)); setTxt('wA', '/ ' + P.ammo[w.ammo]); setTxt('wR', P.reloadT > 0 ? 'RECARREGANDO' : P.weapons[P.current].mag === 0 ? 'SEM MUNIÇÃO NO PENTE' : ''); $('weapon').style.visibility = 'visible'; }
  else { $('weapon').style.visibility = P.holster ? 'visible' : 'hidden'; if (P.holster) { setTxt('wN', 'ARMA NO COLDRE'); setTxt('wM', '—'); setTxt('wA', ''); setTxt('wR', ''); } }
  // Eco: demonstração (1 carga) ou permanente (2 cargas + recarga sequencial)
  const eco = P.eco; $('eco').style.display = eco.charges > 0 || eco.unlocked ? 'flex' : 'none';
  setTxt('ecoN', eco.unlocked ? `${'◆'.repeat(eco.charges)}${'◇'.repeat(CFG.eco.maxCharges - eco.charges)}` : '1 carga de demonstração');
  $('ecoR').style.width = eco.unlocked && eco.charges < CFG.eco.maxCharges ? (eco.recharge / CFG.eco.rechargeSecondsPerCharge) * 100 + '%' : '0%';
  setTxt('crouchTag', P.state === 'SLIDING' ? 'SLIDE' : P.crouch ? 'AGACHADO' : '');
  const w = P.current && !P.holster ? WEAPONS[P.current] : null, sp = w ? ((P.ads ? w.adsSpread : w.spread) + P.bloom + (P.speed > 4 ? 0.006 : 0)) : 0.01;
  const px = Math.max(5, sp / Math.tan(camera.fov * Math.PI / 360) * innerHeight / 2 + 4), show = w ? '' : 'none';
  const set = (id, l, t, ww, hh) => { const e = $(id).style; e.left = l + 'px'; e.top = t + 'px'; e.width = ww + 'px'; e.height = hh + 'px'; e.display = show; };
  set('c1', -1, -px - 7, 2, 7); set('c2', -1, px, 2, 7); set('c3', -px - 7, -1, 7, 2); set('c4', px, -1, 7, 2);
  const dm = $('dmg'); while (dm.children.length < P.hitDirs.length) dm.appendChild(document.createElement('i')); while (dm.children.length > P.hitDirs.length) dm.lastChild.remove();
  P.hitDirs.forEach((h, i) => { const rel = P.yaw - h.ang; dm.children[i].style.transform = `rotate(${rel}rad)`; dm.children[i].style.opacity = Math.min(1, h.t); });
  setTxt('hint', !input.locked && !input.freeLook && !input.usingPad ? 'CLIQUE NA TELA PARA CAPTURAR O MOUSE' : '');
  // marcador de objetivo (desligável em Opções); preso à borda quando fora da tela
  const wpE = $('wp'), tgt = G.settings.waypoint && !exitSeq && mission.waypoint ? mission.waypoint(X) : null;
  if (!tgt) wpE.style.display = 'none';
  else {
    _wp.copy(tgt).project(camera); let x = _wp.x, y = _wp.y; const behind = _wp.z > 1;
    if (behind) { x = -x; y = -y; }
    const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.86;
    if (off) { const k = Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.86, 1e-3); x /= k; y /= k; if (behind) y = Math.min(y, -0.6); }
    wpE.style.display = 'block'; wpE.style.left = ((x + 1) / 2) * innerWidth + 'px'; wpE.style.top = ((1 - y) / 2) * innerHeight + 'px';
    wpE.classList.toggle('edge', off); setTxt('wpD', Math.round(tgt.distanceTo(P.body.pos)) + ' m');
  }
}
function frameUpdate(dt, sim) {
  const t = performance.now() / 1000;
  for (const n in doorAnim) { const d = L.doors[n], ty = doorAnim[n] ? d.openH || 3.2 : 0; if (Math.abs(d.mesh.position.y - ty) > 0.01) d.mesh.position.y += Math.sign(ty - d.mesh.position.y) * Math.min(Math.abs(ty - d.mesh.position.y), dt * 3.2); }
  if (mission.frame) mission.frame(X, dt, t, sim);
  G.playerPos = P.body.pos;
  for (const n of L.npcs) n.update(sim || ui.mode !== 'play' ? dt : 0, camera.position);
  for (const pk of L.pickups) { const m = pickupMeshes[pk.id]; if (m.visible) { m.position.y = pk.pos.y + Math.sin(t * 2.5 + pk.pos.x) * 0.06; m.rotation.y += dt * 1.2; } }
  for (const d of drops) { d.mesh.rotation.y += dt * 1.2; d.mesh.position.y = d.pos.y + Math.sin(t * 2.5 + d.pos.x) * .06; }
  if (sealFx.life > 0) { sealFx.life -= dt; sealFx.group.position.y += dt * 0.5; sealFx.group.scale.setScalar(Math.min(1, sealFx.life)); if (sealFx.life <= 0) sealFx.group.visible = false; }
  gate.stable = ui.mode === 'play' && gateStable();
  if (ui.mode === 'play') {
    P.actor.update(sim ? dt : 0); enemies.frame(sim ? dt : 0); if (sim) updateCamera(dt);
    updateLights(L, P.body.pos, dt); moon.target.position.copy(P.body.pos); moon.position.set(P.body.pos.x + 30, P.body.pos.y + 60, P.body.pos.z - 25);
    if (L.rain) L.rain.update(sim ? dt : 0, camera.position, mission.outdoor(P.body.pos));
    updateHud();
  } else {
    if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
    const ref = mission.menuCam(t, camera); updateLights(L, ref, dt);
    if (L.rain) L.rain.update(dt, camera.position, true);
  }
  if (L.sky) L.sky.position.copy(camera.position);
  updateFx(sim || ui.mode !== 'play' ? dt : 0); updateTalk(sim || ui.mode !== 'play' ? dt : 0);
}
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, CFG.simulation.maxDeltaSecondsAfterTabReturn); last = now;
  if (document.hidden) { last = now; acc = 0; return; }
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
  click('bNew', () => push('newgame')); click('bOpt', () => { fillOptions(); push('options'); }); click('bCtl', () => push('controls')); click('bMis', () => { refreshMenu(); push('missions'); });
  click('bCont', () => { if (store.checkpoint) startMission(store.checkpoint.missionId || 'A1-M1', store.checkpoint); else { const np = nextPlayable(); if (np) startMission(np, null); } });
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx.ui(); pop(); }));
  document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => { initAudio(); G.settings.difficulty = b.dataset.diff; persistSettings(); startMission('A1-M1', null); }));
  click('bResume', () => { pop(); requestLock(); }); click('bRestart', restartCheckpoint); click('bPOpt', () => { fillOptions(); push('options'); }); click('bPCtl', () => push('controls')); click('bQuit', toMenu);
  click('bDocClose', pop); click('bRetry', restartCheckpoint); click('bDeadMenu', toMenu);
  click('bReplay', () => startMission(mission.id, null)); click('bResMenu', toMenu); click('bNext', () => { if (mission.next) startMission(mission.next, null); });
  canvas.addEventListener('mousedown', () => { initAudio(); if (simActive() && !input.locked) requestLock(); });
  const o = (id, key, fmt, apply) => { const e = $(id); e.addEventListener('input', () => { G.settings[key] = e.type === 'checkbox' ? e.checked : e.tagName === 'SELECT' ? e.value : parseFloat(e.value); if (fmt) $(id + 'v').textContent = fmt(G.settings[key]); if (apply) apply(); }); };
  o('oQ', 'quality', null, applyQuality); o('oF', 'fov', (v) => v + '°'); o('oS', 'sens', (v) => v.toFixed(2)); o('oI', 'invertY');
  o('oV', 'volume', (v) => Math.round(v * 100), () => { audio.volume = G.settings.volume; setVolumes(); }); o('oM', 'music', (v) => Math.round(v * 100), () => { audio.music = G.settings.music; setVolumes(); });
  o('oK', 'shake'); o('oH', 'hints'); o('oA', 'attenuate'); o('oW', 'waypoint');
}
function fillOptions() {
  const s = G.settings; $('oQ').value = s.quality; $('oF').value = s.fov; $('oFv').textContent = s.fov + '°'; $('oS').value = s.sens; $('oSv').textContent = s.sens.toFixed(2); $('oI').checked = s.invertY;
  $('oV').value = s.volume; $('oVv').textContent = Math.round(s.volume * 100); $('oM').value = s.music; $('oMv').textContent = Math.round(s.music * 100); $('oK').checked = s.shake; $('oH').checked = s.hints; $('oA').checked = s.attenuate; $('oW').checked = s.waypoint !== false;
}
async function boot() {
  applyQuality(); audio.volume = G.settings.volume; audio.music = G.settings.music;
  initFx(scene);
  await loadCharacters((k) => ($('bootP').style.width = 20 + k * 70 + '%'));
  createPlayer(scene); createEnemyPools(scene); initEnemyList();
  gate = makeGate(); scene.add(gate.group);
  portal = makePortal(); scene.add(portal.group);
  sealFx = makeSeal(); sealFx.group.visible = false; sealFx.life = 0; scene.add(sealFx.group);
  const cp = store.checkpoint;
  loadMission(cp && MISSIONS[cp.missionId] ? cp.missionId : 'A1-M1');
  G.S = newS(mission); applyWorldState(); resetPlayer({ ...L.pts.spawn });
  initInput(canvas, () => { if (simActive() && !input.freeLook) { fillPause(); push('pause'); } });
  touchControls = initTouch({ isPlaying: simActive, pause: back, switchWeapon: () => switchWeapon(P.current === 'martelo9' ? 'trovao_duplo' : 'martelo9') });
  addEventListener('blur', () => { if (simActive()) back(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && simActive()) back(); });
  $('bFullscreen').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); });
  bindUi(); $('bootP').style.width = '100%';
  ui.mode = 'menu'; refreshMenu(); renderUi();
  requestAnimationFrame(frame);
}
// ganchos de teste/QA (console): window.QNT
window.QNT = { G, P, updateCamera, enemies, ui, input, X, restartCheckpoint, get L() { return L; }, get mission() { return mission; }, get gate() { return gate; }, get store() { return store; }, startMission, loadMission, saveCheckpoint, grantSeal, gateStable, setSimulateSaveFailure, tick, back, objective: () => mission.objective(X), interactables, collect, get drops() { return drops; }, get pickupMeshes() { return pickupMeshes; } };
boot().catch((e) => { $('bootT').textContent = 'ERRO AO CARREGAR: ' + e.message; console.error(e); });
