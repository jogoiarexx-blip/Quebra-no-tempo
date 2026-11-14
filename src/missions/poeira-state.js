// A2-M1 — regras puras e serializáveis (piano, relógio-mestre, cofre e duelo). Sem cena: testáveis em Node.
export const PIANO_KEYS = ['Lua', 'Sino', 'Rio', 'Ferro'];
export const PIANO_ORDER = [1, 2, 0, 3];                 // "o Sino chama, o Rio corre, a Lua escuta, o Ferro fecha"
export const DUEL_WINDOW = { turista: 0.85, mercenario: 0.6, paradoxo: 0.45 };

export function pressPianoKey(S, key) {
  if (S.flags.piano_solved || key < 0 || key > 3) return 'ignored';
  S.piano = S.piano || [];
  S.piano.push(key);
  const i = S.piano.length - 1;
  if (S.piano[i] !== PIANO_ORDER[i]) { S.piano = key === PIANO_ORDER[0] ? [key] : []; return 'wrong'; }
  if (S.piano.length === PIANO_ORDER.length) { S.flags.piano_solved = true; S.piano = []; return 'solved'; }
  return 'ok';
}
export const knowsClockCode = (S) => !!(S.flags.irene_told || S.flags.notebook_read);
export function setMasterClock(S) { if (S.flags.clock_set || !knowsClockCode(S)) return false; S.flags.clock_set = true; return true; }
export function openSafe(S) { if (!S.flags.clock_set || S.flags.map_taken) return false; S.flags.map_taken = true; return true; }

// Duelo sob o relógio: três badaladas, a terceira é o saque. Atirar antes = desonra; depois da janela = lento.
export function startDuel(S, rand = Math.random) {
  if (!S.flags.duel_ready || S.flags.duel_resolved || (S.duel && S.duel.phase !== 'idle')) return false;
  S.duel = { phase: 'count', t: 0, drawAt: 3.0 + rand() * 1.2, bells: 0, result: null };
  return true;
}
// Avança o duelo. Retorna eventos para a apresentação: 'bell', 'draw', 'win', 'early', 'slow'.
export function stepDuel(S, dt, fired, difficulty = 'mercenario') {
  const d = S.duel, ev = [];
  if (!d || (d.phase !== 'count' && d.phase !== 'draw')) return ev;
  d.t += dt;
  const window = DUEL_WINDOW[difficulty] ?? DUEL_WINDOW.mercenario;
  if (d.phase === 'count') {
    if (fired && d.t > 0.35) { d.phase = 'done'; d.result = 'early'; ev.push('early'); return ev; }
    const due = d.t >= d.drawAt ? 3 : d.t >= 2 ? 2 : d.t >= 1 ? 1 : 0;
    while (d.bells < due) { d.bells++; ev.push(d.bells === 3 ? 'draw' : 'bell'); }
    if (d.bells >= 3) d.phase = 'draw';
    return ev;
  }
  if (fired) { d.phase = 'done'; d.result = 'win'; ev.push('win'); }
  else if (d.t > d.drawAt + window) { d.phase = 'done'; d.result = 'slow'; ev.push('slow'); }
  return ev;
}
