// Arte procedural compartilhada entre a abertura e os objetos de cena (TV da oficina, outdoors).
// Tudo desenhado em canvas 2D: sem imagens externas, sem identidade visual de outras obras.
const TICKER = 'URGENTE • MECÂNICO GAEL ROCHA EXPLODE REATOR MUNICIPAL • COMISSÃO DE MEMÓRIA PÚBLICA CONFIRMA: "TODOS NÓS VIMOS" • ORDEM CRONAL OFERECE RECOMPENSA • ';
export function drawBroadcast(g, w, h, t) {
  g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0a1a3a'); sky.addColorStop(1, '#020812');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  // grade do estúdio
  g.strokeStyle = 'rgba(80,160,255,.12)'; g.lineWidth = Math.max(1, w / 400);
  for (let x = 0; x < w; x += w / 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * .78); g.stroke(); }
  // âncora (silhueta)
  const ax = w * .28, ay = h * .78;
  g.fillStyle = '#16253f'; g.beginPath(); g.ellipse(ax, ay, w * .17, h * .2, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#1f3352'; g.beginPath(); g.arc(ax, ay - h * .3, h * .1, 0, 7); g.fill();
  g.fillStyle = '#c03040'; g.fillRect(ax - w * .012, ay - h * .2, w * .024, h * .14);
  // janela de "imagens exclusivas": um homem e um reator explodindo
  const ix = w * .52, iy = h * .12, iw = w * .42, ih = h * .5, k = (t % 4) / 4;
  g.fillStyle = '#1a0c06'; g.fillRect(ix, iy, iw, ih);
  const boom = g.createRadialGradient(ix + iw * .62, iy + ih * .55, 2, ix + iw * .62, iy + ih * .55, iw * (.25 + .25 * k));
  boom.addColorStop(0, '#fff6c0'); boom.addColorStop(.35, '#ff9a20'); boom.addColorStop(.7, 'rgba(200,40,10,.7)'); boom.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = boom; g.fillRect(ix, iy, iw, ih);
  g.fillStyle = '#0a0604'; for (let i = 0; i < 6; i++) g.fillRect(ix + iw * (.45 + i * .07), iy + ih * (.55 - (i % 3) * .1), iw * .05, ih * (.45 + (i % 3) * .1));
  g.fillStyle = '#000'; g.fillRect(ix + iw * .14, iy + ih * .45, iw * .09, ih * .55); g.beginPath(); g.arc(ix + iw * .185, iy + ih * .38, iw * .055, 0, 7); g.fill();
  g.fillStyle = '#ff2a2a'; g.font = `bold ${Math.round(h * .045)}px Arial`; g.textAlign = 'left'; g.fillText('● AO VIVO • IMAGENS EXCLUSIVAS', ix + 6, iy + ih - 8);
  g.strokeStyle = '#d8e8ff'; g.lineWidth = Math.max(2, w / 260); g.strokeRect(ix, iy, iw, ih);
  // faixas
  g.fillStyle = '#d0141e'; g.fillRect(0, h * .74, w, h * .1);
  g.fillStyle = '#fff'; g.font = `bold ${Math.round(h * .065)}px "Black Ops One", Impact, Arial`; g.fillText('PLANTÃO • GAEL ROCHA EXPLODE REATOR', w * .03, h * .815);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, h * .84, w, h * .09);
  g.fillStyle = '#0a1a3a'; g.font = `bold ${Math.round(h * .05)}px Arial`;
  const tw = g.measureText(TICKER).width, off = -((t * w * .18) % tw);
  g.fillText(TICKER + TICKER, off + w * .18, h * .9);
  g.fillStyle = '#0a1a3a'; g.fillRect(0, h * .84, w * .16, h * .09); g.fillStyle = '#ffd040'; g.fillText('NA-2', w * .025, h * .9);
  g.fillStyle = '#ffd040'; g.font = `bold ${Math.round(h * .05)}px Arial`; g.textAlign = 'right'; g.fillText('23:47', w * .97, h * .08);
  // scanlines e ruído
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  if (Math.sin(t * 13) > .93) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, (t * 97 % 1) * h, w, h * .05); }
  g.textAlign = 'left'; g.restore();
}
// Título com cromo, contorno e brilho (estilo pôster de ação dos anos 90, letras próprias do jogo).
export function chromeText(g, text, x, y, size, opt = {}) {
  g.save(); g.font = `${size}px ${opt.font || 'Bungee, Impact, "Arial Black", sans-serif'}`; g.textAlign = opt.align || 'center'; g.textBaseline = 'alphabetic';
  const top = y - size * .8, grad = g.createLinearGradient(0, top, 0, y + size * .1);
  const stops = opt.fire ? [[0, '#fff6c8'], [.35, '#ffcc33'], [.55, '#ff6a00'], [.56, '#c81e00'], [1, '#5a0a00']] : [[0, '#ffffff'], [.42, '#c9d3e0'], [.5, '#4a5568'], [.52, '#e8eef6'], [1, '#7a8696']];
  for (const [o, c] of stops) grad.addColorStop(o, c);
  g.lineJoin = 'round';
  g.lineWidth = size * .22; g.strokeStyle = '#0a0606'; g.strokeText(text, x, y + size * .05);
  g.lineWidth = size * .12; g.strokeStyle = opt.edge || '#c81e1e'; g.strokeText(text, x, y);
  g.shadowColor = opt.glow || 'rgba(255,120,30,.6)'; g.shadowBlur = size * .25; g.fillStyle = grad; g.fillText(text, x, y);
  g.restore();
}
// Fenda temporal: anéis de mostrador girando (abertura do Ato II e telas de carregamento).
export function drawRift(g, w, h, t, a = 1) {
  g.save(); g.translate(w / 2, h / 2);
  for (let r = 0; r < 9; r++) {
    const rad = (r + 1) * Math.min(w, h) * .055 * (1 + .04 * Math.sin(t * 2 + r)), rot = t * (r % 2 ? -.6 : .8) * (1 + r * .1);
    g.rotate(rot * .02); g.strokeStyle = r % 3 === 0 ? `rgba(53,230,255,${.55 * a})` : r % 3 === 1 ? `rgba(255,79,208,${.45 * a})` : `rgba(255,190,80,${.4 * a})`;
    g.lineWidth = 2 + (r % 3); g.setLineDash([rad * .2, rad * .12]); g.lineDashOffset = t * 60 * (r % 2 ? 1 : -1);
    g.beginPath(); g.arc(0, 0, rad, 0, 7); g.stroke();
    for (let k = 0; k < 12; k += 3) { const an = k / 12 * Math.PI * 2 + rot; g.fillStyle = `rgba(255,255,255,${.5 * a})`; g.fillRect(Math.cos(an) * rad - 2, Math.sin(an) * rad - 2, 4, 4); }
  }
  g.setLineDash([]); const core = g.createRadialGradient(0, 0, 0, 0, 0, Math.min(w, h) * .2);
  core.addColorStop(0, `rgba(255,255,255,${.9 * a})`); core.addColorStop(.4, `rgba(80,220,255,${.5 * a})`); core.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = core; g.beginPath(); g.arc(0, 0, Math.min(w, h) * .2, 0, 7); g.fill(); g.restore();
}
