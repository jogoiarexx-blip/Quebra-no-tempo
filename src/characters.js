// Carrega os GLB corrigidos (public/models) e cria atores animados.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { makeCrouchClips } from './crouch.js';
import { makeActorClips } from './actor-animations.js';

export const assets = {};
const MODELS = 'models/';     // relativo à página: funciona em qualquer subpasta do GitHub Pages
export async function loadCharacters(onProgress) {
  const loader = new GLTFLoader();
  const names = ['gael', 'sol', 'jill', 'boate'];
  let done = 0;
  await Promise.all(names.map(async (n) => {
    const g = await loader.loadAsync(`${MODELS}${n}.glb`);
    g.scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material.map) o.material.map.anisotropy = 4; o.material.metalness = Math.min(o.material.metalness, 0.3); } });
    if (n === 'gael' || n === 'jill') g.animations.push(...makeCrouchClips(g.scene, g.animations.find(c => c.name === 'Idle'), g.animations.find(c => c.name === 'Aim')));
    g.animations.push(...makeActorClips(g.scene,g.animations,n));
    const clips = {}; g.animations.forEach((c) => (clips[c.name] = c));
    let material = null; g.scene.traverse((o) => { if (o.isMesh) material = o.material; });
    assets[n] = { scene: g.scene, clips, material };
    onProgress(++done / names.length);
  }));
  await Promise.all([loadMasks('sol', `${MODELS}sol_masks.png`), loadMasks('gael', `${MODELS}gael_masks.png`)]);
  // modelos próprios de inimigos (opcional): models/enemies/manifest.json
  try {
    const man = await (await fetch(`${MODELS}enemies/manifest.json`)).json();
    for (const id of ['E01', 'E02']) if (man[id]) {
      const g = await loader.loadAsync(`${MODELS}enemies/${man[id]}`); g.animations.push(...makeActorClips(g.scene,g.animations,id)); const clips = {}; g.animations.forEach((c) => (clips[c.name] = c));
      g.scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material.map) o.material.map.anisotropy = 4; o.material.metalness = Math.min(o.material.metalness, 0.3); } });
      assets[id] = { scene: g.scene, clips, material: null, custom: true };
    }
  } catch (e) { console.warn('manifest de inimigos indisponível', e); }
}

// ---------- figurinos por máscara: o mesmo modelo com roupas de cores/materiais diferentes ----------
// *_masks.png (2:1, opaco). sol: esq. R tecido, G couro/sapatos, B cabelo | dir. R meia arrastão
//                           gael: esq. R jaqueta, G calça, B cabelo | dir. R botas, G luvas
export const OUTFITS = {                     // dançarina (chaves usadas em figurinos.html e no clube)
  sol: null,                                                                                       // original: vermelho e preto
  lux: { fabric: '#1e9bff', leather: '#f2f4f8', hair: '#e8d9a8', stockings: '#bfe6ff' },           // azul neon, couro branco, loira
  ambar: { fabric: '#ffb020', leather: '#3a1d0c', hair: '#7a2a12', stockings: '#3a1d0c' },         // dourado, couro marrom, ruiva
  violeta: { fabric: '#b04cff', leather: '#17171c', hair: '#ff5fc8', stockings: '#ff5fc8' },       // roxo, cabelo rosa
  esmeralda: { fabric: '#18c27a', leather: '#d8dde4', hair: '#101014', stockings: null },          // verde, couro prata, sem meia
};
export const LOOKS = {                       // variações do modelo masculino (inimigos, público, equipe)
  merc: { jacket: '#2b3038', pants: '#2c3326', hair: '#111111', boots: '#151515', gloves: '#151515' },
  sniper: { jacket: '#3b2a58', pants: '#24222c', hair: '#111111', boots: '#141418', gloves: '#141418' },
  basso: { jacket: '#7a1f1f', pants: '#1b1b1f', hair: '#a7a7a7', boots: '#2a1a12', gloves: null },
  dante: { jacket: '#141418', pants: '#141418', hair: '#151515', boots: '#0d0d0f', gloves: '#0d0d0f' },
  cifra: { jacket: '#1d6fd1', pants: '#202024', hair: '#ff5fc8', boots: '#e8e8e8', gloves: null },
  p1: { jacket: '#c8b28a', pants: '#2c3e5c', hair: '#3a2416', boots: '#3a2416', gloves: null },
  p2: { jacket: '#5a1d4a', pants: '#1c1c22', hair: '#0f0f0f', boots: '#111111', gloves: null },
  p3: { jacket: '#2f6b4f', pants: '#3a3226', hair: '#6b4a2a', boots: '#2a2018', gloves: null },
  p4: { jacket: '#d9d9de', pants: '#17171c', hair: '#c9a86a', boots: '#d9d9de', gloves: null },
  p5: { jacket: '#b8541c', pants: '#24303c', hair: '#141414', boots: '#2a1a12', gloves: null },
};
const CHANNELS = {
  sol: [['fabric', 2.3, 0.1], ['leather', 5, 0.18], ['hair', 6, 0.16], ['stockings', 0.6, 0.35]],
  gael: [['jacket', 1.8, 0.06], ['pants', 2.2, 0.05], ['hair', 5, 0.08], ['boots', 3, 0.05], ['gloves', 4, 0.06]],
};
const masks = {}, matCache = {};
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export function outfitMaterial(assetName, outfitId) {
  const key = assetName + ':' + outfitId; if (matCache[key]) return matCache[key];
  const o = (assetName === 'sol' ? OUTFITS : LOOKS)[outfitId], src = assets[assetName].material, mk = masks[assetName];
  if (!o || !mk) return src;
  const size = mk.size, c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src.map.image, 0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  // canal -> [cor, ganho, piso]: a luminância original modula a cor nova (preserva dobras e brilho)
  const ch = CHANNELS[assetName].map(([name, gain, lift]) => ({ name, col: o[name] ? hex(o[name]) : null, gain, lift, remove: o[name] === null }));
  for (let i = 0, px = 0; i < d.length; i += 4, px++) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    for (let k = 0; k < ch.length; k++) {
      const w = mk.ch[k][px] / 255; if (w < 0.02) continue;
      const c2 = ch[k];
      if (!c2.col) { if (c2.remove && c2.name === 'stockings') { d[i] = Math.min(255, d[i] + 60 * w); d[i + 1] = Math.min(255, d[i + 1] + 38 * w); d[i + 2] = Math.min(255, d[i + 2] + 26 * w); } continue; }
      const t = Math.min(1, c2.lift + lum * c2.gain);
      d[i] += (c2.col[0] * t * 255 - d[i]) * w; d[i + 1] += (c2.col[1] * t * 255 - d[i + 1]) * w; d[i + 2] += (c2.col[2] * t * 255 - d[i + 2]) * w;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = src.clone(); mat.map = tex; matCache[key] = mat; return mat;
}
async function loadMasks(asset, url) {
  try {
    const im = new Image(); im.src = url; await im.decode();
    const size = im.height, c = document.createElement('canvas'); c.width = im.width; c.height = size; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const a = g.getImageData(0, 0, size, size).data, b = g.getImageData(size, 0, size, size).data, n = size * size;
    const chs = [0, 1, 2, 3, 4, 5].map(() => new Uint8Array(n));
    for (let i = 0; i < n; i++) { chs[0][i] = a[i * 4]; chs[1][i] = a[i * 4 + 1]; chs[2][i] = a[i * 4 + 2]; chs[3][i] = b[i * 4]; chs[4][i] = b[i * 4 + 1]; chs[5][i] = b[i * 4 + 2]; }
    masks[asset] = { size, ch: chs };
  } catch (e) { console.warn('máscaras de figurino indisponíveis', asset, e); }
}

const UPPER = ['Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _ax = new THREE.Vector3();

export class Actor {
  constructor(assetName, opts = {}) {
    const a = assets[assetName];
    this.assetName = assetName;
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(a.scene);
    this.model.scale.setScalar(opts.scale || 1);
    this.root.add(this.model);
    this.bones = {};
    this.model.traverse((o) => {
      if (o.isBone) this.bones[o.name.replace('mixamorig', '').replace(':', '')] = o;
      if (o.isMesh) {
        this.mesh = o; o.frustumCulled = false;
        if (opts.tint !== undefined || opts.hologram) {
          o.material = opts.hologram ? new THREE.MeshBasicMaterial({ color: opts.hologram, transparent: true, opacity: 0.5, depthWrite: false }) : o.material.clone();
          if (opts.tint !== undefined) o.material.color.set(opts.tint);
        }
      }
    });
    if (opts.outfit) this.mesh.material = outfitMaterial(assetName, opts.outfit);
    this.baseMaterial = this.mesh.material;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const [name, clip] of Object.entries(a.clips)) {
      const act = this.mixer.clipAction(clip); act.enabled = true; act.setEffectiveWeight(0); act.play(); this.actions[name] = act;
    }
    this.current = null; this.weights = {};
    // pose de mira (quaternions locais do clipe "Aim") para sobrepor no tronco/braços
    this.aimPose = {}; this.aimW = 0; this.aimTarget = 0; this.pitch = 0;
    if (a.clips.Aim) for (const tr of a.clips.Aim.tracks) {
      const bn = tr.name.split('.')[0].replace('mixamorig', '');
      if (tr.name.endsWith('.quaternion') && UPPER.includes(bn)) this.aimPose[bn] = new THREE.Quaternion().fromArray(tr.values, 0);
    }
    this.play(opts.start || 'Idle', 0);
    if (opts.helmet) this.addHelmet(opts.helmet);
    if (opts.armor) this.addArmor(opts.armor);
    if (opts.ledMask) this.addLedMask(opts.ledMask);
  }
  // peças rígidas presas aos ossos (montadas na pose de bind, logo após a criação)
  attachBox(boneName, w, h, d, off, mat) {
    const b = this.bones[boneName]; if (!b) return null;
    this.root.updateMatrixWorld(true);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); const sc = this.model.scale.y;
    m.scale.setScalar(sc); b.getWorldPosition(_v); m.position.copy(_v).add(new THREE.Vector3(off[0] * sc, off[1] * sc, off[2] * sc));
    this.root.add(m); b.attach(m); m.castShadow = true; return m;
  }
  addArmor(color) {
    const plate = new THREE.MeshLambertMaterial({ color }), dark = new THREE.MeshLambertMaterial({ color: 0x15171b });
    this.attachBox('Spine2', 0.4, 0.34, 0.1, [0, -0.06, 0.15], plate);
    this.attachBox('Spine2', 0.38, 0.34, 0.08, [0, -0.06, -0.14], plate);
    this.attachBox('Spine', 0.36, 0.12, 0.3, [0, -0.04, 0.02], dark);
    this.attachBox('LeftArm', 0.2, 0.08, 0.22, [0.04, 0.07, 0], plate); this.attachBox('RightArm', 0.2, 0.08, 0.22, [-0.04, 0.07, 0], plate);
    this.attachBox('LeftLeg', 0.13, 0.15, 0.06, [0, 0.0, 0.08], dark); this.attachBox('RightLeg', 0.13, 0.15, 0.06, [0, 0.0, 0.08], dark);
    const lamp = new THREE.MeshBasicMaterial({ color: this.visor ? this.visor.material.color : 0xffb030 });
    this.attachBox('Spine2', 0.06, 0.04, 0.02, [0.12, 0.04, 0.205], lamp);
  }
  addLedMask(color) {
    const m = this.attachBox('Head', 0.22, 0.2, 0.06, [0, 0.07, 0.11], new THREE.MeshBasicMaterial({ color }));
    if (m) this.led = m;
  }
  addHelmet(color) {
    this.root.updateMatrixWorld(true);
    const head = this.bones.Head; if (!head) return;
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.33), new THREE.MeshLambertMaterial({ color: 0x1b1f27 })); g.add(shell);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.07, 0.1), new THREE.MeshBasicMaterial({ color })); visor.position.set(0, 0.02, 0.14); g.add(visor);
    head.getWorldPosition(_v); g.position.copy(_v).add(new THREE.Vector3(0, 0.1 * this.model.scale.y, 0.02));
    this.root.add(g); head.attach(g); this.visor = visor;
  }
  play(name, fade = 0.15, timeScale = 1, options = {}) {
    if (!this.actions[name]) name = 'Idle';
    const action = this.actions[name], changed = this.current !== name;
    if (changed || options.restart) {
      action.reset();
      action.setLoop(options.once ? THREE.LoopOnce : THREE.LoopRepeat, options.once ? 1 : Infinity);
      action.clampWhenFinished = !!options.once;
      action.enabled = true; action.paused = false; action.play();
    }
    action.setEffectiveTimeScale(timeScale);
    if (!changed && !options.restart) return;
    this.current = name; this.fade = Math.max(fade, 1e-3);
    if (fade === 0) for (const n in this.actions) { this.weights[n] = n === name ? 1 : 0; this.actions[n].setEffectiveWeight(this.weights[n]); }
  }
  update(dt) {
    for (const n in this.actions) {
      const target = n === this.current ? 1 : 0, w = this.weights[n] ?? 0;
      const nw = w + Math.sign(target - w) * Math.min(Math.abs(target - w), dt / this.fade);
      if (nw !== w) { this.weights[n] = nw; this.actions[n].setEffectiveWeight(nw); }
    }
    // O mixer do three.js não reescreve ossos cujas trilhas não mudam (ex.: Idle). Sem isto a sobreposição de mira
    // acumulava quadro a quadro e o tronco/braços ficavam presos na pose (bug "segurar a mira trava o personagem").
    if (this.overlayBase) { for (const [b, q] of this.overlayBase) b.quaternion.copy(q); this.overlayBase.length = 0; }
    this.mixer.update(dt);
    this.aimW += (this.aimTarget - this.aimW) * Math.min(1, dt * 14);
    if (this.aimW > 0.01) {
      this.overlayBase = this.overlayBase || [];
      for (const bn of [...Object.keys(this.aimPose), 'Spine1']) { const b = this.bones[bn]; if (b) this.overlayBase.push([b, b.quaternion.clone()]); }
      for (const bn in this.aimPose) { const b = this.bones[bn]; if (b) b.quaternion.slerp(this.aimPose[bn], this.aimW); }
      // inclina o tronco para cima/baixo acompanhando a mira (rotação em espaço do mundo no osso Spine1)
      const sp = this.bones.Spine1;
      if (sp && Math.abs(this.pitch) > 0.01) {
        this.root.updateMatrixWorld(true);
        sp.parent.getWorldQuaternion(_q);
        _ax.set(1, 0, 0).applyQuaternion(this.root.getWorldQuaternion(_q2));
        // +X do modelo é a esquerda do personagem: ângulo positivo inclina o tronco para frente (olhar para baixo).
        // Antes o sinal estava invertido (mirar para baixo jogava o corpo para trás) e sem limite.
        const lean = Math.max(-0.45, Math.min(0.45, -this.pitch * 0.55));
        _q2.setFromAxisAngle(_ax, lean * this.aimW);
        sp.quaternion.premultiply(_q.clone().invert().multiply(_q2).multiply(_q));
      }
    }
  }
  handPos(out, side = 'Right') { const b = this.bones[side + 'Hand']; this.root.updateMatrixWorld(true); return b.getWorldPosition(out); }
  dispose() { this.mixer.stopAllAction(); this.root.removeFromParent(); }
}
