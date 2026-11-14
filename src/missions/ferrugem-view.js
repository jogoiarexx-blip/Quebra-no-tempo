// Marechal Ferrugem — exoesqueleto de vapor procedural (original). Malhas agrupadas por material, colisores com bossPart.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCollider } from '../physics.js';
import { ARENA } from './ferrugem-state.js';
import { canvasTex } from '../world.js';

export function buildFerrugem(L) {
  const root = new THREE.Group(); root.name = 'Marechal_Ferrugem'; L.root.add(root); const M = L.M, Z = ARENA.bossZ;
  function component(name, x, y, z, draw) {
    const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); root.add(g); const bins = new Map();
    const part = (geo, mat, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => { geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(px, py, pz); if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(geo); };
    const box = (mat, w, h, d, px = 0, py = 0, pz = 0, rz = 0) => part(new THREE.BoxGeometry(w, h, d), mat, px, py, pz, 0, 0, rz);
    draw(part, box);
    for (const [mat, geos] of bins) { const m = new THREE.Mesh(mergeGeometries(geos), mat); geos.forEach((q) => q.dispose()); m.castShadow = true; g.add(m); }
    return g;
  }
  const cyl = (r, h, s = 10) => new THREE.CylinderGeometry(r, r, h, s);
  const torso = component('tronco', 0, 0, 0, (part, box) => {
    box(M.iron, 5.2, 3.2, 3.4, 0, 5.2, 0); box(M.rust, 5.6, .6, 3.8, 0, 7, 0); box(M.brass, 4.4, .25, 3.6, 0, 3.55, 0);
    for (const s of [-1, 1]) { box(M.rust, 1.3, 1.5, 1.8, s * 3.2, 6.6, 0); part(cyl(.55, 1.6, 12), M.brass, s * 3.2, 7.9, .2); part(cyl(.18, 2.4, 6), M.iron, s * 3.2, 9.2, .2); }
    box(M.iron, 2.2, 1.5, 2.0, 0, 7.9, -.1); box(M.dark, 1.7, .45, .2, 0, 8.05, -1.18); box(M.neonRed, 1.4, .1, .22, 0, 8.1, -1.22);   // visor
    part(new THREE.ConeGeometry(1.3, .7, 4), M.brass, 0, 8.9, -.1, 0, Math.PI / 4);                                                      // quepe de marechal
    for (let i = 0; i < 6; i++) box(M.brass, .18, .18, .1, -1.3 + i * .52, 6.1, -1.75);                                                  // botões
    box(M.dark, 3.6, 2.3, .4, 0, 5.2, 1.9); part(cyl(.5, 3, 10), M.iron, -1.1, 5, 2.4); part(cyl(.5, 3, 10), M.iron, 1.1, 5, 2.4);       // mochila de caldeira
  });
  const legs = [-1, 1].map((s) => component('perna_' + s, s * 1.7, 0, .1, (part, box) => {
    box(M.iron, 1.2, 3.4, 1.3, 0, 1.9, 0); box(M.rust, 2.0, .6, 2.8, 0, .3, -.5); box(M.brass, 1.4, .2, 1.4, 0, 3.4, 0);
    part(cyl(.3, 1.2, 8), M.brass, 0, 1.6, -.75, 0, 0, Math.PI / 2);
  }));
  const cannon = component('canhao_vapor', -3.4, 5.9, -1.2, (part, box) => {
    box(M.rust, 1.5, 1.5, 2.0); part(cyl(.5, 3.2, 12), M.iron, 0, 0, -2.2, Math.PI / 2); part(new THREE.TorusGeometry(.62, .12, 6, 14), M.brass, 0, 0, -3.6); box(M.neonAmber, .4, .4, .3, 0, .85, 0.2);
  });
  const fist = component('punho_correntes', 3.4, 5.4, -1.2, (part, box) => {
    box(M.iron, 1.5, 1.6, 1.7); part(new THREE.SphereGeometry(.85, 8, 6), M.rust, 0, -.9, -.7);
    for (let i = 0; i < 4; i++) part(new THREE.TorusGeometry(.28, .08, 5, 8), M.dark, 0, -1.6 - i * .45, -.7, i % 2 ? Math.PI / 2 : 0);
  });
  const plates = [-1, 1].map((s) => component('placa_' + s, s * 1.25, 5.2, -1.85, (part, box) => { box(M.iron, 2.2, 3.0, .35); box(M.hazard, 2.22, .3, .38, 0, -.8, 0); }));
  const joint = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), new THREE.MeshBasicMaterial({ color: 0xd64b2a })); joint.position.set(0, 5.2, -1.95); root.add(joint);
  const accums = [-1, 1].map((s) => component('acumulador_' + s, s * 3.1, 3.6, -1.9, (part, box) => {
    part(cyl(.85, 2.6, 14), M.brass, 0, 0, 0); part(new THREE.TorusGeometry(.9, .1, 6, 14), M.iron, 0, .8, 0, Math.PI / 2); part(new THREE.TorusGeometry(.9, .1, 6, 14), M.iron, 0, -.8, 0, Math.PI / 2);
    box(M.dark, .16, 1.6, .16, s * .5, 0, -.8); box(M.neonAmber, .5, .22, .2, 0, 1.15, -.65);
  }));
  const accumMat = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: 0xff9e43 }));
  accums.forEach((g, i) => { const lamp = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), accumMat[i]); lamp.position.set(0, 0, -.95); g.add(lamp); });
  // colisores (relativos ao Marechal; o sync desloca por b.x/b.z)
  const parts = [
    { part: 'joint', min: [-1.0, 4.3, -2.7], max: [1.0, 6.1, -1.7], noBody: true },
    { part: 'armor', min: [-2.8, 0, -1.7], max: [2.8, 8.5, 2.4] },
    ...[-1, 1].map((s, i) => ({ part: 'accum' + i, min: [s * 3.1 - .9, 2.2, -2.9], max: [s * 3.1 + .9, 5.0, -1.0], noBody: true })),
  ];
  for (const p of parts) p.col = addCollider(p.min[0], p.max[0], p.min[1], p.max[1], p.min[2] + Z, p.max[2] + Z, { bossPart: p.part, noBody: !!p.noBody, noGrab: true });
  // avisos no piso
  const marker = new THREE.Group(); L.root.add(marker);
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xffb53f, transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false });
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.5, 32), warnMat); m.rotation.x = -Math.PI / 2; marker.add(m); return m; });
  const disks = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(3.5, 32), warnMat); m.rotation.x = -Math.PI / 2; marker.add(m); return m; });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.hw * 2, 3), warnMat); band.rotation.x = -Math.PI / 2; marker.add(band);
  const stompRing = new THREE.Mesh(new THREE.RingGeometry(8.5, 9, 48), warnMat); stompRing.rotation.x = -Math.PI / 2; marker.add(stompRing);
  const impact = L.mesh(new THREE.ConeGeometry(1.5, 5, 8), new THREE.MeshBasicMaterial({ color: 0xff5432, transparent: true, opacity: .65, wireframe: true }), 0, 2, 140); impact.visible = false;
  // vapor (fase 2+): nuvem baixa de partículas
  const N = 160, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() * 2 - 1) * ARENA.hw; pos[i * 3 + 1] = Math.random() * 3.2; pos[i * 3 + 2] = ARENA.z0 + 4 + Math.random() * (ARENA.z1 - ARENA.z0 - 8); }
  const steamGeo = new THREE.BufferGeometry(); steamGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const steam = new THREE.Points(steamGeo, new THREE.PointsMaterial({ color: 0xe8e4dc, map: canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); if (g) { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); } c.fillStyle = g || '#fff'; c.fillRect(0, 0, 64, 64); }, false), size: 4.2, transparent: true, opacity: .16, depthWrite: false })); steam.visible = false; steam.frustumCulled = false; L.root.add(steam);

  function sync(b) {
    for (const p of parts) { p.col.enabled = b.mode !== 'dead' && !(p.part.startsWith('accum') && b.accum[Number(p.part.at(-1))] <= 0); p.col.min = [p.min[0] + b.x, p.min[1], p.min[2] + b.z]; p.col.max = [p.max[0] + b.x, p.max[1], p.max[2] + b.z]; }
    root.position.set(b.x, 0, b.z - Z + Z);
  }
  function frame(b, dt, t) {
    sync(b); const dead = b.mode === 'dead', open = b.mode === 'exposed' || b.duel || dead;
    torso.rotation.x = dead ? -.4 : Math.sin(t * 1.3) * .015;
    legs.forEach((g, i) => { g.rotation.x = dead ? 0 : b.mode === 'reposition' ? Math.sin(t * 6 + i * Math.PI) * .14 : (b.mode === 'attack' && b.pattern === 'stomp' && i === 0) ? -.5 : 0; });
    cannon.rotation.x = b.mode === 'warning' && b.pattern === 'cannon' ? -.5 : b.mode === 'attack' ? -.1 : 0;
    fist.rotation.x = b.mode === 'warning' && b.pattern === 'chain' ? -1.2 : b.mode === 'attack' && b.pattern === 'chain' ? .4 : 0;
    plates.forEach((g, i) => { g.position.x = (i ? 1 : -1) * (open ? 2.3 : 1.25); });
    joint.material.color.setHex(dead ? 0x314452 : open ? 0x5effcf : 0xd64b2a); joint.scale.setScalar(open ? 1 + .08 * Math.sin(t * 8) : .85);
    accums.forEach((g, i) => { const alive = b.accum[i] > 0; g.visible = alive || b.phase < 3; g.scale.setScalar(alive ? 1 + (b.phase === 3 ? .04 * Math.sin(t * 6 + i) : 0) : .01); accumMat[i].color.setHex(b.phase === 3 && alive ? 0xff6a2a : 0x6a5a40); });
    root.position.y = dead ? -1.8 : 0;
    marker.visible = b.mode === 'warning' || b.mode === 'attack';
    const pat = b.pattern, t0 = b.target, hot = b.mode === 'attack';
    warnMat.color.setHex(hot ? 0xff3c35 : 0xffbd4a); warnMat.opacity = hot ? .65 : .22 + .14 * Math.sin(t * 12);
    for (let i = 0; i < 3; i++) { const on = (pat === 'cannon' && i === 0) || pat === 'vent'; rings[i].visible = disks[i].visible = false; if (on && t0) { rings[i].visible = true; const dx = pat === 'vent' ? (i - 1) * 11 : 0, k = pat === 'vent' ? 4.2 / 3.5 : 1; const x = Math.max(ARENA.x0 + 2, Math.min(ARENA.x1 - 2, t0.x + dx)); rings[i].position.set(x, t0.y + .05, t0.z); rings[i].scale.setScalar(k); disks[i].visible = hot; disks[i].position.set(x, t0.y + .04, t0.z); disks[i].scale.setScalar(k); } }
    band.visible = pat === 'chain' && !!t0; if (t0) band.position.set(0, t0.y + .05, t0.z);
    stompRing.visible = pat === 'stomp'; stompRing.position.set(b.x, .05, b.z);
    if (impact.userData.life > 0) { impact.userData.life -= dt; impact.visible = true; impact.scale.setScalar(1 + Math.max(0, .5 - impact.userData.life)); } else impact.visible = false;
    steam.visible = !!b.steam && !dead; if (steam.visible) { steam.position.y = Math.sin(t * .6) * .15; steam.material.opacity = .12 + .05 * Math.sin(t * .8); }
  }
  return { root, parts, joint, marker, sync, frame, impact, steam };
}
