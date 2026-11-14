// Tela de carregamento entre missões: arte procedural por fase, briefing, dica atrevida do Gael e progresso
// REAL por etapa (GDD §10.2 — nada de barra falsa presa em 99%). Termina em "pressione para detonar",
// o que também garante o gesto do usuário para capturar o mouse.
import { chromeText } from './broadcast.js';
const $ = (id) => document.getElementById(id);
export const BRIEF = {
  'A1-M1': ['ATO I • NOVA AURORA, 2039', 'Oficina, beco, avenida, loja e a passarela até a subestação. Recupere o bracelete, siga o sinal falso e ligue os disjuntores.'],
  'A1-M2': ['ATO I • NOVA AURORA, 2039', 'Clube Véspera: o show esconde um sinal. Converse, investigue o painel de luz e segure a invasão até o metrô.'],
  'A1-M3': ['ATO I • NOVA AURORA, 2039', 'Usina Norte: feche as válvulas ou use o guindaste, salve o backup do Cifra e corte a descarga no terraço.'],
  'A1-M4': ['ATO I • NOVA AURORA, 2039', 'Núcleo de Ruptura: neutralize o gerador, pegue o Rompe-Casco e derrube o Leviatã de Aço.'],
  'A2-M1': ['ATO II • VALE DE MERCÚRIO, 1888', 'Poeira Alta: proteja a cantora Irene Vidal, abra o cofre da relojoaria e encare o pistoleiro sob o relógio da praça.'],
  'A2-M4': ['ATO II • VALE DE MERCÚRIO, 1888', 'Forte Meia-Noite: cale os canhões de muralha, tome o pátio, recupere a Âncora do Oeste e enfrente o Marechal Ferrugem — pule os golpes baixos e abra as válvulas para expor as juntas.'],
  'A2-M3': ['ATO II • VALE DE MERCÚRIO, 1888', 'O Trem de Ferro: embarque em movimento, avance vagão por vagão (cuidado com as vigas no teto), pegue a Ferrovia e pare a locomotiva antes da ponte.'],
  'A2-M2': ['ATO II • VALE DE MERCÚRIO, 1888', 'Mina Treze: estoure os tanques das perfuratrizes temporais, fuja da que está viva e drene a represa até o elevador.'],
};
export const TIPS = [
  'Barril vermelho é munição grátis com efeito especial. Mire nele quando eles se agruparem.',
  'Esquiva (Alt/Z) tem invencibilidade curta. Use antes de levar o tiro, não depois.',
  'O Eco Cronal desfaz três segundos de besteira. Só não desfaz vergonha.',
  'O Bruto Réptil tem placa de aço na frente. Atire nas pernas, nas costas ou leve um foguete.',
  'Ouviu a minigun girando? Você tem um segundo pra achar uma parede.',
  'Dinamite acesa desenha um anel no chão. Se você está dentro do anel, você está errado.',
  'Pistoleiro brilha o cano antes do tiro forte. Brilhou? Parede.',
  'No duelo, a terceira badalada é o sinal. Na segunda, você é só um cara nervoso com uma arma.',
  'Cabeça vale mais. É ciência. Ou estilo. Os dois.',
  'Agachar (C) passa por dutos. Ninguém procura gente em duto. Ninguém tem dignidade em duto.',
  'Selos: dois bastam. O terceiro é para quem gosta de se exibir. Eu gosto.',
  'Vagão de mina não freia. Nem pede desculpa. Olhe a luz vermelha.',
  'No teto do trem, viga é professora: ensina a agachar na primeira aula.',
  'A Ferrovia fura um e acerta o de trás. Fila indiana é um presente.',
  'Recarregue atrás da cobertura. Recarregar na frente é só um jeito caro de dizer "oi".',
  'Coronhada (F) economiza munição e ego. Principalmente o deles.',
  'Explore: segredos rendem Peças Cronais. E piadas que só eu acho graça.',
];
// Ilustração por missão: silhuetas e luz da época, tudo vetorial.
function drawArt(g, w, h, id, t) {
  const era2 = id.startsWith('A2'), mine = id === 'A2-M2';
  const sky = g.createLinearGradient(0, 0, 0, h);
  if (mine) { sky.addColorStop(0, '#05060c'); sky.addColorStop(.6, '#160f0a'); sky.addColorStop(1, '#2a1a10'); }
  else if (id === 'A2-M4') { sky.addColorStop(0, '#04060e'); sky.addColorStop(.6, '#1a1428'); sky.addColorStop(1, '#4a2418'); }
  else if (era2) { sky.addColorStop(0, '#1e2a54'); sky.addColorStop(.55, '#e07a3e'); sky.addColorStop(1, '#ffb066'); }
  else { sky.addColorStop(0, '#070b18'); sky.addColorStop(.65, '#1a1c3a'); sky.addColorStop(1, '#4a1c3a'); }
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const base = h * .82;
  if (id === 'A2-M4') {
    g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(w * .8, h * .2, h * .06, 0, 7); g.fill();
    g.fillStyle = '#0e0a10'; g.beginPath(); g.moveTo(0, base); g.lineTo(0, base - h * .22); for (let x = 0; x <= w; x += w / 14) g.lineTo(x, base - h * (.2 + .06 * Math.abs(Math.sin(x * .02)))); g.lineTo(w, base); g.fill();
    g.fillRect(w * .3, base - h * .42, w * .4, h * .24); for (let i = 0; i < 6; i++) g.fillRect(w * .3 + i * w * .07, base - h * .46, w * .035, h * .04);
    g.fillRect(w * .46, base - h * .6, w * .08, h * .2);
    g.fillStyle = '#ff7a28'; g.fillRect(w * .47, base - h * .3, w * .06, h * .1); g.fillStyle = 'rgba(255,122,40,.35)'; g.beginPath(); g.arc(w * .5, base - h * .25, h * (.12 + .01 * Math.sin(t * 6)), 0, 7); g.fill();
    g.fillStyle = 'rgba(210,205,195,.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w * (.34 + i * .08) + Math.sin(t + i) * 6, base - h * (.5 + i % 2 * .05), h * .035, 0, 7); g.fill(); }
  } else if (id === 'A2-M3') {
    g.fillStyle = '#ffd28a'; g.beginPath(); g.arc(w * .2, base - h * .12, h * .1, 0, 7); g.fill();
    g.fillStyle = '#7a4a34'; g.fillRect(0, base - h * .05, w, h * .05);
    g.fillStyle = '#140a06'; const tx = w * .18 + ((t * 40) % (w * .1));
    for (let i = 0; i < 5; i++) g.fillRect(tx + i * w * .13, base - h * .2, w * .12, h * .15);
    g.fillRect(tx + w * .65, base - h * .26, w * .16, h * .21); g.fillRect(tx + w * .75, base - h * .36, w * .03, h * .12);
    g.fillStyle = 'rgba(200,190,170,.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(tx + w * .76 - i * w * .04, base - h * (.4 + i * .04), h * (.03 + i * .01), 0, 7); g.fill(); }
    for (let x = 0; x < w; x += w / 40) { g.fillStyle = '#2a1a0e'; g.fillRect(x, base - h * .045, w / 120, h * .04); }
  } else if (era2 && !mine) {
    g.fillStyle = '#ffd28a'; g.beginPath(); g.arc(w * .72, base - h * .08, h * .12, 0, 7); g.fill();
    g.fillStyle = '#7a4a34'; g.beginPath(); g.moveTo(0, base - h * .1); for (let x = 0; x <= w; x += w / 12) g.lineTo(x, base - h * (.12 + .08 * Math.abs(Math.sin(x * .013)))); g.lineTo(w, base); g.lineTo(0, base); g.fill();
    g.fillStyle = '#1a0e08';
    for (let i = 0; i < 9; i++) { const x = w * (.04 + i * .1), bw = w * .08, bh = h * (.14 + (i % 3) * .05); g.fillRect(x, base - bh, bw, bh); g.fillRect(x - bw * .05, base - bh - h * .03, bw * 1.1, h * .03); }
    g.fillRect(w * .46, base - h * .45, w * .07, h * .45); g.beginPath(); g.moveTo(w * .44, base - h * .45); g.lineTo(w * .495, base - h * .55); g.lineTo(w * .55, base - h * .45); g.fill();
    g.fillStyle = '#efe4c4'; g.beginPath(); g.arc(w * .495, base - h * .36, h * .035, 0, 7); g.fill();
  } else if (mine) {
    g.fillStyle = '#0d0907'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w * .72, h); g.lineTo(w * .64, h * .3); g.lineTo(w * .36, h * .3); g.lineTo(w * .28, h); g.lineTo(0, h); g.fill();
    g.strokeStyle = '#5a3a20'; g.lineWidth = w * .02; g.strokeRect(w * .36, h * .3, w * .28, h * .7);
    g.strokeStyle = '#8a8a90'; g.lineWidth = 4; g.beginPath(); g.moveTo(w * .47, h); g.lineTo(w * .49, h * .45); g.moveTo(w * .53, h); g.lineTo(w * .51, h * .45); g.stroke();
    for (let i = 0; i < 7; i++) { const x = w * (.1 + i * .13), y = h * (.2 + (i % 3) * .2), a = .5 + .5 * Math.sin(t * 2 + i); g.fillStyle = `rgba(58,255,208,${.35 + .4 * a})`; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 9, y); g.lineTo(x, y + 14); g.lineTo(x - 9, y); g.fill(); }
    g.fillStyle = 'rgba(255,170,80,.25)'; g.beginPath(); g.arc(w * .5, h * .5, h * .2, 0, 7); g.fill();
  } else {
    for (let i = 0; i < 26; i++) { const x = i * w / 25, bh = h * (.2 + .35 * Math.abs(Math.sin(i * 7.3))); g.fillStyle = '#0b0e1a'; g.fillRect(x, base - bh, w / 26 + 2, bh); g.fillStyle = 'rgba(255,200,107,.5)'; for (let k = 0; k < 6; k++) if ((i * 7 + k * 3) % 5 === 0) g.fillRect(x + 4, base - bh + 10 + k * 14, 4, 5); }
    const neon = id === 'A1-M2' ? '#ff4fd0' : id === 'A1-M3' ? '#ff8a3a' : id === 'A1-M4' ? '#9a5cff' : '#35e6ff';
    g.strokeStyle = neon; g.lineWidth = 3; g.shadowColor = neon; g.shadowBlur = 20; g.beginPath(); g.moveTo(0, base - h * .02); g.lineTo(w, base - h * .02); g.stroke(); g.shadowBlur = 0;
    if (id === 'A1-M4') { g.fillStyle = '#05060c'; g.fillRect(w * .62, base - h * .32, w * .2, h * .2); g.fillRect(w * .6, base - h * .12, w * .06, h * .12); g.fillRect(w * .78, base - h * .12, w * .06, h * .12); g.fillStyle = '#ff3048'; g.fillRect(w * .7, base - h * .27, w * .04, h * .02); }
    if (id === 'A1-M3') { g.fillStyle = '#05060c'; for (const x of [.6, .7, .8]) g.fillRect(w * x, base - h * .5, w * .04, h * .5); }
    for (let i = 0; i < 70; i++) { const x = (i * 97 + t * 160) % w, y = (i * 53 + t * 520) % h; g.strokeStyle = 'rgba(160,190,230,.25)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14); g.stroke(); }
  }
  g.fillStyle = '#000'; g.fillRect(0, base, w, h - base);
  const fade = g.createLinearGradient(0, 0, w, 0); fade.addColorStop(0, 'rgba(0,0,0,.9)'); fade.addColorStop(.55, 'rgba(0,0,0,.25)'); fade.addColorStop(1, 'rgba(0,0,0,.1)');
  g.fillStyle = fade; g.fillRect(0, 0, w, h);
}
export function createLoading({ sfx }) {
  const el = $('loading'), cv = $('loadArt'), g = cv.getContext('2d'), title = $('loadTitle'), tg = title.getContext('2d');
  let id = null, raf = 0, t0 = 0, waiting = null, tip = 0;
  const resize = () => { const r = Math.min(devicePixelRatio || 1, 1.5); cv.width = innerWidth * r; cv.height = innerHeight * r; title.width = Math.min(1100, innerWidth * .9) * r; title.height = Math.min(260, innerWidth * .2) * r; };
  addEventListener('resize', resize);
  function loop() { raf = requestAnimationFrame(loop); const t = (performance.now() - t0) / 1000; drawArt(g, cv.width, cv.height, id, t); }
  function onGo(e) {
    if (!waiting) return; if (e && e.type === 'keydown' && ['Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return;
    const fn = waiting; waiting = null; removeEventListener('keydown', onGo, true); el.removeEventListener('pointerdown', onGo);
    e?.preventDefault?.(); e?.stopPropagation?.(); sfx.riffHit?.(); fn();
  }
  return {
    get visible() { return el.classList.contains('on'); },
    get waiting() { return !!waiting; },
    show(mission) {
      id = mission.id; resize(); el.classList.add('on'); t0 = performance.now(); cancelAnimationFrame(raf); loop();
      const [kicker, brief] = BRIEF[id] || ['', ''];
      $('loadKicker').textContent = `${kicker} • ${id}`; $('loadBrief').textContent = brief;
      tip = (tip + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length; $('loadTip').textContent = TIPS[tip];
      $('loadSteps').innerHTML = ''; $('loadBar').style.width = '0%'; $('loadPct').textContent = '0%'; $('loadGo').classList.remove('on');
      tg.clearRect(0, 0, title.width, title.height);
      const size = Math.min(title.height * .62, title.width / Math.max(6, mission.name.length * .78));
      chromeText(tg, mission.name.toUpperCase(), title.width / 2, title.height * .72, size, { fire: id.startsWith('A2'), edge: id.startsWith('A2') ? '#ffb030' : '#c81e1e' });
    },
    step(label, frac) {
      const li = document.createElement('li'); li.innerHTML = `${label}<b>OK</b>`; $('loadSteps').appendChild(li);
      const p = Math.round(frac * 100); $('loadBar').style.width = p + '%'; $('loadPct').textContent = p + '%'; sfx.click?.();
    },
    ready(fn) { $('loadGo').classList.add('on'); waiting = fn; addEventListener('keydown', onGo, true); el.addEventListener('pointerdown', onGo); },
    padGo() { if (waiting) onGo(null); },
    hide() { el.classList.remove('on'); cancelAnimationFrame(raf); waiting = null; removeEventListener('keydown', onGo, true); el.removeEventListener('pointerdown', onGo); },
  };
}
