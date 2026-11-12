// Física simples e determinística: caixas alinhadas aos eixos (AABB).
// Personagens são caixas verticais; mover = varredura por eixo + deslize + degrau.
export const colliders = [];

export function addCollider(x0, x1, y0, y1, z0, z1, extra = {}) {
  const c = { min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], enabled: true, ...extra };
  colliders.push(c);
  return c;
}
export function clearColliders() { colliders.length = 0; }

export function boxFree(x, y, z, hw, h, ignore) {
  const eps = 1e-4;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.enabled || c === ignore || c.noBody) continue;
    if (x + hw > c.min[0] + eps && x - hw < c.max[0] - eps && y + h > c.min[1] + eps && y < c.max[1] - eps && z + hw > c.min[2] + eps && z - hw < c.max[2] - eps) return c;
  }
  return null;
}

const STEP = 0.45;
// body: {pos:{x,y,z}, vel:{x,y,z}, hw, h, grounded}
export function moveBody(b, dt) {
  const p = b.pos, v = b.vel;
  let hitWall = false;
  const wasGrounded = b.grounded;
  // horizontal: X depois Z, com tentativa de subir degrau
  for (const ax of ['x', 'z']) {
    const d = v[ax] * dt;
    if (d === 0) continue;
    const nx = ax === 'x' ? p.x + d : p.x, nz = ax === 'z' ? p.z + d : p.z;
    const hit = boxFree(nx, p.y, nz, b.hw, b.h);
    if (!hit) { p.x = nx; p.z = nz; continue; }
    const top = hit.max[1];
    if ((wasGrounded || b.stepAir) && top - p.y <= STEP && top - p.y > 0 && !boxFree(nx, top + 0.001, nz, b.hw, b.h)) {
      p.x = nx; p.z = nz; p.y = top + 0.001; continue;
    }
    // encosta na face
    if (ax === 'x') p.x = d > 0 ? hit.min[0] - b.hw - 1e-3 : hit.max[0] + b.hw + 1e-3;
    else p.z = d > 0 ? hit.min[2] - b.hw - 1e-3 : hit.max[2] + b.hw + 1e-3;
    if (boxFree(p.x, p.y, p.z, b.hw, b.h)) { // segurança: desfaz
      if (ax === 'x') p.x = nx - d; else p.z = nz - d;
    }
    b.lastWall = hit; hitWall = true; v[ax] = 0;
  }
  // vertical
  b.grounded = false;
  const dy = v.y * dt;
  const hit = boxFree(p.x, p.y + dy, p.z, b.hw, b.h);
  if (!hit) p.y += dy;
  else {
    if (dy <= 0) { p.y = hit.max[1] + 0.001; b.grounded = true; b.ground = hit; }
    else p.y = hit.min[1] - b.h - 0.001;
    v.y = 0;
  }
  if (!b.grounded && wasGrounded && v.y <= 0) { // cola em descidas de degrau
    const h2 = boxFree(p.x, p.y - STEP, p.z, b.hw, b.h);
    if (h2 && h2.max[1] <= p.y + 1e-3 && p.y - h2.max[1] <= STEP && !b.noSnap) { p.y = h2.max[1] + 0.001; b.grounded = true; b.ground = h2; v.y = 0; }
  }
  return hitWall;
}

// Raio contra AABBs. Retorna {t, c, nx,ny,nz} ou null.
export function raycast(ox, oy, oz, dx, dy, dz, maxT, filter) {
  let best = null, bt = maxT;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.enabled || (filter && !filter(c))) continue;
    let t0 = 0, t1 = bt, axis = -1, sign = 0, ok = true;
    for (let a = 0; a < 3; a++) {
      const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz;
      if (Math.abs(d) < 1e-9) { if (o < c.min[a] || o > c.max[a]) { ok = false; break; } continue; }
      let ta = (c.min[a] - o) / d, tb = (c.max[a] - o) / d, s = -1;
      if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; s = 1; }
      if (ta > t0) { t0 = ta; axis = a; sign = s; }
      if (tb < t1) t1 = tb;
      if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 < bt && axis >= 0) { bt = t0; best = { t: t0, c, nx: axis === 0 ? sign : 0, ny: axis === 1 ? sign : 0, nz: axis === 2 ? sign : 0 }; }
  }
  return best;
}
export const solidOnly = (c) => !c.seeThrough;   // tiros/visão ignoram grades
export function lineOfSight(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return true;
  return !raycast(ax, ay, az, dx / len, dy / len, dz / len, len - 0.05, solidOnly);
}
