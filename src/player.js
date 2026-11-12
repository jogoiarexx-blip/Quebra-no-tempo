// Gael: controlador de cápsula (AABB), câmera sobre o ombro, armas e Eco Cronal.
import * as THREE from 'three';
import { G, CFG, diff } from './state.js';
import { input, down, hit } from './input.js';
import { moveBody, boxFree, raycast, solidOnly } from './physics.js';
import { Actor } from './characters.js';
import { sfx } from './audio.js';
import { sparks, tracer, flash, shake } from './fx.js';
import { sectorAt } from './level.js';

const GRAV = 24, JUMP_V = Math.sqrt(2 * GRAV * 1.25);
export const WEAPONS = {
  martelo9: { name: 'MARTELO-9', dmg: 24, rate: 4, mag: 15, reload: 1.25, pellets: 1, spread: 0.012, adsSpread: 0.003, kick: 0.012, ammo: 'ammo9', range: 90, auto: true },
  trovao_duplo: { name: 'TROVÃO DUPLO', dmg: 10, rate: 0.75 * 2, mag: 2, reload: 1.7, pellets: 10, spread: 0.075, adsSpread: 0.055, kick: 0.05, ammo: 'shells', range: 28, auto: false },
};
export const AMMO_CAP = { ammo9: 135, shells: 24 };

export const P = {
  body: { pos: new THREE.Vector3(), vel: new THREE.Vector3(), hw: 0.35, h: 1.8, grounded: true },
  yaw: 0, pitch: 0, facing: 0, shoulder: 1, camDist: 3, hp: 100, armor: 0, state: 'GROUNDED', ads: false,
  weapons: { martelo9: { have: false, mag: 15 }, trovao_duplo: { have: false, mag: 2 } }, ammo: { ammo9: 0, shells: 0 }, current: null,
  fireCd: 0, reloadT: 0, lastFire: 9, bloom: 0, coyote: 0, jumpBuf: 0, rollT: 0, rollCd: 0, rollDir: new THREE.Vector3(), iframe: 0,
  mantle: null, stepT: 0, inputLock: 0, dead: false, deadT: 0, speed: 0,
  eco: { buf: [], acc: 0, charges: 0, lastUse: -9, trail: [], teaser: false },
  aimPoint: new THREE.Vector3(), muzzle: new THREE.Vector3(), camPos: new THREE.Vector3(), fwd: new THREE.Vector3(),
  hitDirs: [],
};
let actor, gun, guns = {}, spin, ghostPool = [];
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qd = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

export function createPlayer(scene) {
  actor = new Actor('gael', { scale: 1.78 / 1.70 });
  spin = new THREE.Group(); spin.position.y = 0.75; actor.model.position.y = -0.75; actor.root.remove(actor.model); spin.add(actor.model); actor.root.add(spin);
  scene.add(actor.root);
  const dark = new THREE.MeshLambertMaterial({ color: 0x23262c }), steel = new THREE.MeshLambertMaterial({ color: 0x8a9099 }), wood = new THREE.MeshLambertMaterial({ color: 0x6b4526 });
  const pistol = new THREE.Group();
  pistol.add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.3).translate(0, 0.02, 0.13), steel), new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.06).translate(0, -0.06, 0.0), dark));
  const shot = new THREE.Group();
  shot.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.62).translate(-0.02, 0.03, 0.3), steel), new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.62).translate(0.02, 0.03, 0.3), steel), new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.34).translate(0, -0.02, -0.12), wood));
  guns = { martelo9: pistol, trovao_duplo: shot };
  gun = new THREE.Group(); gun.add(pistol, shot); pistol.visible = shot.visible = false; scene.add(gun);
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); ghostPool.push(m); }
  P.actor = actor;
  return actor;
}

export function resetPlayer(snap) {
  P.body.pos.set(snap.x, snap.y, snap.z); P.body.vel.set(0, 0, 0); P.yaw = P.facing = snap.yaw || 0; P.pitch = -0.05;
  P.hp = snap.hp ?? CFG.player.maxHealth; P.armor = snap.armor ?? 0; P.dead = false; P.deadT = 0; P.state = 'GROUNDED';
  P.weapons = JSON.parse(JSON.stringify(snap.weapons || { martelo9: { have: false, mag: 15 }, trovao_duplo: { have: false, mag: 2 } }));
  P.ammo = { ...(snap.ammo || { ammo9: 0, shells: 0 }) }; P.current = snap.current || null;
  P.reloadT = 0; P.fireCd = 0; P.rollT = 0; P.mantle = null; P.iframe = 0; P.bloom = 0; P.inputLock = 0.3;
  P.eco.buf.length = 0; P.eco.charges = 0; P.eco.teaser = false; P.hitDirs.length = 0; P.ads = false;
  actor.root.rotation.set(0, P.facing, 0); spin.rotation.set(0, 0, 0); actor.model.rotation.set(0, 0, 0);
  actor.play('Idle', 0); P.camDist = 3;
  showGun();
}
function showGun() { for (const k in guns) guns[k].visible = P.current === k; }
export function giveWeapon(id) { const w = P.weapons[id]; if (!w.have) { w.have = true; w.mag = WEAPONS[id].mag; } P.current = id; showGun(); }
export function switchWeapon(id) { if (P.weapons[id] && P.weapons[id].have && P.current !== id) { P.current = id; P.reloadT = 0; P.fireCd = 0.25; showGun(); sfx.reload(); } }

export function damagePlayer(amount, from) {
  if (P.dead || P.iframe > 0) return false;
  amount *= diff().dmg;
  const ab = Math.min(P.armor, amount * CFG.player.armorAbsorptionFraction);
  P.armor -= ab; P.hp -= amount - ab; G.S.stats.dmgTaken += amount;
  sfx.hurt(); shake(0.12);
  if (from) { const a = Math.atan2(from.x - P.body.pos.x, from.z - P.body.pos.z); P.hitDirs.push({ ang: a, t: 1.2 }); }
  if (P.hp <= 0) { P.hp = 0; P.dead = true; P.deadT = 0; sfx.death(); G.hooks.onDeath(); }
  return true;
}

function tryMantle(dirX, dirZ) {
  const p = P.body.pos;
  const c = boxFree(p.x + dirX * 0.35, p.y + 0.3, p.z + dirZ * 0.35, P.body.hw, P.body.h - 0.3);
  if (!c || c.glass || c.barrel || c.noGrab) return false;
  const top = c.max[1], rel = top - p.y;
  if (rel < 0.46 || rel > 2.2) return false;
  const tx = p.x + dirX * 0.85, tz = p.z + dirZ * 0.85;
  if (boxFree(tx, top + 0.01, tz, P.body.hw, P.body.h)) return false;
  if (boxFree(p.x, p.y + 0.05, p.z, P.body.hw, rel + P.body.h)) return false;   // teto acima
  P.mantle = { t: 0, dur: 0.22 + rel * 0.12, from: p.clone(), to: new THREE.Vector3(tx, top + 0.01, tz) };
  P.state = 'MANTLING'; P.body.vel.set(0, 0, 0); sfx.jump();
  return true;
}

export function useEco() {
  const e = P.eco;
  if (e.charges <= 0 || G.time - e.lastUse < CFG.eco.minimumActivationGapSeconds || P.dead) return false;
  const sec = sectorAt(P.body.pos);
  // destino: amostra válida mais antiga da janela de 3 s, mesmo setor, espaço livre
  let dest = null;
  for (const s of e.buf) {
    if (!s.valid || s.sector !== sec) continue;
    if (boxFree(s.x, s.y + 0.02, s.z, P.body.hw, P.body.h)) continue;
    if (Math.hypot(s.x - P.body.pos.x, s.y - P.body.pos.y, s.z - P.body.pos.z) < 1.5) continue;
    dest = s; break;
  }
  if (!dest) { G.hooks.toast('ECO CRONAL: nenhum ponto seguro — carga preservada'); sfx.empty(); return false; }   // invalidDestinationConsumesCharge=false
  // rastro luminoso que distrai inimigos
  const from = P.body.pos.clone(); let gi = 0;
  for (let k = 0; k < ghostPool.length; k++) { const m = ghostPool[k]; m.position.lerpVectors(from, _v.set(dest.x, dest.y, dest.z), k / (ghostPool.length - 1)); m.position.y += 0.9; m.visible = true; m.userData.t = 1.5; gi++; }
  e.decoy = { pos: from.clone(), t: 1.5 };
  P.body.pos.set(dest.x, dest.y + 0.02, dest.z); P.body.vel.set(0, 0, 0); P.yaw = dest.yaw; P.facing = dest.yaw;
  e.charges--; e.lastUse = G.time; e.buf.length = 0; sfx.eco(); flash(P.body.pos.clone().setY(P.body.pos.y + 1), 1.2, 0.3, 0x35e6ff);
  G.hooks.onEcoUsed();
  return true;
}

function fire(enemies) {
  const w = WEAPONS[P.current], st = P.weapons[P.current];
  if (st.mag <= 0) { sfx.empty(); P.fireCd = 0.25; if (P.ammo[w.ammo] > 0) startReload(); return; }
  st.mag--; P.fireCd = 1 / w.rate; P.lastFire = 0; G.S.stats.shots++;
  (P.current === 'martelo9' ? sfx.pistol : sfx.shotgun)();
  const spread = (P.ads ? w.adsSpread : w.spread) + P.bloom + (P.speed > 4 ? 0.006 : 0) + (P.body.grounded ? 0 : 0.02);
  flash(P.muzzle, P.current === 'martelo9' ? 0.16 : 0.3, 0.05);
  let anyHit = false, head = false, killed = false;
  for (let i = 0; i < w.pellets; i++) {
    // 1) raio de mira a partir da câmera
    _v.copy(P.fwd); const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * spread;
    _v2.set(Math.cos(a) * r, Math.sin(a) * r, 0).applyQuaternion(G.camera.quaternion); _v.add(_v2).normalize();
    const o = P.camPos.clone().addScaledVector(P.fwd, P.camDist + 0.2);
    let tAim = w.range + P.camDist; const hc = raycast(o.x, o.y, o.z, _v.x, _v.y, _v.z, tAim, solidOnly); if (hc) tAim = hc.t;
    const he = enemies.rayHit(o, _v, tAim); if (he) tAim = he.t;
    const aim = o.clone().addScaledVector(_v, tAim);
    // 2) validação pela boca da arma: o tiro real sai do cano em direção ao ponto mirado
    const d = aim.clone().sub(P.muzzle); const len = d.length(); d.normalize();
    let t = Math.min(w.range, len + 0.6), what = null;
    const mc = raycast(P.muzzle.x, P.muzzle.y, P.muzzle.z, d.x, d.y, d.z, t, solidOnly); if (mc) { t = mc.t; what = { c: mc.c, n: mc }; }
    const me = enemies.rayHit(P.muzzle, d, t); if (me) { t = me.t; what = { e: me }; }
    const end = P.muzzle.clone().addScaledVector(d, t);
    tracer(P.muzzle, end);
    if (what && what.e) {
      const res = what.e.enemy.damage(w.dmg, what.e.part, d); anyHit = true; head = head || what.e.part === 'head'; killed = killed || res;
      sparks(end, what.e.enemy.type === 'DRONE' ? 0x9fe8ff : 0xff5030, 5, 3, 0.3);
    } else if (what && what.c) { sparks(end, 0xffd9a0, 4, 3, 0.25); G.hooks.onShootCollider(what.c, w.dmg, end); }
  }
  if (anyHit) { G.S.stats.hits++; G.hooks.hitMarker(head, killed); (killed ? sfx.kill : head ? sfx.head : sfx.hit)(); }
  P.pitch += w.kick * (P.ads ? 0.6 : 1); P.bloom = Math.min(0.03, P.bloom + 0.008); shake(P.current === 'martelo9' ? 0.02 : 0.08);
  if (st.mag <= 0 && P.ammo[w.ammo] > 0) startReload();
}
function startReload() {
  const w = WEAPONS[P.current], st = P.weapons[P.current];
  if (P.reloadT > 0 || st.mag >= w.mag || P.ammo[w.ammo] <= 0) return;
  P.reloadT = w.reload; sfx.reload();
}

export function updatePlayer(dt, enemies) {
  const b = P.body, p = b.pos, v = b.vel, pad = input.pad;
  P.inputLock = Math.max(0, P.inputLock - dt); P.iframe = Math.max(0, P.iframe - dt); P.rollCd = Math.max(0, P.rollCd - dt);
  P.fireCd = Math.max(0, P.fireCd - dt); P.lastFire += dt; P.bloom = Math.max(0, P.bloom - dt * 0.05);
  for (const h of P.hitDirs) h.t -= dt; while (P.hitDirs.length && P.hitDirs[0].t <= 0) P.hitDirs.shift();
  for (const m of ghostPool) if (m.visible) { m.userData.t -= dt; m.material.opacity = 0.6 * Math.max(0, m.userData.t / 1.5); if (m.userData.t <= 0) m.visible = false; }
  if (P.eco.decoy) { P.eco.decoy.t -= dt; if (P.eco.decoy.t <= 0) P.eco.decoy = null; }

  if (P.dead) {
    P.deadT += dt; v.x = v.z = 0; v.y -= GRAV * dt; moveBody(b, dt); actor.root.position.copy(p);
    actor.play('Fall', 0.2); actor.aimTarget = 0; spin.rotation.x = -Math.min(1, P.deadT / 0.5) * 1.45; spin.position.y = 0.75 - Math.min(1, P.deadT / 0.5) * 0.45;
    return;
  }
  // ---------- olhar ----------
  const sens = 0.0022 * G.settings.sens * (P.ads ? 0.7 : 1);
  P.yaw -= input.mouseDX * sens; P.pitch -= input.mouseDY * sens * (G.settings.invertY ? -1 : 1);
  if (pad) { P.yaw -= pad.rx * 2.6 * dt * G.settings.sens * (P.ads ? 0.6 : 1); P.pitch -= pad.ry * 1.8 * dt * G.settings.sens * (G.settings.invertY ? -1 : 1); }
  P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch));
  // ---------- intenção de movimento ----------
  let ix = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0), iz = (down('KeyW') ? 1 : 0) - (down('KeyS') ? 1 : 0);
  if (pad && (pad.lx || pad.ly)) { ix = pad.lx; iz = -pad.ly; }
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), rx = -fz, rz = fx;
  let wx = fx * iz + rx * ix, wz = fz * iz + rz * ix;
  const armed = !!P.current, locked = P.inputLock > 0;
  P.ads = armed && !locked && (input.rmb || (pad && pad.lt)) && P.state !== 'ROLLING' && P.state !== 'MANTLING';
  const sprint = (down('ShiftLeft') || down('ShiftRight') || (pad && pad.l3)) && iz > 0.5 && !P.ads && b.grounded;
  const maxSp = P.ads ? 3.2 : sprint ? CFG.player.sprintMps : (down('CapsLock') ? CFG.player.walkMps : CFG.player.runMps);
  const jumpHit = hit('Space') || (pad && pad.hit.a), jumpHeld = down('Space') || (pad && pad.a);
  if (jumpHit) P.jumpBuf = CFG.player.jumpBufferMs / 1000; else P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  P.coyote = b.grounded ? CFG.player.jumpCoyoteMs / 1000 : Math.max(0, P.coyote - dt);

  if (P.state === 'MANTLING') {
    const m = P.mantle; m.t += dt; const k = Math.min(1, m.t / m.dur);
    const up = Math.min(1, k / 0.65), fw = Math.max(0, (k - 0.5) / 0.5);
    p.set(m.from.x + (m.to.x - m.from.x) * fw, m.from.y + (m.to.y - m.from.y) * up, m.from.z + (m.to.z - m.from.z) * fw);
    if (k >= 1) { P.state = 'GROUNDED'; P.mantle = null; b.grounded = true; v.set(0, 0, 0); }
  } else if (P.state === 'ROLLING') {
    P.rollT += dt; v.x = P.rollDir.x * 5.6; v.z = P.rollDir.z * 5.6; v.y -= GRAV * dt; moveBody(b, dt);
    if (P.rollT >= 0.5) { P.state = 'GROUNDED'; P.rollCd = 0.3; }
  } else {
    // rolamento (Alt/Ctrl/B): ~2,8 m em 0,5 s, com janela de invulnerabilidade
    if ((hit('AltLeft') || hit('ControlLeft') || hit('KeyC') || (pad && pad.hit.bb)) && b.grounded && P.rollCd <= 0 && !locked) {
      if (il > 0.1) P.rollDir.set(wx, 0, wz).normalize(); else P.rollDir.set(Math.sin(P.facing), 0, Math.cos(P.facing));
      P.state = 'ROLLING'; P.rollT = 0; P.iframe = diff().iframe + 0.05; P.reloadT = 0; P.facing = Math.atan2(P.rollDir.x, P.rollDir.z); sfx.roll();
    }
    const acc = b.grounded ? 48 : 48 * 0.4, tx = wx * maxSp, tz = wz * maxSp;
    const dvx = tx - v.x, dvz = tz - v.z, dl = Math.hypot(dvx, dvz), stepv = acc * dt;
    if (dl <= stepv) { v.x = tx; v.z = tz; } else { v.x += dvx / dl * stepv; v.z += dvz / dl * stepv; }
    if (P.jumpBuf > 0 && P.coyote > 0 && !locked) { v.y = JUMP_V; P.jumpBuf = 0; P.coyote = 0; b.grounded = false; sfx.jump(); }
    if (!jumpHeld && v.y > 3.2 && !b.grounded) v.y = 3.2;        // salto variável
    v.y -= GRAV * dt; if (v.y < -30) v.y = -30;
    const wasG = b.grounded, vy = v.y;
    const wall = moveBody(b, dt);
    if (b.grounded && !wasG && vy < -6) sfx.land();
    // agarrar borda / subir (autograb moderado)
    if (!b.grounded && il > 0.3 && v.y < 5.5 && (wall || jumpHeld)) tryMantle(wx / il, wz / il);
    if (sprint && P.reloadT > 0) P.reloadT = 0;                  // sprint cancela recarga
    P.state = b.grounded ? 'GROUNDED' : (P.state === 'MANTLING' ? 'MANTLING' : 'AIRBORNE');
  }
  P.speed = Math.hypot(v.x, v.z);
  if (b.grounded && P.speed > 2) { P.stepT -= dt * P.speed; if (P.stepT <= 0) { P.stepT = 2.3; sfx.step(); } }

  // ---------- armas ----------
  if (hit('Digit1')) switchWeapon('martelo9'); if (hit('Digit2')) switchWeapon('trovao_duplo');
  if (input.wheel || (pad && (pad.hit.left || pad.hit.right || pad.hit.y))) switchWeapon(P.current === 'martelo9' ? 'trovao_duplo' : 'martelo9');
  if (hit('KeyV') || (pad && pad.hit.down)) P.shoulder *= -1;
  if (armed) {
    const w = WEAPONS[P.current], st = P.weapons[P.current];
    if ((hit('KeyR') || (pad && pad.hit.x && !G.hooks.hasPrompt())) && P.state !== 'ROLLING') startReload();
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { const need = w.mag - st.mag, take = Math.min(need, P.ammo[w.ammo]); st.mag += take; P.ammo[w.ammo] -= take; } }
    const trig = w.auto ? (input.lmb || (pad && pad.rt)) : (hit('Mouse0') || (pad && pad.hit.rt));
    if (trig && !locked && P.fireCd <= 0 && P.reloadT <= 0 && P.state !== 'ROLLING' && P.state !== 'MANTLING' && !(sprint && P.current === 'trovao_duplo')) fire(enemies);
  }
  if ((hit('KeyQ') || (pad && pad.hit.lb)) && !locked) useEco();

  // ---------- Eco Cronal: ring buffer de 60 amostras a 20 Hz ----------
  const e = P.eco; e.acc += dt;
  while (e.acc >= 1 / CFG.eco.sampleHz) {
    e.acc -= 1 / CFG.eco.sampleHz;
    e.buf.push({ x: p.x, y: p.y, z: p.z, yaw: P.yaw, sector: sectorAt(p), valid: b.grounded && P.state === 'GROUNDED', t: G.time });
    if (e.buf.length > CFG.eco.maxSamples) e.buf.shift();
  }

  // ---------- orientação e animação ----------
  const combat = armed && (P.ads || P.lastFire < 1.4);
  let tf = P.facing;
  if (P.state === 'ROLLING') tf = Math.atan2(P.rollDir.x, P.rollDir.z); else if (combat) tf = P.yaw; else if (P.speed > 0.5) tf = Math.atan2(v.x, v.z);
  let df = tf - P.facing; df = Math.atan2(Math.sin(df), Math.cos(df)); P.facing += df * Math.min(1, dt * (combat ? 22 : 12));
  actor.root.position.copy(p); actor.root.rotation.y = P.facing;
  spin.rotation.x = 0; spin.position.y = 0.75;
  if (P.state === 'ROLLING') { actor.play('Crouch', 0.06); spin.rotation.x = (P.rollT / 0.5) * Math.PI * 2; spin.position.y = 0.55; }
  else if (P.state === 'MANTLING') actor.play('Crouch', 0.1);
  else if (!b.grounded) actor.play('Fall', 0.12);
  else if (P.speed < 0.4) actor.play('Idle', 0.18);
  else if (P.speed < 3.9) actor.play('Walking', 0.15, Math.max(0.6, P.speed / 1.9));
  else actor.play('Running', 0.12, P.speed / 5.6);
  actor.aimTarget = combat && P.state !== 'ROLLING' && P.state !== 'MANTLING' ? 1 : 0; actor.pitch = P.pitch;
}

// Câmera sobre o ombro com colisão; também calcula ponto de mira e posição do cano.
export function updateCamera(dt, renderAlpha) {
  const cam = G.camera, p = P.body.pos;
  const cp = Math.cos(P.pitch), fwd = P.fwd.set(Math.sin(P.yaw) * cp, Math.sin(P.pitch), Math.cos(P.yaw) * cp);
  const rx = -Math.cos(P.yaw), rz = Math.sin(P.yaw);
  const headY = p.y + 1.55;
  let side = 0.62 * P.shoulder;
  const sh = raycast(p.x, headY, p.z, rx * P.shoulder, 0, rz * P.shoulder, 0.62 + 0.25, (c) => !c.barrel); if (sh) side = Math.max(0, sh.t - 0.25) * P.shoulder;
  const px = p.x + rx * side, pz = p.z + rz * side;
  const range = CFG.camera.shoulderDistanceRangeMeters;
  let want = P.ads ? 1.55 : (range[0] + range[1]) / 2;
  const hc = raycast(px, headY, pz, -fwd.x, -fwd.y, -fwd.z, want + 0.3, (c) => !c.barrel && !c.seeThrough); if (hc) want = Math.max(0.35, hc.t - 0.3);
  P.camDist = want < P.camDist ? want : P.camDist + (want - P.camDist) * Math.min(1, dt * 6);
  P.camPos.set(px - fwd.x * P.camDist, headY - fwd.y * P.camDist + 0.12, pz - fwd.z * P.camDist);
  cam.position.copy(P.camPos);
  if (G.shake > 0.001) { cam.position.x += (Math.random() - 0.5) * G.shake; cam.position.y += (Math.random() - 0.5) * G.shake; G.shake *= Math.pow(0.002, dt); }
  _e.set(P.pitch, P.yaw + Math.PI, 0); cam.quaternion.setFromEuler(_e);
  const tfov = G.settings.fov * (P.ads ? 0.78 : 1);
  if (Math.abs(cam.fov - tfov) > 0.05) { cam.fov += (tfov - cam.fov) * Math.min(1, dt * 12); cam.updateProjectionMatrix(); }
  // personagem some se a câmera encostar nele
  actor.model.visible = P.camDist > 0.7;
  // arma na mão + cano
  if (P.current) {
    actor.handPos(_v);
    const aimQ = _q.setFromEuler(_e.set(-P.pitch, P.yaw, 0)), downQ = _qd.setFromEuler(_e.set(1.25, P.facing, 0));
    gun.quaternion.copy(downQ).slerp(aimQ, actor.aimW); gun.position.copy(_v);
    gun.visible = actor.model.visible;
    P.muzzle.set(p.x + rx * 0.2, p.y + 1.42, p.z + rz * 0.2).addScaledVector(fwd, 0.55);
    if (actor.aimW > 0.8) { P.muzzle.copy(_v).addScaledVector(fwd, 0.32); }
    // se o cano estiver dentro de parede, recua para o peito
    if (boxFree(P.muzzle.x, P.muzzle.y - 0.05, P.muzzle.z, 0.04, 0.1)) P.muzzle.set(p.x, p.y + 1.42, p.z);
  } else gun.visible = false;
}
