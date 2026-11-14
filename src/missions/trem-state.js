// A2-M3 — regras puras do comboio. O trem fica parado nas coordenadas da fase e o mundo desliza por baixo
// (colisão estável para jogador e inimigos); estas funções decidem velocidade, distância e eventos.
export const TRAIN = { cruise: 16, accel: 2.2, bridgeSpeed: 12, bridgeTime: 10, decouple: 4.5, arriveTime: 8, beamGap: [17, 24], beamWarn: 2.2, beamFrom: 95, beamTo: -12 };
export function newTrain() { return { phase: 'station', speed: 0, dist: 0, t: 0, beamZ: null, beamWarnT: 0, beamCd: 14, car1: 'attached', decoupleT: 0, arriveLeft: 0 }; }
// distância que falta até parar, com desaceleração constante (a estação desliza exatamente isso até alinhar)
export const stopDistance = (v, time = TRAIN.arriveTime) => v * time / 2;
export function depart(T) { if (T.phase !== 'station') return false; T.phase = 'run'; T.t = 0; return true; }
export function startBridge(T) { if (T.phase !== 'run') return false; T.phase = 'bridge'; T.t = 0; return true; }
// avança o trem e devolve a lista de eventos do quadro
export function stepTrain(T, dt, onRoof = false, rand = Math.random) {
  const ev = [];
  T.t += dt;
  if (T.phase === 'run') {
    T.speed = Math.min(TRAIN.cruise, T.speed + TRAIN.accel * dt);
    // vigas de túnel/caixa d'água só ameaçam quem está no teto; aviso antes de toda passagem
    if (T.beamZ === null) {
      T.beamCd -= dt;
      if (T.beamCd <= 0 && T.speed > 8) { if (T.beamWarnT <= 0) { T.beamWarnT = TRAIN.beamWarn; ev.push('beamWarn'); } }
      if (T.beamWarnT > 0) { T.beamWarnT -= dt; if (T.beamWarnT <= 0) { T.beamZ = TRAIN.beamFrom; ev.push('beamStart'); } }
    } else {
      T.beamZ -= T.speed * dt;
      if (T.beamZ < TRAIN.beamTo) { T.beamZ = null; T.beamCd = TRAIN.beamGap[0] + rand() * (TRAIN.beamGap[1] - TRAIN.beamGap[0]); ev.push('beamEnd'); }
    }
  } else if (T.phase === 'bridge') {
    T.beamZ = null; T.beamWarnT = 0;
    T.speed += (TRAIN.bridgeSpeed - T.speed) * Math.min(1, dt * 1.5);
    if (T.car1 === 'attached' && T.t >= TRAIN.decouple) { T.car1 = 'falling'; T.decoupleT = 0; ev.push('decouple'); }
    if (T.t >= TRAIN.bridgeTime) { T.phase = 'arrive'; T.t = 0; T.arriveFrom = T.speed; T.arriveLeft = stopDistance(T.speed); ev.push('arrive'); }
  } else if (T.phase === 'arrive') {
    const k = Math.min(1, T.t / TRAIN.arriveTime);
    T.speed = T.arriveFrom * (1 - k);
    T.arriveLeft = T.arriveFrom * TRAIN.arriveTime / 2 * (1 - k) * (1 - k);
    if (k >= 1) { T.phase = 'stopped'; T.speed = 0; T.arriveLeft = 0; ev.push('stopped'); }
  }
  if (T.car1 === 'falling') { T.decoupleT += dt; if (T.decoupleT > 4) { T.car1 = 'gone'; ev.push('car1Gone'); } }
  T.dist += T.speed * dt;
  return ev;
}
export const beamHits = (T, p, crouched) => T.beamZ !== null && Math.abs(p.z - T.beamZ) < .9 && p.y > 3.9 && !crouched;
export const moving = (T) => T.phase === 'run' || T.phase === 'bridge' || T.phase === 'arrive';
// núcleo do reator: válvula primeiro (vapor escaldante), depois o núcleo
export function closeValve(S) { if (S.flags.valve_closed) return false; S.flags.valve_closed = true; return true; }
export function pullCore(S) { if (!S.flags.valve_closed || S.flags.loco_neutralized) return false; S.flags.loco_neutralized = true; return true; }
