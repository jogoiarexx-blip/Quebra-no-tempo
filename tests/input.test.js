import test from 'node:test';
import assert from 'node:assert/strict';
import * as controls from '../src/input.js';

test('ao perder foco limpa também comandos pendentes e deltas da câmera', () => {
  const listeners = {};
  globalThis.addEventListener = (type, fn) => { listeners[type] = fn; };
  globalThis.document = { addEventListener() {} };
  controls.initInput({ addEventListener() {} }, () => {});
  controls.input.pressed.add('KeyE'); controls.input.keys.add('KeyW');
  controls.input.mouseDX = 100; controls.input.mouseDY = 70; controls.input.wheel = 1;
  controls.input.lmb = true;
  listeners.blur();
  assert.equal(controls.input.pressed.size, 0);
  assert.equal(controls.input.keys.size, 0);
  assert.equal(controls.input.mouseDX, 0);
  assert.equal(controls.input.mouseDY, 0);
  assert.equal(controls.input.wheel, 0);
  assert.equal(controls.input.lmb, false);
});

test('teclado preserva Tab e ativação de botões, e Escape fecha opções com foco em campo', () => {
  const listeners = {};
  globalThis.addEventListener = (type, fn) => { listeners[type] = fn; };
  globalThis.document = { addEventListener() {} };
  controls.initInput({ addEventListener() {} }, () => {});
  let prevented = false;
  listeners.keydown({code:'Tab',target:{tagName:'BUTTON'},preventDefault(){prevented=true;}});
  assert.equal(prevented,false);
  controls.input.pressed.clear();
  listeners.keydown({code:'Space',target:{tagName:'BUTTON'},preventDefault(){prevented=true;}});
  assert.equal(prevented,false);assert.equal(controls.input.pressed.has('Space'),false);
  listeners.keydown({code:'Escape',target:{tagName:'INPUT'},preventDefault(){}});
  assert.equal(controls.input.pressed.has('Escape'),true);
});
