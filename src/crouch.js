import * as THREE from 'three';

// Bake short planted-foot cycles once at load. IK works in world space, so the
// imported rig's unusual local bone axes do not need hard-coded Euler angles.
export function makeCrouchClips(model, idleClip, aimClip) {
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(idleClip).play(); mixer.update(0);
  const bones = {};
  model.traverse(b => { if (b.isBone) bones[b.name.replace(/^mixamorig[:_]?/, '')] = b; });
  const hips = bones.Hips;
  const base = Object.values(bones).map(b => [b, b.position.clone(), b.quaternion.clone()]);
  model.updateMatrixWorld(true);
  const feet = ['Left', 'Right'].map(s => ({ side: s, pos: bones[s + 'Foot'].getWorldPosition(new THREE.Vector3()), q: bones[s + 'Foot'].getWorldQuaternion(new THREE.Quaternion()) }));
  const height = model.getWorldScale(new THREE.Vector3()).y;
  const rotateTo = (bone, child, target) => {
    const origin = bone.getWorldPosition(new THREE.Vector3());
    const from = child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const to = target.clone().sub(origin).normalize();
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    model.updateMatrixWorld(true);
  };
  const armPose = new Map();
  if (aimClip) {
    mixer.stopAllAction(); mixer.clipAction(aimClip).play(); mixer.update(0);
    for (const [name, b] of Object.entries(bones)) if (/^(Left|Right)(Shoulder|Arm|ForeArm|Hand)$/.test(name)) armPose.set(b, b.quaternion.clone());
    mixer.stopAllAction();
    for (const [b, p, q] of base) { b.position.copy(p); b.quaternion.copy(q); }
  }
  const clips = [];
  for (const moving of [false, true]) {
    const count = moving ? 41 : 25, duration = moving ? 0.9 : 2.4;
    const times = [], rotations = new Map(base.map(([b]) => [b, []])), positions = [];
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1); times.push(u * duration);
      for (const [b, p, q] of base) { b.position.copy(p); b.quaternion.copy(q); }
      for (const [b, q] of armPose) b.quaternion.copy(q);
      hips.position.y -= 0.54; hips.position.z -= 0.08;
      hips.position.y += (moving ? 0.008 : 0.004) * Math.sin(u * Math.PI * (moving ? 4 : 2));
      model.updateMatrixWorld(true);
      for (const {side, pos, q} of feet) {
        const phase = (u + (side === 'Right' ? 0.5 : 0)) % 1;
        const stance = phase < 0.62;
        const t = stance ? phase / 0.62 : (phase - 0.62) / 0.38;
        const target = pos.clone();
        if (moving) { target.z += (stance ? 0.28 - 0.56 * t : -0.28 + 0.56 * (t * t * (3 - 2 * t))) * height; target.y += stance ? 0 : Math.sin(Math.PI * t) * 0.085 * height; }
        const thigh = bones[side + 'UpLeg'], knee = bones[side + 'Leg'], foot = bones[side + 'Foot'];
        const h = thigh.getWorldPosition(new THREE.Vector3()), k = knee.getWorldPosition(new THREE.Vector3()), f = foot.getWorldPosition(new THREE.Vector3());
        const a = h.distanceTo(k), b = k.distanceTo(f), dir = target.clone().sub(h), d = Math.min(a + b - 0.001, dir.length());
        dir.normalize();
        const along = (a * a - b * b + d * d) / (2 * d);
        const pole = new THREE.Vector3(0, 0, 1).addScaledVector(dir, -dir.z).normalize();
        const bend = h.clone().addScaledVector(dir, along).addScaledVector(pole, Math.sqrt(Math.max(0, a * a - along * along)));
        rotateTo(thigh, knee, bend); rotateTo(knee, foot, target);
        foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
        model.updateMatrixWorld(true);
      }
      // Small forward lean, counterbalanced neck. Local transforms are baked,
      // then blended by the same mixer as idle/run/aim.
      for (const [name, angle] of [['Spine', 0.16], ['Neck', -0.10]]) {
        const b = bones[name]; if (!b) continue;
        const world = b.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle));
        b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world)); model.updateMatrixWorld(true);
      }
      for (const [b] of base) rotations.get(b).push(...b.quaternion.toArray());
      positions.push(...hips.position.toArray());
    }
    const tracks = base.map(([b]) => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, rotations.get(b)));
    tracks.push(new THREE.VectorKeyframeTrack(hips.name + '.position', times, positions));
    clips.push(new THREE.AnimationClip(moving ? 'CrouchWalk' : 'CrouchIdle', duration, tracks));
  }
  mixer.stopAllAction(); mixer.uncacheRoot(model);
  for (const [b, p, q] of base) { b.position.copy(p); b.quaternion.copy(q); }
  model.updateMatrixWorld(true);
  return clips;
}
