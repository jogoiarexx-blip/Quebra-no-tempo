// Áudio sintetizado via Web Audio (sem arquivos). Liberado após o primeiro gesto do usuário.
let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null, musicTimer = null, step = 0, intensity = 0, guitar = null;
export const audio = { volume: 0.8, music: 0.5, started: false };
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ctx.createGain(); master.gain.value = audio.volume; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = audio.music * 0.5; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // barramento de guitarra: power chords sintetizados passam por distorção (riff do menu e das cenas)
  const shaper = ctx.createWaveShaper(), curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 7) * 0.8; }
  shaper.curve = curve; shaper.oversample = '2x';
  const tone2 = ctx.createBiquadFilter(); tone2.type = 'lowpass'; tone2.frequency.value = 2600; tone2.Q.value = 0.9;
  guitar = ctx.createGain(); guitar.gain.value = 0.55; guitar.connect(shaper); shaper.connect(tone2); tone2.connect(musicGain);
  audio.started = true; startMusic();
}
export function setVolumes() { if (!ctx) return; master.gain.value = audio.volume; musicGain.gain.value = audio.music * 0.5; }
export function setPaused(p) { if (!ctx) return; musicGain.gain.setTargetAtTime(p ? audio.music * 0.15 : audio.music * 0.5, ctx.currentTime, 0.1); }
export function setIntensity(v) { intensity = v; }
function tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, dest = sfxGain, when = 0) {
  if (!ctx) return; const t = ctx.currentTime + when; const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.3, freq = 1200, q = 0.7, type = 'lowpass', dest = sfxGain, when = 0) {
  if (!ctx) return; const t = ctx.currentTime + when; const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
// power chord: fundamental + quinta + oitava no barramento distorcido (dest pode ser o de efeitos nas cenas)
function chord(n, dur, vol = 0.22, when = 0, toSfx = false) {
  if (!ctx) return; const t = ctx.currentTime + when, g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(vol * 0.55, t + 0.04, 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const k of [0, 7, 12]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n + k); o.detune.value = (Math.random() - 0.5) * 12; o.connect(g); o.start(t); o.stop(t + dur + 0.05); }
  if (toSfx) { const sh = ctx.createWaveShaper(), c = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; c[i] = Math.tanh(x * 6) * 0.8; } sh.curve = c; g.connect(sh); sh.connect(sfxGain); }
  else g.connect(guitar);
}
export const sfx = {
  pistol() { noise(0.12, 0.5, 2600, 0.6); tone(170, 0.11, 'square', 0.22, -110); },
  shotgun() { noise(0.34, 0.75, 1300, 0.5); tone(95, 0.3, 'sawtooth', 0.32, -60); },
  empty() { tone(900, 0.04, 'square', 0.08); },
  reload() { tone(420, 0.05, 'square', 0.1); tone(620, 0.05, 'square', 0.1, 0, sfxGain, 0.18); },
  enemyShot() { tone(880, 0.14, 'sawtooth', 0.09, -500); },
  sniper() { tone(1500, 0.25, 'sawtooth', 0.16, -1300); noise(0.2, 0.25, 3000); },
  charge() { tone(300, 0.9, 'sine', 0.06, 900); },
  hit() { tone(1250, 0.05, 'square', 0.1); },
  head() { tone(1700, 0.06, 'square', 0.12); tone(2300, 0.07, 'square', 0.1, 0, sfxGain, 0.04); },
  kill() { tone(520, 0.08, 'triangle', 0.16); tone(780, 0.12, 'triangle', 0.16, 0, sfxGain, 0.07); },
  hurt() { noise(0.16, 0.35, 500); tone(130, 0.18, 'sawtooth', 0.2, -60); },
  explosion() { noise(0.9, 0.9, 420, 0.4); tone(60, 0.7, 'sine', 0.5, -30); },
  glass() { noise(0.35, 0.4, 5200, 2, 'highpass'); tone(2400, 0.2, 'triangle', 0.08, -1200); },
  pickup() { tone(660, 0.07, 'triangle', 0.14); tone(990, 0.1, 'triangle', 0.14, 0, sfxGain, 0.06); },
  seal() { [0, 0.09, 0.18, 0.3].forEach((w, i) => tone([523, 659, 784, 1047][i], 0.35, 'triangle', 0.16, 0, sfxGain, w)); noise(0.03, 0.2, 6000, 3, 'bandpass'); },
  door() { noise(0.6, 0.25, 300, 1); tone(70, 0.6, 'sawtooth', 0.12, 30); },
  ui() { tone(700, 0.04, 'square', 0.06); },
  punch() { noise(0.08, 0.35, 900, 1); tone(140, 0.08, 'square', 0.15, -60); },
  click() { tone(1200, 0.03, 'square', 0.07); },
  blackout() { tone(220, 1.2, 'sawtooth', 0.25, -200); noise(0.6, 0.5, 400, 0.6); },
  bang() { noise(0.25, 0.7, 600, 0.6); tone(70, 0.3, 'sine', 0.4, -30); },
  horn() { tone(196, 1.1, 'sawtooth', 0.18); tone(247, 1.1, 'sawtooth', 0.14); },
  train() { noise(3.5, 0.6, 250, 0.5); },
  elevator() { tone(80, 3.5, 'sawtooth', 0.08, 20); },
  eco() { tone(1400, 0.45, 'sine', 0.2, -1200); noise(0.4, 0.2, 3000, 4, 'bandpass'); },
  jump() { noise(0.07, 0.1, 700); },
  land() { noise(0.1, 0.22, 260); },
  roll() { noise(0.25, 0.16, 900, 1, 'bandpass'); },
  step() { noise(0.045, 0.06, 420); },
  power() { tone(60, 1.2, 'sawtooth', 0.18, 60); tone(240, 1.0, 'sine', 0.1, 240, sfxGain, 0.1); },
  portal() { tone(90, 1.4, 'sawtooth', 0.2, 500); noise(1.2, 0.25, 1800, 6, 'bandpass'); },
  gate() { [0, 0.15, 0.3, 0.45, 0.6].forEach((w, i) => tone(330 * Math.pow(1.26, i), 0.6, 'sine', 0.14, 0, sfxGain, w)); },
  death() { tone(220, 1.2, 'sawtooth', 0.22, -180); },
  crash() { noise(1.4, 0.9, 300, 0.5); tone(45, 1.2, 'sine', 0.5, -15); },
  talk() { tone(520, 0.05, 'sine', 0.05); },
  // Ato II, cenas e tela de carregamento
  cock() { tone(1900, 0.03, 'square', 0.08); tone(1200, 0.04, 'square', 0.08, 0, sfxGain, 0.07); },
  revolver() { noise(0.22, 0.6, 1800, 0.7); tone(140, 0.2, 'square', 0.2, -90); noise(0.5, 0.12, 900, 2, 'bandpass', sfxGain, 0.12); },
  fuse() { noise(0.9, 0.12, 5200, 3, 'bandpass'); },
  whoosh() { noise(0.35, 0.18, 900, 1.2, 'bandpass'); },
  bell() { for (const [f, v] of [[392, 0.2], [784, 0.08], [1176, 0.05], [523, 0.06]]) tone(f, 2.4, 'sine', v); noise(0.05, 0.2, 3000, 2, 'bandpass'); },
  note(i) { const f = [262, 330, 392, 494, 587, 698][i % 6]; tone(f, 1.1, 'triangle', 0.18); tone(f * 2, 0.5, 'sine', 0.05); noise(0.03, 0.06, 2500, 2, 'bandpass'); },
  piano(i) { const f = [196, 247, 294, 349][i % 4]; tone(f, 1.4, 'triangle', 0.2); tone(f * 2, 0.9, 'sine', 0.07); tone(f * 3, 0.4, 'sine', 0.03); },
  cart() { noise(1.4, 0.35, 380, 0.8); tone(55, 1.2, 'sawtooth', 0.07, 15); },
  drill() { tone(48, 1.5, 'sawtooth', 0.22, 20); noise(1.5, 0.3, 700, 1.5, 'bandpass'); },
  water() { noise(2.5, 0.25, 600, 0.6); },
  type() { tone(1500 + Math.random() * 300, 0.018, 'square', 0.035); },
  slam() { noise(1.2, 0.9, 260, 0.5); tone(42, 1.4, 'sine', 0.6, -12); chord(28, 1.6, 0.3, 0, true); },
  riffHit(n = 28) { chord(n, 0.5, 0.26, 0, true); },
  stinger() { [28, 28, 31, 33].forEach((n, i) => chord(n, i === 3 ? 1.2 : 0.18, 0.24, i * 0.17, true)); },
  boom() { noise(1.6, 1, 300, 0.5); tone(38, 1.6, 'sine', 0.6, -10); noise(0.6, 0.4, 2400, 0.7, 'lowpass', sfxGain, 0.05); },
  static() { noise(0.4, 0.12, 4000, 0.4, 'highpass'); },
  rifle() { noise(0.3, 0.75, 2000, 0.6); tone(110, 0.25, 'square', 0.25, -70); noise(0.15, 0.2, 1200, 2, 'bandpass', sfxGain, 0.32); tone(900, 0.04, 'square', 0.06, 0, sfxGain, 0.36); },
  whistle() { tone(587, 1.4, 'sine', 0.14); tone(740, 1.4, 'sine', 0.1); tone(880, 1.2, 'triangle', 0.05, 0, sfxGain, 0.1); },
  chug() { noise(0.12, 0.18, 300, 0.8); },
  spinup() { tone(120, 0.9, 'sawtooth', 0.09, 700); noise(0.9, 0.12, 2400, 2, 'bandpass'); },
  minigun() { noise(0.07, 0.42, 2200, 0.7); tone(210, 0.06, 'square', 0.12, -90); },
  pump() { noise(0.06, 0.25, 1400, 1); tone(300, 0.05, 'square', 0.08); noise(0.06, 0.25, 1100, 1, 'lowpass', sfxGain, 0.14); tone(240, 0.05, 'square', 0.08, 0, sfxGain, 0.14); },
  clang() { tone(1800, 0.12, 'triangle', 0.1, -500); tone(2600, 0.08, 'sine', 0.06); },
  neigh() { tone(700, 0.5, 'sawtooth', 0.06, 500); tone(1100, 0.35, 'sawtooth', 0.04, -600, sfxGain, 0.3); },
};
// Trilhas sintetizadas. 0 = rua (Ré menor, camada de combate dinâmica); 1..8 = jukebox/som do Véspera.
// A faixa 7 carrega o padrão escondido "três batidas, pausa, uma" (pista do GDD/A1-M1).
const TRACKS = [
  { bass: [38, 38, 41, 38, 45, 43, 38, 36], pad: true },
  { bass: [33, 33, 40, 33, 36, 36, 31, 31], kick: true, hat: true },
  { bass: [40, 40, 47, 40, 43, 43, 45, 38], kick: true, hat: true, lead: [64, 67, 71, 67] },
  { bass: [36, 36, 36, 43, 41, 41, 39, 38], kick: true, pad: true },
  { bass: [31, 38, 31, 38, 34, 41, 34, 41], kick: true, hat: true, lead: [62, 65, 69, 72] },
  { bass: [43, 43, 46, 46, 41, 41, 38, 38], kick: true },
  { bass: [35, 35, 35, 42, 40, 40, 38, 38], kick: true, hat: true, pad: true },
  { bass: [33, 33, 33, 33, 36, 36, 36, 36], kick: true, hidden: true },
  { bass: [45, 45, 48, 45, 43, 43, 40, 40], kick: true, hat: true, lead: [69, 72, 76, 79] },
  // 9: tema do menu — riff próprio de rock pesado (Mi menor), não reutiliza composição alguma
  { riff: [28, 28, null, 28, 31, null, 28, 33, 28, 28, null, 28, 34, 33, 31, 30], kick: true, snare: true, hat: true },
  // 10: Vale de Mercúrio — baixo "boom-chick", dedilhado e assobio
  { west: [40, 47, 44, 47, 38, 45, 42, 45], whistle: [76, 74, 71, 74, 79, 76, 74, 71] },
  // 11: Mina Treze — drone grave, gotas e batida distante
  { bass: [28, 28, 28, 28, 27, 27, 31, 31], pad: true, drips: true },
];
let track = 0, musicOn = true, alarmOn = false, alarmT = 0;
export function setTrack(i) { track = Math.max(0, Math.min(TRACKS.length - 1, i)); step = 0; }
export function setMusic(on) { musicOn = on; }
export function setAlarm(on) { alarmOn = on; }
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    if (alarmOn) { if (alarmT++ % 8 === 0) { tone(880, 0.5, 'square', 0.08, -300, sfxGain); tone(660, 0.5, 'square', 0.06, 300, sfxGain, 0.5); } }
    if (!musicOn) { step++; return; }
    const T = TRACKS[track];
    if (T.riff) {
      const r = T.riff[step % 16]; if (r !== null) chord(r, 0.2, 0.2, 0);
      if (step % 4 === 0) tone(110, 0.14, 'sine', 0.34, -75, musicGain);
      if (step % 8 === 4) noise(0.16, 0.28, 1800, 0.8, 'bandpass', musicGain);
      noise(0.03, 0.06, 8000, 1, 'highpass', musicGain);
      step++; return;
    }
    if (T.west) {
      const k = step % 16, b = T.west[(step >> 1) % T.west.length];
      if (k % 4 === 0) tone(midi(b - 12), 0.4, 'triangle', 0.2, 0, musicGain);
      if (k % 4 === 2) { for (const d of [12, 16, 19]) tone(midi(b + d), 0.16, 'square', 0.025, 0, musicGain); }
      if (k % 2 === 1) tone(midi(b + 12 + (k % 3) * 7), 0.12, 'triangle', 0.05, 0, musicGain);
      if (k === 0 && (step >> 4) % 2 === 1) T.whistle.forEach((w, i) => tone(midi(w), 0.38, 'sine', 0.045, 0, musicGain, i * 0.43));
      if (intensity > 0.2 && k % 2 === 0) noise(0.05, 0.12 * intensity, 6500, 1, 'highpass', musicGain);
      step++; return;
    }
    const n = T.bass[(step >> 1) % T.bass.length];
    if (T.drips && Math.random() < 0.08) tone(1600 + Math.random() * 900, 0.06, 'sine', 0.05, -700, musicGain);
    if (step % 2 === 0) { tone(midi(n), 0.34, 'sawtooth', 0.13, 0, musicGain); tone(midi(n + 12), 0.3, 'square', 0.035, 0, musicGain); }
    if (T.pad && step % 16 === 0) { for (const k of [0, 3, 7]) tone(midi(n + 24 + k), 3.4, 'sine', 0.035, 0, musicGain); }
    if (T.kick && step % 4 === 0) tone(110, 0.14, 'sine', 0.32, -75, musicGain);
    if (T.hat && step % 2 === 1) noise(0.04, 0.09, 7500, 1, 'highpass', musicGain);
    if (T.lead && step % 4 === 2) tone(midi(T.lead[(step >> 2) % T.lead.length]), 0.22, 'triangle', 0.06, 0, musicGain);
    if (T.hidden) { const k = step % 16; if (k === 0 || k === 2 || k === 4 || k === 10) tone(1760, 0.05, 'sine', 0.09, 0, musicGain); }
    if ((track === 0 || track === 11) && intensity > 0.2) { if (step % 4 === 0) tone(110, 0.12, 'sine', 0.3 * intensity, -70, musicGain); if (step % 4 === 2) noise(0.09, 0.2 * intensity, 4200, 1, 'highpass', musicGain); noise(0.03, 0.08 * intensity, 7000, 1, 'highpass', musicGain); }
    step++;
  }, 214);
}
