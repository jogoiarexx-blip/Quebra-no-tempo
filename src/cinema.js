// Cenas não jogáveis (GDD §39.3): abertura do jogo e abertura do Ato II. Mistura planos no próprio motor
// (cenário real + Gael animado) com painéis 2D desenhados em canvas: noticiário falso, fenda e títulos.
// Pular: Esc / Enter / Espaço / clique / toque / botão A ou Start a partir de 1 s. Nada aqui altera o save.
import * as THREE from 'three';
import { drawBroadcast, chromeText, drawRift } from './broadcast.js';
const $ = (id) => document.getElementById(id);
const ease = (k) => k * k * (3 - 2 * k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function camPath(cam, k, from, to, lookFrom, lookTo) {
  const e = ease(Math.min(1, Math.max(0, k)));
  cam.position.lerpVectors(from, to, e);
  cam.lookAt(new THREE.Vector3().lerpVectors(lookFrom, lookTo || lookFrom, e));
}
function vignette(g, w, h, a = .55) {
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = v; g.fillRect(0, 0, w, h);
}
function card(g, w, h, t, title, sub, at = .3) {
  if (t < at) return;
  const n = Math.floor((t - at) * 26), a = Math.min(1, (t - at) * 3);
  g.save(); g.globalAlpha = a; g.textAlign = 'left';
  const x = w * .06, y = h * .78, size = Math.max(22, Math.min(54, w * .04));
  g.fillStyle = '#ffb030'; g.fillRect(x - 14, y - size * .95, 6, size * 1.9);
  g.font = `${size}px "Black Ops One", Impact, sans-serif`; g.fillStyle = '#fff'; g.shadowColor = '#000'; g.shadowBlur = 8;
  g.fillText(title.slice(0, n), x, y);
  if (sub) { g.font = `${Math.round(size * .42)}px "Black Ops One", Impact, sans-serif`; g.fillStyle = '#ffcf7a'; g.fillText(sub.slice(0, Math.max(0, n - title.length)), x, y + size * .7); }
  g.restore();
}
// Partículas 2D baratas para a "explosão" do logotipo.
const embers = [];
function burst(w, h, n = 90) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 120 + Math.random() * 620; embers.push({ x: w / 2, y: h * .45, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: .6 + Math.random() * .9, t: 0 }); } }
function drawEmbers(g, dt) {
  for (let i = embers.length - 1; i >= 0; i--) { const e = embers[i]; e.t += dt; if (e.t > e.life) { embers.splice(i, 1); continue; } e.vy += 520 * dt; e.x += e.vx * dt; e.y += e.vy * dt; const k = 1 - e.t / e.life; g.fillStyle = `rgba(255,${120 + 120 * k | 0},40,${k})`; g.fillRect(e.x, e.y, 3 + 3 * k, 3 + 3 * k); }
}
function logoSlam(g, w, h, t, dt, top, bottom, tagline, fx) {
  g.fillStyle = '#050304'; g.fillRect(0, 0, w, h);
  const hazard = (y) => { g.save(); g.beginPath(); g.rect(0, y, w, h * .045); g.clip(); g.fillStyle = '#e0b020'; g.fillRect(0, y, w, h * .045); g.fillStyle = '#121212'; for (let x = -h; x < w + h; x += h * .09) { g.beginPath(); g.moveTo(x + t * 80 % (h * .09), y); g.lineTo(x + h * .045 + t * 80 % (h * .09), y); g.lineTo(x + t * 80 % (h * .09), y + h * .045); g.lineTo(x - h * .045 + t * 80 % (h * .09), y + h * .045); g.fill(); } g.restore(); };
  hazard(h * .06); hazard(h * .895);
  const shake = Math.max(0, .5 - Math.abs(t - .72)) * 26, sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
  g.save(); g.translate(sx, sy);
  const size = Math.min(w * .14, h * .2), k1 = Math.min(1, t / .35), k2 = Math.min(1, Math.max(0, (t - .3) / .35));
  const over = (k) => 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * .06;
  chromeText(g, top, w / 2 - (1 - over(k1)) * w, h * .42, size);
  chromeText(g, bottom, w / 2 + (1 - over(k2)) * w, h * .42 + size * .95, size * .82, { fire: true, edge: '#ffb030', glow: 'rgba(255,60,20,.75)' });
  if (t > .7) { const a = Math.min(1, (t - .7) * 6); g.strokeStyle = `rgba(255,48,72,${a})`; g.lineWidth = h * .012; g.shadowColor = '#ff3048'; g.shadowBlur = 20; g.beginPath(); g.moveTo(w * .18, h * .5); g.lineTo(w * .82, h * .3); g.stroke(); g.shadowBlur = 0; }
  g.restore();
  if (tagline && t > 1.3) { const n = Math.floor((t - 1.3) * 30); g.font = `${Math.max(16, Math.round(h * .035))}px "Black Ops One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#dfe6f0'; g.fillText(tagline.slice(0, n), w / 2, h * .42 + size * 1.9); }
  drawEmbers(g, dt);
  if (t < .5) { g.fillStyle = `rgba(255,248,230,${1 - t / .5})`; g.fillRect(0, 0, w, h); }
}

export function createCinema(env) {
  const el = $('cine'), cv = $('cineC'), g = cv.getContext('2d'), sub = $('cineSub'), skipEl = $('cineSkip');
  let script = null, i = 0, t = 0, total = 0, onDone = null, fired = new Set(), subT = 0, prevFov = 60;
  const resize = () => { const r = Math.min(devicePixelRatio || 1, 1.5); cv.width = innerWidth * r; cv.height = innerHeight * r; };
  addEventListener('resize', resize); resize();
  const say = (who, text, dur) => { sub.innerHTML = `<b>${who}</b>${text}`; sub.style.opacity = 1; subT = dur || Math.max(2.4, text.length * .06); env.sfx.talk?.(); };
  const actor = () => env.actor();
  function pose(x, y, z, yaw, anim, fade = .25) { const a = actor(); if (!a) return; a.root.visible = true; a.root.position.set(x, y, z); a.root.rotation.y = yaw; if (anim) a.play(anim, fade); }
  const SCRIPTS = {
    prologue: [
      { d: 6.2, three: true, enter: () => { env.setTrack(0); env.sfx.static(); pose(3.4, 0, 9.0, .21, 'Idle', 0); },
        cam: (c, k) => camPath(c, k, V(-6, 27, 18), V(4, 25, 58), V(0, 6, 100), V(-6, 8, 128)),
        draw: (g2, w, h, tt) => { vignette(g2, w, h); card(g2, w, h, tt, 'NOVA AURORA • 2039', '23:47 • A NOITE EM QUE O NOTICIÁRIO MENTIU', .4); } },
      { d: 7.8, enter: () => env.sfx.static(), subs: [[.5, 'PLANTÃO NA-2', 'Interrompemos a programação: imagens exclusivas mostram o mecânico Gael Rocha explodindo o reator municipal.', 3.6], [4.3, 'PLANTÃO NA-2', 'A Comissão de Memória Pública confirma: todos nós vimos. Todos nós lembramos.', 3.2]],
        draw: (g2, w, h, tt) => { const bw = Math.min(w * .7, h * .95), bh = bw * .58, x = (w - bw) / 2, y = h * .13; g2.fillStyle = '#000'; g2.fillRect(0, 0, w, h); g2.fillStyle = '#1a1a1e'; g2.fillRect(x - 18, y - 18, bw + 36, bh + 36); g2.save(); g2.translate(x, y); drawBroadcast(g2, bw, bh, tt); g2.restore(); vignette(g2, w, h, .7); } },
      { d: 4.4, three: true, enter: () => pose(3.4, 0, 9.0, .21, 'Idle'), subs: [[.4, 'GAEL', 'Eu? Explodindo um reator? Eu não consigo nem fazer pipoca sem queimar.', 3.8]],
        cam: (c, k) => camPath(c, k, V(2.2, 1.9, 6.9), V(2.6, 1.8, 7.6), V(3.9, 1.35, 11.1)), draw: (g2, w, h) => vignette(g2, w, h, .6) },
      { d: 4.6, three: true, enter: () => pose(3.4, 0, 9.0, .21, 'Talk'), subs: [[.3, 'GAEL', 'E o cara da TV é mais bonito que eu. Isso é difamação em dobro.', 3.8]],
        cam: (c, k) => camPath(c, k, V(2.5, 1.55, 10.75), V(2.75, 1.6, 10.75), V(3.4, 1.55, 9.0)), draw: (g2, w, h) => vignette(g2, w, h, .6) },
      { d: 5.6, three: true, enter: () => pose(3.4, 0, 9.0, Math.atan2(-3.4, 3.0), 'Idle'),
        at: [[.3, (c) => { env.sfx.bang(); env.shake(.35); c.doorKick = 1; }], [1.7, (c) => { env.sfx.bang(); env.shake(.4); c.doorKick = 1; }], [3.6, (c) => { env.sfx.bang(); c.doorKick = 1; }]],
        subs: [[.6, 'VOZ LÁ FORA', 'Gael Rocha! Abra em nome da Ordem Cronal!', 2.2], [2.9, 'GAEL', 'Se for entrega de pizza, vocês vieram armados demais.', 2.6]],
        cam: (c, k) => camPath(c, k, V(-3.2, 2.3, 3.6), V(-2.4, 2.0, 5.2), V(0, 1.5, 12.2)), alarm: true, draw: (g2, w, h, tt) => { vignette(g2, w, h, .5); if (Math.sin(tt * 9) > .3) { g2.fillStyle = 'rgba(255,0,30,.12)'; g2.fillRect(0, 0, w, h); } } },
      { d: 5.4, three: true, enter: () => pose(3.4, 0, 9.0, Math.atan2(-8.9, -1.0), 'Aim', .35), subs: [[.3, 'GAEL', 'Martelo-9 no armário. Claro. Guardei a arma no único lugar onde ela não serve pra nada.', 3.0], [3.4, 'GAEL', 'Tá bom. Vamos do jeito difícil. É o meu favorito.', 2.0]],
        cam: (c, k) => camPath(c, k, V(1.2, .55, 7.2), V(1.6, .7, 6.6), V(3.4, 1.7, 9.0)), draw: (g2, w, h) => vignette(g2, w, h, .5) },
      { d: 7.4, enter: () => { env.sfx.boom(); burst(cv.width, cv.height); }, at: [[.7, () => { env.sfx.slam(); env.sfx.stinger(); burst(cv.width, cv.height, 60); }]],
        draw: (g2, w, h, tt, dt) => logoSlam(g2, w, h, tt, dt, 'QUEBRA', 'NO TEMPO', 'O PASSADO MENTIU. O FUTURO VAI PAGAR.') },
    ],
    act2: [
      { d: 5.2, enter: () => { env.sfx.portal(); env.setTrack(10); }, draw: (g2, w, h, tt) => { g2.fillStyle = '#04020a'; g2.fillRect(0, 0, w, h); drawRift(g2, w, h, tt, Math.min(1, tt)); card(g2, w, h, tt, 'FENDA ESTÁVEL', 'DESTINO: VALE DE MERCÚRIO, 1888', .5); if (tt > 4.4) { g2.fillStyle = `rgba(255,250,235,${(tt - 4.4) / .8})`; g2.fillRect(0, 0, w, h); } } },
      { d: 7.2, three: true, enter: () => { const a = actor(); if (a) a.root.visible = false; },
        cam: (c, k) => camPath(c, k, V(-2, 11, -6), V(3, 5.5, 44), V(0, 4, 120), V(0, 6, 170)),
        draw: (g2, w, h, tt) => { vignette(g2, w, h, .45); card(g2, w, h, tt, 'VALE DE MERCÚRIO • 1888', 'POEIRA ALTA • UMA CIDADE QUE ESQUECE GENTE', .6); if (tt < .6) { g2.fillStyle = `rgba(255,250,235,${1 - tt / .6})`; g2.fillRect(0, 0, w, h); } } },
      { d: 7.6, three: true, enter: () => { const a = actor(); if (a) a.root.visible = false; },
        at: [[.35, () => { env.sfx.portal(); env.flash(V(0, 1.2, 2), 2.6, .5, 0x35e6ff); env.sparks(V(0, 1.2, 2), 0x35e6ff, 60, 6, .9); pose(0, 0, 2, 0, 'Idle', 0); }], [2.0, () => pose(0, 0, 2, 0, 'Talk')]],
        subs: [[.9, 'ÍRIS-9', 'Bem-vindo a 1888. Tente não inventar a internet antes da hora.', 3.0], [4.2, 'GAEL', 'Poeira, cavalos e ninguém olhando o celular. Acho que encontrei o paraíso.', 3.2]],
        cam: (c, k) => camPath(c, k, V(1.6, 1.0, 7.2), V(.9, 1.3, 5.8), V(0, 1.4, 2)), draw: (g2, w, h) => vignette(g2, w, h, .5) },
      { d: 5.4, three: true, enter: () => { pose(0, 0, 2, 0, 'Idle'); env.sfx.slam(); burst(cv.width, cv.height, 50); },
        cam: (c, k) => camPath(c, k, V(0, 1.6, 6), V(0, 7, -5), V(0, 1.5, 2), V(0, 4, 60)),
        draw: (g2, w, h, tt, dt) => { vignette(g2, w, h, .7); g2.fillStyle = 'rgba(0,0,0,.35)'; g2.fillRect(0, 0, w, h); const s = Math.min(w * .13, h * .19), k = Math.min(1, tt / .3); g2.save(); g2.globalAlpha = k; chromeText(g2, 'ATO II', w / 2, h * .42, s * (1.6 - .6 * k), { fire: true, edge: '#ffb030' }); chromeText(g2, 'OURO DE MENTIRA', w / 2, h * .42 + s * .9, s * .55); g2.restore(); drawEmbers(g2, dt); } },
    ],
  };
  function enterShot(c) { const s = script[i]; t = 0; fired = new Set(); c.doorKick = 0; subT = 0; sub.style.opacity = 0; if (s.enter) s.enter(c); }
  const ctx = {};
  function finish() {
    if (!script) return; script = null; el.classList.remove('on'); sub.style.opacity = 0; env.camera.fov = prevFov; env.camera.updateProjectionMatrix(); embers.length = 0;
    removeEventListener('keydown', onKey, true); el.removeEventListener('pointerdown', onPtr);
    const cb = onDone; onDone = null; if (cb) cb();
  }
  function onKey(e) { if (['Escape', 'Enter', 'Space', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (total > 1) finish(); } }
  function onPtr() { if (total > 1) finish(); }
  return {
    get active() { return !!script; },
    has: (name) => !!SCRIPTS[name],
    durationOf: (name) => SCRIPTS[name].reduce((s, x) => s + x.d, 0),
    shots: (name) => SCRIPTS[name].length,
    play(name, done) {
      script = SCRIPTS[name]; if (!script) { done?.(); return; }
      i = 0; total = 0; onDone = done; prevFov = env.camera.fov; env.camera.fov = 52; env.camera.updateProjectionMatrix();
      el.classList.add('on'); skipEl.style.opacity = 0; resize(); enterShot(ctx);
      addEventListener('keydown', onKey, true); el.addEventListener('pointerdown', onPtr);
    },
    skip: finish,
    jump(n) { if (!script) return; i = Math.max(0, Math.min(script.length - 1, n)); total = 2; enterShot(ctx); },   // QA
    // por quadro: retorna true quando o plano é 3D (o motor deve renderizar a cena)
    update(dt, padSkip) {
      if (!script) return false;
      t += dt; total += dt; if (padSkip && total > 1) { finish(); return false; }
      let s = script[i];
      if (t >= s.d) { i++; if (i >= script.length) { finish(); return false; } enterShot(ctx); s = script[i]; }
      for (const [at, fn] of s.at || []) if (t >= at && !fired.has(at)) { fired.add(at); fn(ctx); }
      for (const [at, who, text, dur] of s.subs || []) if (t >= at && !fired.has('s' + at)) { fired.add('s' + at); say(who, text, dur); }
      if (subT > 0) { subT -= dt; if (subT <= 0) sub.style.opacity = 0; }
      skipEl.style.opacity = total > 1 ? .75 : 0;
      if (s.cam) s.cam(env.camera, t / s.d);
      if (ctx.doorKick > 0) { ctx.doorKick = Math.max(0, ctx.doorKick - dt * 3); env.doorKick?.(ctx.doorKick); }
      const a = actor(); if (a && s.three) a.update(dt);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      if (s.draw) s.draw(g, cv.width, cv.height, t, dt);
      el.classList.toggle('flat', !s.three);
      return !!s.three;
    },
  };
}
