// A2-M4 — regras puras (serializáveis e testáveis em Node) do Marechal Ferrugem e dos canhões de muralha.
// Fase 1: duelista blindado (canhão a vapor, pisão). Fase 2: exoesqueleto de vapor (correntes, jatos; a arena enche de vapor).
// Fase 3: dois acumuladores protegem o motor; destruídos, começa o duelo curto.
// Apresentação (malha, avisos, dano ao jogador) fica em ferrugem-view.js e a2m4.js.
export const ARENA = { x0: -22, x1: 22, z0: 118, z1: 170, bossZ: 160, hw: 22 };
export const FERRUGEM = { hp: 1200, phaseHp: 400, windowCap: 130, accumHp: 100, valveCd: 12, windowTime: 6 };
export const SHELL = { warn: 1.7, cd: 7, damage: 20, radius: 3.5 };

export function createFerrugem() {
  return { active: false, hp: FERRUGEM.hp, maxHp: FERRUGEM.hp, phase: 1, mode: 'idle', timer: 0, cycle: 0, x: 0, z: ARENA.bossZ, target: null, pattern: 'cannon', windowDamage: 0, valveCooldown: [0, 0], attackId: 0, accum: [FERRUGEM.accumHp, FERRUGEM.accumHp], duel: false, steam: false };
}
export function startFerrugem(b) { if (b.active || b.mode === 'dead') return false; b.active = true; b.mode = 'warning'; b.timer = 1.8; b.target = null; return true; }
// Abre a válvula lateral: a armadura solta vapor e as juntas ficam expostas por alguns segundos.
export function exposeFerrugem(b, source) {
  if (!b.active || ['dead', 'transition', 'exposed', 'attack'].includes(b.mode) || b.duel) return false;
  if (b.phase === 3) return false;   // na fase 3 só os acumuladores importam
  if (source !== 'valve0' && source !== 'valve1') return false;
  const i = Number(source.at(-1)); if (b.valveCooldown[i] > 0) return false;
  b.valveCooldown[i] = FERRUGEM.valveCd; b.mode = 'exposed'; b.timer = FERRUGEM.windowTime; b.windowDamage = 0; return true;
}
// Acerto numa parte: 'joint' (juntas), 'accum0'/'accum1' (acumuladores). Devolve dano efetivo (0 = bloqueado).
export function hitFerrugem(b, part, damage) {
  if (!b.active || !Number.isFinite(damage) || damage <= 0 || b.mode === 'dead' || b.mode === 'transition') return 0;
  if (part === 'accum0' || part === 'accum1') {
    if (b.phase !== 3 || b.duel) return 0;
    const i = Number(part.at(-1)); if (b.accum[i] <= 0) return 0;
    const d = Math.min(damage, b.accum[i]); b.accum[i] -= d;
    if (b.accum[0] <= 0 && b.accum[1] <= 0) { b.duel = true; b.mode = 'stagger'; b.timer = 2.2; b.target = null; b.windowDamage = 0; }
    return d;
  }
  if (part !== 'joint') return 0;
  const exposed = b.mode === 'exposed' || b.duel;
  if (!exposed) return 0;
  const floor = Math.max(0, FERRUGEM.hp - b.phase * FERRUGEM.phaseHp);
  const room = b.duel ? Infinity : FERRUGEM.windowCap - b.windowDamage;
  const hit = Math.min(damage, room, b.hp - floor); if (hit <= 0) return 0;
  b.hp -= hit; b.windowDamage += hit;
  if (b.hp <= 0) { b.hp = 0; b.mode = 'dead'; b.active = false; b.timer = 0; }
  else if (b.hp <= floor && !b.duel) { b.phase++; b.mode = 'transition'; b.timer = 2.8; b.target = null; if (b.phase >= 2) b.steam = true; if (b.phase === 3) b.accum = [FERRUGEM.accumHp, FERRUGEM.accumHp]; }
  return hit;
}
const clamp = (v, a, c) => Math.max(a, Math.min(c, v));
export function patternsFor(b) { return b.duel ? ['cannon', 'chain', 'stomp', 'vent'] : b.phase === 1 ? ['cannon', 'stomp'] : b.phase === 2 ? ['cannon', 'chain', 'stomp', 'vent'] : ['vent', 'cannon', 'chain']; }
function aim(b, p) {
  const list = patternsFor(b); b.pattern = list[b.cycle % list.length];
  b.target = { x: clamp(p.x, ARENA.x0 + 1, ARENA.x1 - 1), y: p.y >= 2.5 ? 3 : 0, z: clamp(p.z, ARENA.z0 + 2, ARENA.z1 - 6) };
}
function warnTime(b) { return (b.duel ? 1.15 : b.phase === 1 ? 1.8 : b.phase === 2 ? 1.6 : 1.4); }
export function stepFerrugem(b, dt, target) {
  if (!b.active || !Number.isFinite(dt) || dt <= 0) return [];
  dt = Math.min(dt, .1); const events = [];
  b.valveCooldown = b.valveCooldown.map((t) => Math.max(0, t - dt));
  if (b.mode === 'warning' && !b.target) aim(b, target);
  if (b.mode === 'reposition') { const goal = b.cycle % 2 ? 8 : -8; b.x += Math.max(-dt * 3.2, Math.min(dt * 3.2, goal - b.x)); }
  b.timer -= dt; if (b.timer > 0) return events;
  if (b.mode === 'warning') {
    b.mode = 'attack'; b.timer = .45; b.attackId++;
    const t = b.target, ev = { kind: 'attack', pattern: b.pattern, id: b.attackId, x: t.x, y: t.y, z: t.z, damage: 22, radius: SHELL.radius };
    if (b.pattern === 'stomp') { ev.x = b.x; ev.z = b.z; ev.y = 0; ev.radius = 9; ev.damage = 24; }
    else if (b.pattern === 'chain') { ev.damage = 22; ev.radius = 1.5; }
    else if (b.pattern === 'vent') { ev.damage = 18; ev.radius = 4.2; ev.spots = [[t.x, t.z], [clamp(t.x - 11, ARENA.x0 + 2, ARENA.x1 - 2), t.z], [clamp(t.x + 11, ARENA.x0 + 2, ARENA.x1 - 2), t.z]]; }
    else ev.damage = 26;
    b.fire = ev; events.push(ev);
  } else if (b.mode === 'attack') { b.mode = 'recover'; b.timer = b.duel ? .8 : 1.5; }
  else if (b.mode === 'exposed') { b.mode = 'recover'; b.timer = 1.2; }
  else if (b.mode === 'stagger') { b.mode = 'reposition'; b.timer = .8; events.push({ kind: 'duel' }); }
  else if (b.mode === 'transition') { b.mode = 'reposition'; b.timer = 1.6; events.push({ kind: 'phase', phase: b.phase }); }
  else if (b.mode === 'recover') { b.mode = 'reposition'; b.timer = b.duel ? .6 : 1.4; }
  else if (b.mode === 'reposition') { b.cycle++; b.mode = 'warning'; b.timer = warnTime(b); b.target = null; aim(b, target); }
  return events;
}
// O ataque acerta o jogador? Pisão e correntes são baixos: pular (y acima do chão do ataque) desvia.
export function attackHits(a, p) {
  const dy = p.y - a.y;
  if (a.pattern === 'stomp') return dy < .75 && Math.hypot(p.x - a.x, p.z - a.z) < a.radius;
  if (a.pattern === 'chain') return dy < .8 && dy > -1.8 && Math.abs(p.z - a.z) < a.radius && p.x > ARENA.x0 && p.x < ARENA.x1;
  if (Math.abs(dy) > 1.8) return false;
  if (a.pattern === 'vent') return a.spots.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < a.radius);
  return Math.hypot(p.x - a.x, p.z - a.z) < a.radius;
}

// ---------- canhões de muralha (aproximação): avisam, depois disparam ----------
export function createFort() { return { off: [false, false], cd: [3, 5], warn: [0, 0] }; }
export function disableCannon(F, i) { if (F.off[i]) return false; F.off[i] = true; F.warn[i] = 0; return true; }
// target: posição do jogador; active: está na zona de tiro. Devolve eventos {kind:'shell',i,x,z}
export function stepFort(F, dt, p, active) {
  const ev = []; if (!active) { for (let i = 0; i < 2; i++) F.warn[i] = 0; return ev; }
  dt = Math.min(dt, .1);
  for (let i = 0; i < 2; i++) {
    if (F.off[i]) continue;
    if (F.warn[i] > 0) { F.warn[i] -= dt; if (F.warn[i] <= 0) { F.cd[i] = SHELL.cd; ev.push({ kind: 'shell', i, x: F.aim?.[i]?.x ?? p.x, z: F.aim?.[i]?.z ?? p.z, damage: SHELL.damage, radius: SHELL.radius }); } }
    else { F.cd[i] -= dt; if (F.cd[i] <= 0) { F.warn[i] = SHELL.warn; (F.aim ||= [null, null])[i] = { x: p.x, z: p.z }; ev.push({ kind: 'warn', i, x: p.x, z: p.z }); } }
  }
  return ev;
}
export function shellHits(e, p) { return Math.abs(p.y) < 2.5 && Math.hypot(p.x - e.x, p.z - e.z) < e.radius; }
