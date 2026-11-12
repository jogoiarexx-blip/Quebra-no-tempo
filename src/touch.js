import { input, resetInput } from './input.js';

// Cada ponteiro tem um dono: mover, olhar ou uma ação. Pointer capture permite
// manter os dois analógicos e uma ação pressionados sem perder o gesto.
export function initTouch({ isPlaying, pause, switchWeapon }) {
  const root = document.getElementById('touchControls');
  const move = document.getElementById('touchMove');
  const look = document.getElementById('touchLook');
  let moveId = null, lookId = null, lastX = 0, lastY = 0;
  const held = new Map();
  const setMode = (enabled = matchMedia('(pointer: coarse)').matches) => {
    if (input.touchMode !== enabled) reset();
    input.touchMode = enabled;
    document.documentElement.classList.toggle('touch-mode', enabled);
    root.hidden = !(enabled && isPlaying());
  };
  setMode();
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') setMode(true);
    else if (e.pointerType === 'mouse') setMode(false);
  }, true);
  matchMedia('(pointer: coarse)').addEventListener('change', () => setMode());
  function capture(el, e) { e.preventDefault(); input.usingPad = false; el.setPointerCapture(e.pointerId); }
  function updateMove(e) {
    const r = move.getBoundingClientRect(), radius = r.width * 0.35;
    let x = (e.clientX - r.left - r.width / 2) / radius;
    let y = (r.top + r.height / 2 - e.clientY) / radius;
    const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
    input.touchX = Math.abs(x) > 0.12 ? x : 0;
    input.touchY = Math.abs(y) > 0.12 ? y : 0;
    move.firstElementChild.style.transform = `translate(${x * radius}px,${-y * radius}px)`;
  }
  move.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || !isPlaying() || moveId !== null) return; capture(move,e); moveId=e.pointerId; updateMove(e); });
  move.addEventListener('pointermove', e => { if (e.pointerId === moveId) updateMove(e); });
  const stopMove = e => { if (e.pointerId !== moveId) return; moveId=null; input.touchX=input.touchY=0; move.firstElementChild.style.transform=''; };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) move.addEventListener(type,stopMove);
  look.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || !isPlaying() || lookId !== null) return; capture(look,e); lookId=e.pointerId; lastX=e.clientX;lastY=e.clientY; });
  look.addEventListener('pointermove', e => { if(e.pointerId!==lookId)return; input.mouseDX+=e.clientX-lastX;input.mouseDY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY; });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) look.addEventListener(type,e=>{if(e.pointerId===lookId)lookId=null;});
  for (const b of root.querySelectorAll('button')) {
    b.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || !isPlaying() || held.has(b)) return;
      capture(b,e); held.set(b,e.pointerId); b.classList.add('held');
      if(b.id==='touchWeapon') { switchWeapon(); return; }
      if(b.dataset.hold) { input[b.dataset.hold==='fire'?'lmb':'rmb']=true; if(b.dataset.hold==='fire')input.pressed.add('Mouse0'); }
      else { input.keys.add(b.dataset.code);input.pressed.add(b.dataset.code); }
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture']) b.addEventListener(type,e=>{
      if(held.get(b)!==e.pointerId)return;
      held.delete(b);b.classList.remove('held');
      if(b.dataset.hold)input[b.dataset.hold==='fire'?'lmb':'rmb']=false;
      else input.keys.delete(b.dataset.code);
    });
  }
  function reset() {
    moveId=lookId=null;held.clear();resetInput();move.firstElementChild.style.transform='';
    root.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));
  }
  addEventListener('blur',reset);
  document.getElementById('bTouchPause').addEventListener('click',pause);
  return { sync(active) {
    root.hidden=!(active && input.touchMode);
    document.getElementById('playTools').hidden=!active;
    if(!active)reset();
  },reset };
}
