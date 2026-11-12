module.exports = async (p) => {
  console.log(await p.evaluate(() => {
    const a = QNT.P.actor, out = [];
    const rel = () => { a.root.updateMatrixWorld(true); const h = a.bones.Head.getWorldPosition(new a.root.position.constructor()), hip = a.bones.Hips.getWorldPosition(new a.root.position.constructor()), hand = a.bones.RightHand.getWorldPosition(new a.root.position.constructor());
      const inv = a.root.matrixWorld.clone().invert(); h.applyMatrix4(inv); hip.applyMatrix4(inv); hand.applyMatrix4(inv); return `headFwd=${(h.z - hip.z).toFixed(2)} handFwd=${(hand.z - hip.z).toFixed(2)} handUp=${(hand.y - hip.y).toFixed(2)}`; };
    a.root.rotation.y = 0.9;
    for (const anim of ['Idle', 'Running', 'Idle']) for (const [w, pitch] of [[1, 0.7], [1, 0.3], [1, 0], [1, -0.3], [1, -0.7]]) {
      a.play(anim, 0); a.aimTarget = w; a.aimW = w; a.pitch = pitch; a.update(0.016); out.push(`${anim} aim=${w} pitch=${pitch}: ${rel()}`);
    }
    return out.join('\n');
  }));
};
