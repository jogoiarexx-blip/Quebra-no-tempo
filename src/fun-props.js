// Objetos cômicos interativos por fase (GDD §29.1 e §30): TV com noticiário falso, máquinas, banheiro que
// julga, cavalo, casinha... Só decoração + interação: sem colisor novo, então nenhuma rota antiga muda.
// Recompensas pequenas e únicas por partida (S.oneShots), nunca condição de conclusão.
import * as THREE from 'three';
import { canvasTex } from './world.js';
import { drawBroadcast } from './broadcast.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function label(lines, w = 256, h = 320, bg = '#151a24', ink = '#ffd070', accent = '#ff3048') {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = accent; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.textAlign = 'center'; let y = 46;
    for (const [txt, size, col] of lines) { g.font = `bold ${size}px "Black Ops One", Impact, Arial`; g.fillStyle = col || ink; g.fillText(txt, w / 2, y); y += size * 1.25; }
  }, false);
}
function plane(L, tex, w, h, x, y, z, ry) { const m = L.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), x, y, z); m.rotation.y = ry; return m; }
function box(L, mat, w, h, d, x, y, z) { return L.mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z); }
// Fala em sequência (cada uso avança uma linha) e recompensa opcional na primeira vez.
function talker(id, pos, text, lines, reward) {
  return { id, pos, text, use(X, api) {
    const S = X.S; S.props = S.props || {}; const n = S.props[id] = (S.props[id] || 0) + 1;
    const line = lines[(n - 1) % lines.length]; for (const [who, t] of Array.isArray(line[0]) ? line : [line]) X.say(who, t);
    if (reward && X.once('prop_' + id)) reward(X, api);
    api.sfx(id);
  } };
}
const heal = (n) => (X, api) => api.heal(n);
const armor = (n) => (X, api) => api.armor(n);
export function buildProps(L, id, campaign = { flags: {} }) {
  const M = L.M, props = [], frames = [];
  if (id === 'A1-M1') {
    // TV na bancada da oficina exibe o mesmo noticiário falso da abertura
    const c = document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    box(L, M.dark, 1.3, .9, .5, 3.9, 1.42, 11.3); box(L, M.metal, .5, .08, .3, 3.9, .99, 11.3);
    const scr = L.mesh(new THREE.PlaneGeometry(1.14, .74), new THREE.MeshBasicMaterial({ map: tex }), 3.9, 1.43, 11.04); scr.rotation.y = Math.PI;
    const glow = L.light(3.9, 1.5, 10.3, 0x6aa8ff, 7, 5); let acc = 1;
    frames.push((t, dt, p) => { acc += dt; glow.intensity = 5 + Math.sin(t * 17) * 1.5 + (Math.sin(t * 3.1) > .9 ? 3 : 0); if (acc > .09 && (!p || p.distanceToSquared(scr.position) < 196)) { acc = 0; drawBroadcast(g, c.width, c.height, t); tex.needsUpdate = true; } });
    L.tv = scr;
    props.push(talker('tv', V(3.9, 1.3, 10.1), 'Assistir ao noticiário', [
      [['PLANTÃO NA-2', 'Especialistas confirmam: o rosto de Gael Rocha sempre foi suspeito.'], ['GAEL', 'Especialista em quê? Em mentir em horário nobre?']],
      [['PLANTÃO NA-2', 'Lembre-se: se você não lembra, a Comissão lembra por você.'], ['GAEL', 'Que conveniente. Eu também esqueço de pagar boleto assim.']],
      [['PLANTÃO NA-2', 'Intervalo comercial: Premium Ontem — recupere o dia de ontem por 9,99 ao mês.'], ['GAEL', 'Vou assinar e devolver o dia de ontem inteiro.']],
    ]));
    // máquina de café no beco
    box(L, M.metal, .65, 2, 1.2, 3.62, 1, 33.6); plane(L, label([['CAFÉ', 44, '#ffd070'], ['PARADOXO', 34, '#35e6ff'], ['o café de', 20, '#cfd8e8'], ['AMANHÃ', 28, '#ff3048'], ['HOJE!', 28, '#ff3048']]), .9, 1.12, 3.285, 1.3, 33.6, -Math.PI / 2);
    L.light(3.0, 1.6, 33.6, 0x35e6ff, 6, 4);
    props.push(talker('coffee', V(2.75, 1.2, 33.6), 'Café Paradoxo', [[['GAEL', 'Café que eu ainda vou tomar amanhã. Gosto de arrependimento antecipado.']], [['GAEL', 'Segundo copo? Melhor não. Eu ia ficar acordado até ontem.']]], heal(15)));
    // outdoor "Premium Ontem" (GDD §29.1)
    plane(L, label([['PREMIUM', 64, '#ffd070'], ['ONTEM', 76, '#ff3048'], ['RECUPERE O DIA', 30, '#ffffff'], ['DE ONTEM POR', 30, '#ffffff'], ['9,99/MÊS*', 46, '#35e6ff'], ['*memórias sujeitas', 18, '#9aa3b2'], ['a revisão editorial', 18, '#9aa3b2']], 360, 420, '#0d0f1e', '#ffd070', '#ff4fd0'), 6, 7, -13.94, 6.5, 60, Math.PI / 2);
    L.light(-12.5, 7, 60, 0xff4fd0, 12, 9);
    props.push(talker('billboard', V(-13.1, 1.3, 60), 'Ler o outdoor', [[['GAEL', 'Recuperar o dia de ontem por assinatura. E eu achando que o golpe era o reator.']], [['ÍRIS-9', 'Letras miúdas: memórias sujeitas a revisão editorial.'], ['GAEL', 'Ou seja: eles escolhem o que você lembra. Que ótimo.']]]));
    // cartaz do museu: muda se a chapa fotográfica de 1888 foi salva (efeito entre eras, GDD §12)
    const saved = !!campaign.flags?.photo_saved_1888;
    plane(L, label(saved ? [['MUSEU DE', 28], ['NOVA AURORA', 34], ['NOVA EXPOSIÇÃO', 22, '#ffffff'], ['OS APAGADOS', 30, '#35e6ff'], ['DE 1888', 30, '#35e6ff'], ['Família Albuquerque', 20, '#cfd8e8'], ['foto original', 20, '#cfd8e8']] : [['MUSEU DE', 28], ['NOVA AURORA', 34], ['EXPOSIÇÃO', 24, '#ffffff'], ['FECHADA', 30, '#ff3048'], ['Acervo de 1888', 20, '#cfd8e8'], ['"em revisão"', 20, '#cfd8e8']], 256, 320, '#14100a', '#ffd070', saved ? '#35e6ff' : '#ff3048'), 1.6, 2, 13.94, 2.2, 50, -Math.PI / 2);
    props.push(talker('museum', V(13.1, 1.3, 50), 'Ler o cartaz do museu', saved ? [[['ÍRIS-9', 'A chapa que você salvou em 1888 está exposta. A família Albuquerque voltou para a história.'], ['GAEL', 'Pelo menos uma coisa nesta cidade lembra direito.']]] : [[['ÍRIS-9', 'O acervo de 1888 está "em revisão". Alguém apagou registros daquela época.'], ['GAEL', 'Anotado. Se eu passar por 1888, procuro um fotógrafo.']]]));
  }
  if (id === 'A1-M2') {
    const white = new THREE.MeshPhongMaterial({ color: 0xf2f4f8, shininess: 90 });
    box(L, white, .5, .42, .66, -15.5, .21, 40.55); box(L, white, .52, .5, .2, -15.3, .66, 40.55); const eye = box(L, M.neonCyan, .2, .05, .02, -15.55, .78, 40.45);
    props.push(talker('toilet', V(-16.4, 1.0, 40.55), 'Usar o vaso inteligente', [
      [['VASO INTELIGENTE', 'Análise concluída. Detectei pólvora, perfume barato e decisões questionáveis.'], ['GAEL', 'Até o banheiro tem opinião em 2039.']],
      [['VASO INTELIGENTE', 'Sua nota social caiu 3 pontos. Motivo: conversar com o vaso.'], ['GAEL', 'Justo.']],
      [['VASO INTELIGENTE', 'Dica de saúde: pare de levar tiros.'], ['GAEL', 'Anotado. Vou repassar pra eles.']],
    ]));
    frames.push((t) => { eye.scale.x = .6 + .4 * Math.abs(Math.sin(t * 2)); });
  }
  if (id === 'A1-M3') {
    box(L, M.metal, 1, 1.9, .8, -22.9, .95, 10.5); box(L, M.dark, .04, 1.7, .02, -22.38, .95, 10.5);
    props.push(talker('fridge', V(-21.8, 1.2, 10.5), 'Abrir a geladeira do turno', [[['GAEL', 'Marmita com etiqueta: "NÃO É SUA — turno 03". Agora é.']], [['GAEL', 'Só sobrou um iogurte vencido em 2037. Ele que fique.']]], heal(15)));
    props.push(talker('turbine', V(-4.4, 1.3, 93), 'Observar a turbina', [[['GAEL', 'Faz café?'], ['ÍRIS-9', 'É um estabilizador de falhas temporais de doze toneladas.'], ['GAEL', 'Perguntei porque faz um barulho parecido.']], [['GAEL', 'Se eu chutar, ela volta a funcionar? Comigo, a geladeira funciona assim.']]]));
  }
  if (id === 'A1-M4') {
    box(L, M.metal, .7, 2.2, 1.2, -19.05, 1.1, 92.6);
    plane(L, label([['KIT', 40, '#ffd070'], ['SOBREVIVÊNCIA', 24, '#ffffff'], ['PREMIUM', 34, '#ff4fd0'], ['3x sem juros', 22, '#35e6ff'], ['pague com', 20, '#cfd8e8'], ['memórias', 20, '#cfd8e8']], 256, 320, '#100a16'), .9, 1.12, -18.69, 1.3, 92.6, Math.PI / 2);
    props.push(talker('vending4', V(-18.1, 1.2, 92.6), 'Máquina de sobrevivência', [[['MÁQUINA', 'Kit liberado. Débito: uma lembrança de infância escolhida aleatoriamente.'], ['GAEL', 'Pode levar a da escola. Aquela foi ruim mesmo.']], [['MÁQUINA', 'Estoque esgotado. Assine o plano Apocalipse+.'], ['GAEL', 'O apocalipse agora tem plano. Claro que tem.']]], armor(15)));
  }
  if (id === 'A2-M1') {
    const bottle = box(L, new THREE.MeshLambertMaterial({ color: 0x3a8a3a, transparent: true, opacity: .85 }), .14, .4, .14, -13.6, 1.75, 62.6);
    props.push(talker('cactus', V(-13.6, 1.3, 61.4), 'Provar o uísque de cacto', [[['GAEL', 'Uísque de cacto. Desce rasgando e sobe pedindo desculpa.']], [['GAEL', 'Segunda dose? Não. Eu preciso enxergar só um pistoleiro por vez.']]], heal(15)));
    frames.push((t) => { bottle.rotation.y = t * .3; });
    box(L, L.M.boards, 1.2, 2.3, 1.2, 11, 1.15, 2); const moon = box(L, M.dark, .05, .25, .25, 10.39, 1.9, 2);
    props.push(talker('outhouse', V(9.6, 1.2, 2), 'Bater na casinha', [[['VOZ LÁ DENTRO', 'Ocupado. Há cento e trinta e oito anos.'], ['GAEL', 'Respeito. Vou esperar o próximo século.']], [['VOZ LÁ DENTRO', 'Já falei: ocupado!']]]));
    props.push(talker('horse', V(-21.2, 1.4, 95.6), 'Fazer carinho no cavalo', [[['GAEL', 'Calma, garoto. Eu também não sei o que estou fazendo aqui.']], [['GAEL', 'Ele me olhou com mais respeito que o xerife.']], [['GAEL', 'Se eu sobreviver, volto com uma maçã. Ou um carro. O que vier primeiro.']]]));
  }
  if (id === 'A2-M3') {
    plane(L, label([['CARDÁPIO', 36], ['ENSOPADO DO', 22, '#ffffff'], ['MAQUINISTA', 26, '#ffffff'], ['café com', 20, '#cfd8e8'], ['fuligem', 24, '#ff3048'], ['grátis!', 22, '#35e6ff']], 256, 320, '#1a120a'), .7, .9, .89, 2.0, 26.6, -Math.PI / 2);
    props.push(talker('stew', V(.2, 1.6, 26.6), 'Pedir o ensopado do maquinista', [[['GAEL', 'Ensopado de vagão em movimento. Metade na boca, metade na camisa.']], [['GAEL', 'Sem repetição: o cozinheiro pulou do trem.']]], heal(15)));
  }
  if (id === 'A2-M4') {
    plane(L, label([['PROCURADO', 34], ['VIVO OU', 22, '#ffffff'], ['ATRASADO', 28, '#ff3048'], ['G. Cronal', 22, '#cfd8e8'], ['$ 40 PEÇAS', 24, '#ffd23a']], 256, 320, '#d8c090', '#2a1608'), 1.7, 2.2, 8, 1.9, 57.9, 0);
    props.push(talker('wanted', V(8, 1.2, 57), 'Olhar o cartaz de procurado', [[['GAEL', 'Quarenta peças. Nem o desenho me favoreceu.']], [['GAEL', 'Pelo menos escreveram meu nome certo. É um começo.']]]));
    box(L, M.iron, .5, .5, .5, 9.6, 0.25, 118);
    props.push(talker('coal_pile', V(9.6, 1.1, 118.6), 'Examinar o carvão da fornalha', [[['GAEL', 'Carvão de primeira. Pena que vai ser usado para cozinhar a gente.']], [['ÍRIS-9', 'Sem piadas perto de combustível, por favor.']]]));
  }
  if (id === 'A2-M2') {
    const cage = new THREE.Group(); cage.position.set(-10.5, 2.0, 12.7); L.root.add(cage);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(.02, .5, .02), M.brass); b.position.set(Math.cos(a) * .2, 0, Math.sin(a) * .2); cage.add(b); }
    const bird = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffd23a })); bird.position.y = -.08; cage.add(bird);
    frames.push((t) => { bird.position.y = -.08 + Math.abs(Math.sin(t * 6)) * .03; cage.rotation.y = Math.sin(t * .8) * .2; });
    props.push(talker('canary', V(-10.5, 1.2, 13.5), 'Conversar com o canário', [[['GAEL', 'Enquanto você cantar, eu respiro. Combinado?']], [['CANÁRIO', 'Piu.'], ['GAEL', 'Concordo totalmente.']]]));
    box(L, M.iron, .2, .34, .2, 3.2, 1.37, 53.8);
    props.push(talker('miner_coffee', V(2.0, 1.2, 53.8), 'Tomar o café do mineiro', [[['GAEL', 'Café de mina: noventa por cento carvão, dez por cento coragem.']], [['GAEL', 'Acabou. Agora é só carvão.']]], heal(15)));
  }
  return { list: props, frame(t, dt, p) { for (const f of frames) f(t, dt, p); } };
}
