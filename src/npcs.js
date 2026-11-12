// NPCs não hostis (público, equipe do Véspera, performers). Nunca são colisores nem alvos:
// tiros e projéteis atravessam, e eles não bloqueiam rotas (GDD §28.6).
import * as THREE from 'three';
import { G } from './state.js';
import { Actor } from './characters.js';

const holoMat = new THREE.MeshBasicMaterial({ color: 0xff7ad8, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
const _v = new THREE.Vector3();

export class NPC {
  constructor(parent, o) {
    this.o = o; this.name = o.name || '';
    this.actor = new Actor(o.asset || 'gael', { scale: o.scale || (o.asset === 'sol' ? 1 : 1.02), outfit: o.outfit, ledMask: o.ledMask, helmet: o.helmet });
    parent.add(this.actor.root);
    this.home = new THREE.Vector3(o.x, o.y || 0, o.z); this.homeYaw = o.yaw || 0;
    this.performer = !!o.performer;
    this.reset();
  }
  place(x, y, z, yaw) { this.home.set(x, y, z); this.homeYaw = yaw; this.actor.root.position.copy(this.home); this.actor.root.rotation.y = yaw; this.state = 'idle'; this.setVisible(true); }
  reset() {
    this.home.set(this.o.x, this.o.y || 0, this.o.z); this.homeYaw = this.o.yaw || 0;
    this.state = 'idle'; this.path = null; this.pi = 0; this.visible = true; this.facePlayer = 0;
    this.actor.root.position.copy(this.home); this.actor.root.rotation.y = this.homeYaw; this.actor.root.visible = true;
    this.anim = this.o.anim || 'Idle'; this.actor.play(this.anim, 0);
  }
  setVisible(v) { this.visible = v; this.actor.root.visible = v; }
  pos() { return this.actor.root.position; }
  // pânico: corre por uma rota autorada até a saída e some (estado "SAFE")
  panic(path, delay = 0, hide = true) { this.hideAtEnd = hide; this.state = 'panic'; this.path = path.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1] ?? this.home.y, p[2]))); this.pi = 0; this.delay = delay; }
  hideSafe() { this.state = 'safe'; this.setVisible(false); }
  talk(t = 4) { this.facePlayer = t; }
  update(dt, cam) {
    if (!this.visible) return;
    const r = this.actor.root;
    if (this.state === 'panic') {
      if (this.delay > 0) { this.delay -= dt; this.actor.play('Idle', 0.1); }
      else {
        const tgt = this.path[this.pi];
        _v.copy(tgt).sub(r.position); _v.y = 0; const d = _v.length();
        if (d < 0.35) { this.pi++; if (this.pi >= this.path.length) { if (this.hideAtEnd) { this.hideSafe(); return; } this.state = 'idle'; this.home.copy(r.position); this.homeYaw = this.o.endYaw ?? r.rotation.y; this.actor.play(this.o.endAnim || 'Idle', 0.2); return; } }
        else { const sp = 4.6 * dt; r.position.addScaledVector(_v, Math.min(1, sp / d)); r.position.y = tgt.y; const yaw = Math.atan2(_v.x, _v.z); let dy = yaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.rotation.y += dy * Math.min(1, dt * 10); this.actor.play('Running', 0.15, 1.05); }
      }
    } else if (this.facePlayer > 0 && G.level) {
      this.facePlayer -= dt; const pp = G.playerPos; if (pp) { const yaw = Math.atan2(pp.x - r.position.x, pp.z - r.position.z); let dy = yaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.rotation.y += dy * Math.min(1, dt * 6); }
      this.actor.play('Idle', 0.3);
    } else if (this.state === 'idle' && this.facePlayer <= 0 && this.anim) {
      let dy = this.homeYaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.rotation.y += dy * Math.min(1, dt * 2);
    }
    if (this.performer) { const holo = G.settings.attenuate; if (this.isHolo !== holo) { this.isHolo = holo; this.actor.mesh.material = holo ? holoMat : this.actor.baseMaterial; } }
    // animação completa só perto da câmera (GDD §28.4: crowd distante mais barata)
    const far = cam && r.position.distanceToSquared(cam) > 45 * 45;
    this.acc = (this.acc || 0) + dt;
    if (!far || this.acc > 0.12) { this.actor.update(this.acc); this.acc = 0; }
  }
}
