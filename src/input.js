// Teclado + mouse (pointer lock com fallback) + gamepad padrão.
export const input = {
  keys: new Set(), pressed: new Set(), mouseDX: 0, mouseDY: 0, lmb: false, rmb: false, wheel: 0,
  locked: false, freeLook: false, lockUntil: 0, pad: null, padPrev: {}, usingPad: false,
};
export function resetInput() {
  input.keys.clear(); input.pressed.clear();
  input.mouseDX = input.mouseDY = input.wheel = 0;
  input.lmb = input.rmb = false;
  input.touchX = input.touchY = 0;
}
let canvas = null;
export function initInput(el, onLockLost) {
  canvas = el;
  addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
    if (e.target?.tagName === 'BUTTON' && ['Space', 'Enter'].includes(e.code)) return;
    if (['Space', 'AltLeft', 'AltRight', 'KeyQ', 'KeyE'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code); input.usingPad = false;
  });
  addEventListener('keyup', (e) => input.keys.delete(e.code));
  addEventListener('blur', resetInput);
  addEventListener('mousemove', (e) => { if (input.locked || input.freeLook) { input.mouseDX += e.movementX || 0; input.mouseDY += e.movementY || 0; } });
  el.addEventListener('mousedown', (e) => { if (e.button === 0) { input.lmb = true; input.pressed.add('Mouse0'); } if (e.button === 2) input.rmb = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) input.lmb = false; if (e.button === 2) input.rmb = false; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    const was = input.locked; input.locked = document.pointerLockElement === canvas;
    if (was && !input.locked) onLockLost();
  });
  document.addEventListener('pointerlockerror', () => { input.freeLook = true; });
}
export function requestLock() {
  if (!canvas || input.locked || input.touchMode) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { input.freeLook = true; }); } catch { input.freeLook = true; }
}
export function releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }
export function down(code) { return input.keys.has(code); }
export function hit(code) { return input.pressed.has(code); }
const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
export function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null; for (const p of pads) if (p && p.connected && p.mapping === 'standard') { gp = p; break; }
  if (!gp) { input.pad = null; input.padPrev = {}; input.usingPad = false; return; }
  const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
  const cur = { a: b(0), bb: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5), lt: b(6), rt: b(7), start: b(9), l3: b(10), r3: b(11), up: b(12), down: b(13), left: b(14), right: b(15) };
  const pad = { lx: dz(gp.axes[0]), ly: dz(gp.axes[1]), rx: dz(gp.axes[2]), ry: dz(gp.axes[3]), ...cur, hit: {} };
  for (const k in cur) { pad.hit[k] = cur[k] && !input.padPrev[k]; if (pad.hit[k]) input.usingPad = true; }
  if (Math.abs(pad.lx) + Math.abs(pad.ly) + Math.abs(pad.rx) + Math.abs(pad.ry) > 0.3) input.usingPad = true;
  input.padPrev = cur; input.pad = pad;
}
export function endFrame() { input.pressed.clear(); input.mouseDX = 0; input.mouseDY = 0; input.wheel = 0; if (input.pad) input.pad.hit = {}; }
