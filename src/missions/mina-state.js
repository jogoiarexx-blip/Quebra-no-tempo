// A2-M2 — regras puras: tanques das perfuratrizes, desarme, ciclo dos vagões e perseguição.
export const TANK_HP = 40;
export const CART = { period: 7.5, travel: 3.2, warn: 1.6, x0: -19, x1: 19, z: 74 };
export const CHASE = { z0: 84, z1: 136.5, speed: 5.0, halfWidth: 3.1, front: 4.2, back: 2.6 };

export function newDrillState() { return { tanks: { A0: TANK_HP, A1: TANK_HP, B0: TANK_HP, B1: TANK_HP }, chaseZ: CHASE.z0, chaseT: 0 }; }
export function hitTank(S, id, dmg) {
  const t = S.mine.tanks; if (!(id in t) || t[id] <= 0 || dmg <= 0) return false;
  if (id[0] === 'B' && !S.flags.chase_done) return false;          // em movimento a perfuratriz B é blindada
  t[id] = Math.max(0, t[id] - dmg); return t[id] === 0;
}
export const tanksVented = (S, drill) => S.mine.tanks[drill + '0'] <= 0 && S.mine.tanks[drill + '1'] <= 0;
export function disarm(S, drill) {
  const k = 'drill_' + drill; if (S.flags[k] || !tanksVented(S, drill)) return false;
  S.flags[k] = true; S.flags.drills_disarmed = !!(S.flags.drill_A && S.flags.drill_B); return true;
}
// posição x do vagão no instante t (null = dentro do túnel); warn = luz vermelha acesa
export function cartAt(t) {
  const k = ((t % CART.period) + CART.period) % CART.period;
  const x = k < CART.travel ? CART.x0 + (CART.x1 - CART.x0) * (k / CART.travel) : null;
  const warn = k < CART.travel || k > CART.period - CART.warn;
  return { x, warn };
}
export function cartHits(t, p) { const c = cartAt(t); return c.x !== null && Math.abs(p.x - c.x) < 1.35 && Math.abs(p.z - CART.z) < 1.1 && p.y < 1.4; }
export function stepChase(S, dt) {
  const m = S.mine; if (!S.flags.chase_started || S.flags.chase_done) return false;
  m.chaseT += dt; m.chaseZ = Math.min(CHASE.z1, CHASE.z0 + m.chaseT * CHASE.speed);
  if (m.chaseZ >= CHASE.z1) { S.flags.chase_done = true; return true; }
  return false;
}
export function chaseHits(S, p) { const z = S.mine.chaseZ; return S.flags.chase_started && !S.flags.chase_done && Math.abs(p.x) < CHASE.halfWidth && p.z < z + CHASE.front && p.z > z - CHASE.back && p.y < 3; }
export function drain(S) { if (S.flags.reservoir_drained) return false; S.flags.reservoir_drained = true; return true; }
