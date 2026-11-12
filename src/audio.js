// Áudio sintetizado via Web Audio (sem arquivos). Liberado após o primeiro gesto do usuário.
let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null, musicTimer = null, step = 0, intensity = 0;
export const audio = { volume: 0.8, music: 0.5, started: false };
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ctx.createGain(); master.gain.value = audio.volume; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = audio.music * 0.5; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
};
// Trilha: baixo sintetizado em Ré menor + pad; camada de percussão cresce com a intensidade do combate.
const BASS = [38, 38, 41, 38, 45, 43, 38, 36];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    const n = BASS[(step >> 1) % BASS.length];
    if (step % 2 === 0) { tone(midi(n), 0.34, 'sawtooth', 0.13, 0, musicGain); tone(midi(n + 12), 0.3, 'square', 0.035, 0, musicGain); }
    if (step % 16 === 0) { for (const k of [0, 3, 7]) tone(midi(n + 24 + k), 3.4, 'sine', 0.035, 0, musicGain); }
    if (intensity > 0.2) { if (step % 4 === 0) tone(110, 0.12, 'sine', 0.3 * intensity, -70, musicGain); if (step % 4 === 2) noise(0.09, 0.2 * intensity, 4200, 1, 'highpass', musicGain); noise(0.03, 0.08 * intensity, 7000, 1, 'highpass', musicGain); }
    step++;
  }, 214);
}
