// Inimigos do slice: E01 Saqueador Cronal, E02 Atirador de Telhado e drone de treino.
// Regras do GDD: telegraph antes de atirar, nunca atirar sem linha de visão, não ficar preso à cobertura.
import * as THREE from 'three';
import { G, diff } from './state.js';
import { moveBody, boxFree, raycast, lineOfSight, solidOnly } from './physics.js';
import { Actor, assets } from './characters.js';
import { P, damagePlayer } from './player.js';
import { sfx } from './audio.js';
import { sparks, flash, shake } from './fx.js';

const GRAV = 24;
const STATS = {
  E01: { hp: 65, dmg: 6, burst: 3, tele: 0.5, cd: [1.8, 2.8], boltSpeed: 34, spread: 0.05, speed: 4.3 },
  E02: { hp: 50, dmg: 24, burst: 1, tele: 1.15, cd: [2.0, 2.6], boltSpeed: 120, spread: 0.004, speed: 2.4 },
  DRONE: { hp: 45, dmg: 7, burst: 2, tele: 0.6, cd: [1.6, 2.4], boltSpeed: 28, spread: 0.03, speed: 5 },
};
const pool = { E01: [], E02: [], DRONE: [] };
const bolts = [];
const spawnQueue = [];
function flushSpawns(){for(let i=0;i<spawnQueue.length;){const q=spawnQueue[i],arr=pool[q.unit.type];const e=arr.find(x=>!x.active)||arr.filter(x=>!x.alive).sort((a,b)=>b.deadT-a.deadT)[0];if(!e){i++;continue;}e.deactivate();e.spawn(q.unit,q.group);spawnQueue.splice(i,1);}}
let scene, laser;
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

function makeDrone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshLambertMaterial({ color: 0x39404c })); body.scale.y = 0.6; g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 20), new THREE.MeshLambertMaterial({ color: 0x20242b })); ring.rotation.x = Math.PI / 2; g.add(ring);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3ad0 })); eye.position.z = 0.36; g.add(eye);
  return { root: g, eye, ring };
}

export function createEnemyPools(sc) {
  scene = sc;
  for (let i = 0; i < 4; i++) pool.E01.push(new Enemy('E01'));
  pool.E02.push(new Enemy('E02')); pool.DRONE.push(new Enemy('DRONE'));
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.7), new THREE.MeshBasicMaterial({ color: 0xff5a30 })); m.visible = false; scene.add(m);
    bolts.push({ m, alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), dmg: 0, life: 0 });
  }
  laser = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1), new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0.8 })); laser.visible = false; scene.add(laser);
}

class Enemy {
  constructor(type) {
    this.type = type; this.st = STATS[type];
    this.body = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), hw: 0.36, h: 1.8, grounded: true };
    if (type === 'DRONE') { this.drone = makeDrone(); this.root = this.drone.root; }
    else {
      this.actor = assets[type] ? new Actor(type, { scale: 1.8 / 1.7 })     // GLB próprio do inimigo (manifest.json)
        : new Actor('gael', { scale: type === 'E02' ? 1.0 : 1.03, outfit: type === 'E02' ? 'sniper' : 'merc', helmet: type === 'E02' ? 0xff2030 : 0xffb030, armor: type === 'E02' ? 0x4a3a66 : 0x3a4250 });
      this.root = this.actor.root;
      const gm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, type === 'E02' ? 0.9 : 0.5).translate(0, 0, type === 'E02' ? 0.35 : 0.2), new THREE.MeshLambertMaterial({ color: 0x15171b }));
      this.gun = gm; scene.add(gm); gm.visible = false;
    }
    this.root.visible = false; scene.add(this.root); this.active = false; this.alive = false;
  }
  spawn(def, group) {
    Object.assign(this, { active: true, alive: true, group, role: def.role, hp: this.st.hp * diff().hp, state: 'move', path: (def.path || []).map((q) => ({ x: q[0], z: q[1] })), pathI: 0,
      cd: 0.6 + Math.random() * 0.6, tele: 0, burstLeft: 0, burstT: 0, first: !!def.first, losT: 0, los: false, noLos: 0, lostT: 0, poise: 0, poiseT: 0, stagger: 0, hitReactT: 0, attackT: 0, limp: 0, deadT: 0, stuck: 0, side: 0, sideT: 0,
      shots: 0, strafeT: 3 + Math.random() * 3, facing: Math.PI, spawnT: def.portal ? 0.9 : 0, home: { x: def.x, z: def.z }, aimDir: new THREE.Vector3(), t: Math.random() * 10, knock: null, alt: def.alt || null, spawnY: def.y });
    this.body.pos.set(def.x, def.y, def.z); this.body.vel.set(0, 0, 0); this.body.grounded = true;
    this.root.visible = true; this.root.position.copy(this.body.pos);
    if (this.actor) { this.actor.play('Idle', 0); this.actor.model.rotation.set(0, 0, 0); this.actor.model.position.y = 0; this.gun.visible = true; this.actor.aimTarget = 0; }
    if (def.portal) flash(this.body.pos.clone().setY(def.y + 1), 1.4, 0.5, 0xff3ad0);
    if (!this.path.length) this.state = 'combat';
  }
  eye(out) { return out.copy(this.body.pos).setY(this.body.pos.y + (this.type === 'DRONE' ? 0 : 1.55)); }
  targetPos(out) { const d = P.eco.decoy; if (d) return out.copy(d.pos).setY(d.pos.y + 1.1); return out.copy(P.body.pos).setY(P.body.pos.y + 1.1); }
  damage(amount, part, dir) {
    if (!this.alive) return false;
    const mult = this.type === 'DRONE' ? 1 : part === 'head' ? 1.8 : part === 'leg' ? 0.75 : 1;
    const dmg = amount * mult; this.hp -= dmg; this.poise += dmg; this.poiseT = 1.5;
    if (part === 'leg' && this.type === 'E01') this.limp = 2.5;
    if ((this.poise >= 40 || part === 'head') && this.type !== 'DRONE' && this.stagger <= 0) { this.stagger = 0.45; this.poise = 0; this.state = 'combat'; this.tele = 0; this.burstLeft = 0; this.cd = Math.max(this.cd, 0.7); }
    this.noLos = 0; this.alerted = true;
    if(this.actor && this.hp>0){this.hitReactT=.38;this.actor.play('HitReaction',.06,1,{once:true,restart:true});}
    if (this.hp <= 0) { this.die(dir); return true; }
    return false;
  }
  die(dir) {
    this.alive = false; this.deadT = 0; this.state = 'dead'; G.S.stats.kills++;
    if (this.type === 'DRONE') { sparks(this.body.pos, 0x9fe8ff, 30, 6, 0.7); flash(this.body.pos, 1.2, 0.25, 0xff3ad0); sfx.explosion(); }
    if (this.actor) { this.actor.aimTarget = 0; this.actor.aimW = 0; this.actor.play('Death',.1,1,{once:true,restart:true}); }
    this.fallYaw = dir ? Math.atan2(dir.x, dir.z) : this.facing;
    G.hooks.onEnemyKilled(this);
  }
  update(dt) {
    if (!this.active) return;
    const b = this.body, p = b.pos, st = this.st; this.t += dt; this.hitReactT=Math.max(0,(this.hitReactT||0)-dt);this.attackT=Math.max(0,(this.attackT||0)-dt);
    if (!this.alive) {
      this.deadT += dt;
      if (this.type === 'DRONE') { b.vel.y -= GRAV * dt; p.y = Math.max(p.y + b.vel.y * dt, 0.3); this.root.position.copy(p); this.root.rotation.z += dt * 6; if (this.deadT > 2) this.deactivate(); return; }
      b.vel.x = b.vel.z = 0; b.vel.y -= GRAV * dt; moveBody(b, dt);
      this.actor.play('Death',.1,1,{once:true}); this.root.position.copy(p); this.actor.model.rotation.x = 0; this.actor.model.position.y = 0;
      this.gun.visible = false;
      if (this.deadT > 5) { this.root.position.y -= (this.deadT - 5) * 0.5; if (this.deadT > 6.5) this.deactivate(); }
      return;
    }
    if (this.spawnT > 0) { this.spawnT -= dt; this.root.position.copy(p); return; }
    const tp = this.targetPos(_v), ex = p.x, ey = p.y + (this.type === 'DRONE' ? 0 : 1.55), ez = p.z;
    const dx = tp.x - ex, dz = tp.z - ez, dist = Math.hypot(dx, dz);
    this.losT -= dt;
    if (this.losT <= 0) { this.losT = 0.12 + Math.random() * 0.06; this.los = dist < 60 && lineOfSight(ex, ey, ez, tp.x, tp.y, tp.z); }
    this.noLos = this.los ? 0 : this.noLos + dt;
    if (this.poiseT > 0) { this.poiseT -= dt; if (this.poiseT <= 0) this.poise = 0; }
    this.limp = Math.max(0, this.limp - dt);
    let mvx = 0, mvz = 0, wantFace = Math.atan2(dx, dz), speed = st.speed * (this.limp > 0 ? 0.45 : 1);

    if (this.stagger > 0) { this.stagger -= dt; if (this.knock) { b.vel.x = this.knock.x; b.vel.z = this.knock.z; b.vel.y -= GRAV * dt; moveBody(b, dt); this.knock.multiplyScalar(Math.pow(0.02, dt)); if (this.knock.lengthSq() < 0.1) this.knock = null; } else { b.vel.x = b.vel.z = 0; b.vel.y -= GRAV * dt; moveBody(b, dt); }
      this.root.position.copy(p); if (this.actor) { this.actor.play('HitReaction', .08,1,{once:true}); this.actor.aimTarget = 0; } }
    else if (this.type === 'DRONE') this.updateDrone(dt, tp, dist);
    else {
      // ----- movimento -----
      let goal = null;
      if (this.state === 'move') { goal = this.path[this.pathI]; if (!goal) this.state = 'combat'; }
      else if (this.state === 'advance') goal = this.advGoal;
      if (goal) {
        const gx = goal.x - p.x, gz = goal.z - p.z, gl = Math.hypot(gx, gz);
        if (gl < 0.5) { if (this.state === 'move') { this.pathI++; if (this.pathI >= this.path.length) this.state = 'combat'; } else this.state = 'combat'; }
        else { mvx = gx / gl; mvz = gz / gl; if (this.sideT > 0) { this.sideT -= dt; const sx = -mvz * this.side, sz = mvx * this.side; mvx = mvx * 0.3 + sx; mvz = mvz * 0.3 + sz; } wantFace = Math.atan2(mvx, mvz); }
      }
      // ----- combate -----
      if (this.state === 'combat' || (this.state === 'move' && this.los && dist < 14) || this.state === 'advance') {
        this.cd -= dt;
        if (this.cd <= 0 && this.los && dist < 55) { this.prevState = this.state === 'combat' ? 'combat' : this.state; this.state = 'aim'; this.tele = (this.first ? 0.5 : st.tele) + (G.settings.difficulty === 'turista' ? 0.2 : 0); this.first = false; if (this.type === 'E02') sfx.charge(); }
      }
      if (this.state === 'combat') {
        // não fica eternamente preso à cobertura: sem visão por 3 s, avança para um ponto com visão
        if (this.noLos > 3 && this.type === 'E01' && this.alerted !== false) {
          const gl = Math.max(1, dist), step = Math.min(5, Math.max(0, dist - 5));
          const gx = p.x + dx / gl * step, gz = p.z + dz / gl * step;
          if (step > 0.5 && !boxFree(gx, p.y + 0.5, gz, b.hw, b.h - 0.5)) { this.advGoal = { x: gx, z: gz }; this.state = 'advance'; this.noLos = 1.2; }
          else { this.advGoal = { x: p.x + (Math.random() - 0.5) * 6, z: p.z + (Math.random() - 0.5) * 6 }; this.state = 'advance'; this.noLos = 1.5; }
        }
        // flanqueador reposiciona lateralmente de tempos em tempos
        this.strafeT -= dt;
        if (this.role === 'flank' && this.strafeT <= 0 && this.los) {
          this.strafeT = 3.5 + Math.random() * 3; const s = Math.random() < 0.5 ? -1 : 1, gl = Math.max(1, dist);
          const gx = p.x - dz / gl * 3 * s, gz = p.z + dx / gl * 3 * s;
          if (!boxFree(gx, p.y + 0.5, gz, b.hw, b.h - 0.5)) { this.advGoal = { x: gx, z: gz }; this.state = 'advance'; }
        }
        if (this.type === 'E02' && this.shots >= 2 && this.alt) { this.shots = 0; const c = this.alt.reduce((b, q) => (Math.hypot(q[0] - p.x, q[1] - p.z) > Math.hypot(b[0] - p.x, b[1] - p.z) ? q : b)); this.advGoal = { x: c[0], z: c[1] }; this.state = 'advance'; }   // troca de cobertura entre pontos autorados
      }
      if (this.state === 'aim') {
        mvx = mvz = 0; this.tele -= dt;
        const lockT = this.type === 'E02' ? 0.28 : 0.12;
        if (this.tele > lockT || this.aimDir.lengthSq() === 0) { _d.set(tp.x + P.body.vel.x * 0.1 - ex, tp.y - ey + 0.1, tp.z + P.body.vel.z * 0.1 - ez).normalize(); this.aimDir.copy(_d); }
        if (this.visor) this.visor.scale.y = 1 + 2.5 * Math.abs(Math.sin(this.t * 22));
        if (!this.los && this.tele > lockT) { this.state = this.prevState || 'combat'; this.cd = 0.5; }          // perdeu visão: cancela
        else if (this.tele <= 0) { this.state = 'fire'; this.burstLeft = st.burst; this.burstT = 0; }
      } else if (this.visor) this.visor.scale.y = 1;
      if (this.state === 'fire') {
        mvx = mvz = 0; this.burstT -= dt;
        if (this.burstT <= 0) {
          this.muzzle(_a); spawnBolt(_a, this.aimDir, st, this.type); this.attackT=.24;this.actor.play('Attack',.04,1,{once:true,restart:true});this.burstLeft--; this.burstT = 0.16; this.shots++;
          if (this.type === 'E01') { _d.set(tp.x + P.body.vel.x * 0.1 - _a.x, tp.y - _a.y, tp.z + P.body.vel.z * 0.1 - _a.z).normalize(); this.aimDir.lerp(_d, 0.5).normalize(); }
          if (this.burstLeft <= 0) { this.state = this.prevState === 'move' ? 'move' : 'combat'; this.cd = st.cd[0] + Math.random() * (st.cd[1] - st.cd[0]); this.aimDir.set(0, 0, 0); }
        }
      }
      b.vel.x = mvx * speed; b.vel.z = mvz * speed; b.vel.y -= GRAV * dt;
      const before = p.x + p.z; const wall = moveBody(b, dt);
      if ((mvx || mvz) && (wall || Math.abs(p.x + p.z - before) < speed * dt * 0.2)) { this.stuck += dt; if (this.stuck > 0.35) { this.stuck = 0; this.side = Math.random() < 0.5 ? -1 : 1; this.sideT = 0.7; } } else this.stuck = Math.max(0, this.stuck - dt);
      if (p.y < this.spawnY - 6) this.die();
      // anti-softlock (GDD §9.3: "IA travada não bloqueia"): sem visão e quase parado por 15 s = foge da cena
      this.lostT = (!this.los && Math.hypot(b.vel.x, b.vel.z) * dt < 0.02 * dt + 0.01) ? (this.lostT || 0) + dt : Math.max(0, (this.lostT || 0) - dt * 2);
      if (this.lostT > 15 && (this.type !== 'E02' || dist > 45)) { this.alive = false; this.deactivate(); G.hooks.toast && G.hooks.toast('Um invasor recuou'); }          // caiu para fora do mapa (relativo ao ponto de spawn)
      // ----- visual -----
      let df = wantFace - this.facing; df = Math.atan2(Math.sin(df), Math.cos(df)); this.facing += df * Math.min(1, dt * 10);
      this.root.position.copy(p); this.root.rotation.y = this.facing;
      const moving = Math.hypot(b.vel.x, b.vel.z) > 0.4;
      if (this.hitReactT>0 || this.stagger>0) this.actor.play('HitReaction',.08,1,{once:true});
      else if (this.attackT>0) this.actor.play('Attack',.04,1,{once:true});
      else if (moving) {
        const fwd=(b.vel.x*Math.sin(this.facing)+b.vel.z*Math.cos(this.facing))/speed;
        const side=(b.vel.x*Math.cos(this.facing)-b.vel.z*Math.sin(this.facing))/speed;
        const name=fwd<-.45?'WalkBackward':Math.abs(side)>.7&&Math.abs(fwd)<.45?(side<0?'StrafeLeft':'StrafeRight'):speed>3?'Running':'Walking';
        this.actor.play(name,.15,speed>3?speed/5.6:speed/1.9);
      } else this.actor.play('RelaxedIdle',.2);
      const aiming = this.state === 'aim' || this.state === 'fire' || (this.los && !moving);
      this.actor.aimTarget = this.hitReactT>0||this.stagger>0?0:this.attackT>0?.45:aiming?1:0; this.actor.pitch = Math.atan2(tp.y - ey, Math.max(1, dist));
    }
  }
  updateDrone(dt, tp, dist) {
    const b = this.body, p = b.pos, st = this.st;
    const ang = this.t * 0.5, tx = P.body.pos.x + Math.sin(ang) * 8, tz = P.body.pos.z + Math.cos(ang) * 8, ty = P.body.pos.y + 3.6 + Math.sin(this.t * 1.7) * 0.4;
    _d.set(tx - p.x, ty - p.y, tz - p.z); const l = _d.length(); if (l > 0.1) _d.multiplyScalar(Math.min(st.speed, l * 2) / l);
    if (this.state === 'aim' || this.state === 'fire') _d.multiplyScalar(0.25);
    b.vel.lerp(_d, Math.min(1, dt * 3));
    const nx = p.x + b.vel.x * dt, ny = p.y + b.vel.y * dt, nz = p.z + b.vel.z * dt;
    if (!boxFree(nx, ny - 0.4, nz, 0.5, 0.8)) p.set(nx, ny, nz); else { b.vel.multiplyScalar(-0.3); this.t += 1.3; }
    this.cd -= dt;
    if (this.state !== 'aim' && this.state !== 'fire' && this.cd <= 0 && this.los) { this.state = 'aim'; this.tele = st.tele; sfx.charge(); }
    if (this.state === 'aim') { this.tele -= dt; this.drone.eye.scale.setScalar(1 + (1 - this.tele / st.tele) * 1.6); if (this.tele <= 0.12 && this.aimDir.lengthSq() === 0) this.aimDir.set(tp.x - p.x, tp.y - p.y, tp.z - p.z).normalize(); if (!this.los && this.tele > 0.15) { this.state = 'combat'; this.cd = 0.6; this.drone.eye.scale.setScalar(1); } else if (this.tele <= 0) { this.state = 'fire'; this.burstLeft = st.burst; this.burstT = 0; } }
    if (this.state === 'fire') { this.burstT -= dt; if (this.burstT <= 0) { spawnBolt(p, this.aimDir, st, 'DRONE'); this.burstLeft--; this.burstT = 0.2; if (this.burstLeft <= 0) { this.state = 'combat'; this.cd = st.cd[0] + Math.random(); this.aimDir.set(0, 0, 0); this.drone.eye.scale.setScalar(1); } } }
    this.root.position.copy(p); this.root.rotation.y = Math.atan2(tp.x - p.x, tp.z - p.z); this.drone.ring.rotation.z += dt * 9;
  }
  muzzle(out) { if (this.actor) { this.actor.handPos(out); out.addScaledVector(this.aimDir, 0.3); if (!lineOfSight(this.body.pos.x, this.body.pos.y + 1.5, this.body.pos.z, out.x, out.y, out.z)) this.eye(out); return out; } return out.copy(this.body.pos); }
  frame(dt) {   // por quadro de render: animação e arma na mão
    if (!this.active || !this.actor) return;
    this.actor.update(dt);
    if (this.gun.visible) { this.actor.handPos(_a); this.gun.position.copy(_a); const d = this.aimDir.lengthSq() > 0 ? this.aimDir : _b.set(Math.sin(this.facing), this.actor.aimW > 0.5 ? this.actor.pitch : -1.2, Math.cos(this.facing)).normalize(); this.gun.lookAt(_a.add(d)); }
  }
  deactivate() { this.active = false; this.root.visible = false; if (this.gun) this.gun.visible = false; }
}

function spawnBolt(from, dir, st, type) {
  const b = bolts.find((x) => !x.alive); if (!b) return;
  b.alive = true; b.pos.copy(from); b.life = 3; b.dmg = st.dmg; b.type = type;
  const a = Math.random() * 6.283, r = Math.random() * st.spread;
  b.vel.copy(dir); b.vel.x += Math.cos(a) * r; b.vel.y += Math.sin(a) * r * 0.6; b.vel.z += Math.sin(a) * r; b.vel.normalize().multiplyScalar(st.boltSpeed);
  b.m.material.color.set(type === 'E02' ? 0xff2030 : type === 'DRONE' ? 0xff3ad0 : 0xffa030); b.m.visible = true; b.m.scale.z = type === 'E02' ? 3 : 1;
  (type === 'E02' ? sfx.sniper : sfx.enemyShot)(); flash(from, 0.2, 0.05, 0xff8040);
}
function segBox(o, d, len, min, max) {   // segmento contra AABB
  let t0 = 0, t1 = len;
  for (let a = 0; a < 3; a++) {
    const oo = o.getComponent(a), dd = d.getComponent(a);
    if (Math.abs(dd) < 1e-9) { if (oo < min[a] || oo > max[a]) return -1; continue; }
    let ta = (min[a] - oo) / dd, tb = (max[a] - oo) / dd; if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1;
  }
  return t0;
}

export const enemies = {
  get list() { return [...pool.E01, ...pool.E02, ...pool.DRONE]; },
  all: null,
  spawnGroup(id, def) {
    for(const unit of def.units)spawnQueue.push({unit,group:id});
    flushSpawns();
  },
  aliveInGroup(id) { return this.all.filter(e=>e.active&&e.alive&&e.group===id).length+spawnQueue.filter(q=>q.group===id).length; },
  activeAlive() { return this.all.filter((e) => e.active && e.alive).length; },
  clear() { spawnQueue.length=0; for (const e of this.all) e.deactivate(); for (const b of bolts) { b.alive = false; b.m.visible = false; } laser.visible = false; },
  update(dt) {
    flushSpawns();
    for (const e of this.all) e.update(dt);
    // projéteis
    const pb = P.body, pmin = [pb.pos.x - 0.33, pb.pos.y + (P.state === 'ROLLING' ? 0 : 0.05), pb.pos.z - 0.33], pmax = [pb.pos.x + 0.33, pb.pos.y + (P.state === 'ROLLING' ? 1.0 : 1.78), pb.pos.z + 0.33];
    for (const b of bolts) {
      if (!b.alive) continue;
      const sp = b.vel.length(), step = sp * dt; _d.copy(b.vel).multiplyScalar(1 / sp);
      let t = step, hitWall = null; const hc = raycast(b.pos.x, b.pos.y, b.pos.z, _d.x, _d.y, _d.z, step, solidOnly); if (hc) { t = hc.t; hitWall = hc.c; }
      const tp = P.dead ? -1 : segBox(b.pos, _d, t, pmin, pmax);
      if (tp >= 0) { if (damagePlayer(b.dmg, _a.copy(b.pos).addScaledVector(_d, -3))) sparks(_a.copy(b.pos).addScaledVector(_d, tp), 0xff4030, 6, 3, 0.3); b.alive = false; b.m.visible = false; continue; }
      b.pos.addScaledVector(_d, t); b.life -= dt;
      if (hitWall || b.life <= 0) { if (hitWall) { sparks(b.pos, 0xffa040, 4, 2.5, 0.25); G.hooks.onShootCollider(hitWall, 0, b.pos, true); } b.alive = false; b.m.visible = false; continue; }
      b.m.position.copy(b.pos); b.m.lookAt(_a.copy(b.pos).add(_d));
    }
    // laser do atirador (telegraph)
    const sn = pool.E02[0]; laser.visible = false;
    if (sn.active && sn.alive && sn.state === 'aim' && sn.aimDir.lengthSq() > 0) {
      sn.eye(_a); const hc = raycast(_a.x, _a.y, _a.z, sn.aimDir.x, sn.aimDir.y, sn.aimDir.z, 80, solidOnly); const len = hc ? hc.t : 80;
      laser.visible = true; laser.position.copy(_a).addScaledVector(sn.aimDir, len / 2); laser.lookAt(_b.copy(_a).addScaledVector(sn.aimDir, len)); laser.scale.set(1 + (sn.tele < 0.3 ? 2 : 0), 1 + (sn.tele < 0.3 ? 2 : 0), len);
    }
  },
  frame(dt) { for (const e of this.all) e.frame(dt); },
  rayHit(o, d, maxT) {
    let best = null;
    for (const e of this.all) {
      if (!e.active || !e.alive || e.spawnT > 0) continue;
      const p = e.body.pos;
      if (e.type === 'DRONE') {
        _a.copy(p).sub(o); const tca = _a.dot(d); if (tca < 0) continue; const d2 = _a.lengthSq() - tca * tca; if (d2 > 0.36) continue;
        const t = tca - Math.sqrt(0.36 - d2); if (t < maxT && (!best || t < best.t)) best = { enemy: e, t, part: 'body' };
        continue;
      }
      // cabeça (esfera) primeiro, depois corpo (AABB)
      _a.set(p.x, p.y + 1.66, p.z).sub(o); const tca = _a.dot(d); let th = -1;
      if (tca > 0) { const d2 = _a.lengthSq() - tca * tca; if (d2 < 0.04) th = tca - Math.sqrt(0.04 - d2); }
      const tb = segBox(o, d, maxT, [p.x - 0.34, p.y, p.z - 0.34], [p.x + 0.34, p.y + 1.55, p.z + 0.34]);
      let t = -1, part = 'torso';
      if (th >= 0 && (tb < 0 || th <= tb + 0.25)) { t = th; part = 'head'; }
      else if (tb >= 0) { t = tb; const hy = o.y + d.y * tb - p.y; part = hy < 0.72 ? 'leg' : 'torso'; }
      if (t >= 0 && t < maxT && (!best || t < best.t)) best = { enemy: e, t, part };
    }
    return best;
  },
  explode(pos, radius, dmg) {
    for (const e of this.all) { if (!e.active || !e.alive) continue; const d = e.body.pos.distanceTo(pos); if (d < radius && lineOfSight(pos.x, pos.y + 0.3, pos.z, e.body.pos.x, e.body.pos.y + 1, e.body.pos.z)) { e.damage(dmg * (1 - d / radius * 0.6), 'torso', _d.copy(e.body.pos).sub(pos).normalize()); e.stagger = Math.max(e.stagger, 0.9); } }
    const dp = P.body.pos.distanceTo(pos); if (dp < radius) damagePlayer(40 * (1 - dp / radius), pos);
    sparks(pos, 0xffa030, 60, 9, 0.8); flash(pos, radius * 0.8, 0.35, 0xffb040); sfx.explosion(); shake(0.5 * Math.max(0, 1 - dp / 25));
  },
};
export function initEnemyList() { enemies.all = [...pool.E01, ...pool.E02, ...pool.DRONE]; }
