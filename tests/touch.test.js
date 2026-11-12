import test from 'node:test';
import assert from 'node:assert/strict';
import { input, resetInput } from '../src/input.js';
import { initTouch } from '../src/touch.js';

// Pequena superfície de eventos: testa o controlador real sem depender de WebGL.
class Element {
  constructor(dataset={}) {
    this.dataset=dataset;this.handlers={};this.hidden=true;this.style={};this.buttons=[];
    const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,v)=>v?classes.add(x):classes.delete(x)};
    this.firstElementChild={style:{}};
  }
  addEventListener(t,f){(this.handlers[t]??=[]).push(f);}
  setPointerCapture(){}
  getBoundingClientRect(){return {left:0,top:0,width:132,height:132};}
  querySelectorAll(sel){return sel==='button'?this.buttons:[];}
  emit(type,extra={}){for(const fn of this.handlers[type]||[])fn({preventDefault(){},pointerId:1,clientX:66,clientY:66,...extra});}
}
function setup() {
  resetInput();const ids={};for(const id of ['touchControls','touchMove','touchLook','bTouchPause','playTools'])ids[id]=new Element();
  const fire=new Element({hold:'fire'}),jump=new Element({code:'Space'});ids.touchControls.buttons=[fire,jump];
  globalThis.document=new Element();document.getElementById=id=>ids[id];document.documentElement=new Element();
  globalThis.matchMedia=()=>({matches:true,addEventListener(){}});
  globalThis.addEventListener=()=>{};
  let active=true;const c=initTouch({isPlaying:()=>active,pause(){},switchWeapon(){}});c.sync(true);
  return {ids,fire,jump,c,pause:()=>{active=false;c.sync(false);}};
}
test('movimento, câmera e disparo funcionam com três ponteiros independentes',()=>{
 const {ids,fire}=setup();
 ids.touchMove.emit('pointerdown',{pointerId:1,clientX:110,clientY:20});
 ids.touchLook.emit('pointerdown',{pointerId:2});
 ids.touchLook.emit('pointermove',{pointerId:2,clientX:86,clientY:76});
 fire.emit('pointerdown',{pointerId:3});
 assert.ok(input.touchX>0 && input.touchY>0);assert.equal(input.mouseDX,20);assert.equal(input.mouseDY,10);assert.equal(input.lmb,true);
 ids.touchLook.emit('pointerup',{pointerId:2});assert.ok(input.touchY>0);assert.equal(input.lmb,true);
 fire.emit('pointercancel',{pointerId:3});assert.equal(input.lmb,false);assert.ok(input.touchY>0);
});
test('pausa cancela movimento, salto e tiro; retomar começa neutro',()=>{
 const {ids,fire,jump,c,pause}=setup();ids.touchMove.emit('pointerdown',{clientY:10});fire.emit('pointerdown',{pointerId:3});jump.emit('pointerdown',{pointerId:4});
 pause();assert.equal(input.touchY,0);assert.equal(input.lmb,false);assert.equal(input.keys.size,0);assert.equal(input.pressed.size,0);assert.equal(ids.touchControls.hidden,true);
 c.sync(true);assert.equal(ids.touchControls.hidden,false);assert.equal(input.lmb,false);
});
test('ponteiro alheio não cancela o joystick; perder captura cancela',()=>{
 const {ids}=setup();ids.touchMove.emit('pointerdown',{pointerId:7,clientY:10});ids.touchMove.emit('pointerup',{pointerId:8});assert.ok(input.touchY>0);ids.touchMove.emit('lostpointercapture',{pointerId:7});assert.equal(input.touchY,0);
});
test('ações e movimento não começam com menu aberto',()=>{
 const {ids,fire,pause}=setup();pause();fire.emit('pointerdown');ids.touchMove.emit('pointerdown',{clientY:10});assert.equal(input.lmb,false);assert.equal(input.touchY,0);
});

test('PC híbrido alterna entre toque e mouse sem prender comandos ou esconder controles incorretamente',()=>{
 const {ids}=setup();ids.touchMove.emit('pointerdown',{clientY:10});assert.ok(input.touchY>0);
 document.emit('pointerdown',{pointerType:'mouse'});
 assert.equal(input.touchMode,false);assert.equal(ids.touchControls.hidden,true);assert.equal(input.touchY,0);
 document.emit('pointerdown',{pointerType:'touch'});
 assert.equal(input.touchMode,true);assert.equal(ids.touchControls.hidden,false);
});
