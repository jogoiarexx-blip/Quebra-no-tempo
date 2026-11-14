// Frases de efeito do Gael (GDD §27/§30: humor autoral que não interrompe o combate).
// Regras: intervalo mínimo, chance por abate, garantidas em abates múltiplos; nada se repete em sequência.
const LINES = {
  kill: ['Próximo da fila.', 'Isso foi o trailer. O filme é pior.', 'Volta pro seu século. De preferência deitado.', 'Reclamações? Escreve pro futuro.', 'Eu avisaria antes, mas aí perde a graça.', 'Nem precisei do Eco pra isso.', 'Calma. Respira. Ah, não respira mais.'],
  E04: ['Lagarto de metralhadora giratória… e girou foi pro chão.', 'Placa de aço na frente, esqueceu de proteger o resto.', 'Escama, blindagem e nenhum juízo.'],
  E05: ['Dinamite é pra pedra, parceiro. Não pra mim.', 'Quem brinca com pavio termina sem pavio.'],
  E06: ['Saque rápido. Mira lenta.', 'Esse chapéu era a melhor parte de você.'],
  E02: ['Atirador de telhado. Agora, atirador de calçada.'],
  DRONE: ['Drone sem bateria. Igual meu celular.', 'Desliga e liga de novo. Ah, só desliga.'],
  multi: ['Dois de uma vez! Promoção de fim de mês.', 'Combo! Alguém anota isso.', 'Isso foi feio. Pra eles.'],
  blast: ['Kabum. Arte moderna.', 'Fogos de artifício fora de época.'],
  hurt: ['Isso vai deixar marca. Gostei.', 'Ai! Tá bom, agora é pessoal.', 'Minha jaqueta não merecia isso.'],
  heal: ['Bem melhor. Quase bonito de novo.', 'Curativo do futuro. Ou do passado. Tanto faz, funciona.'],
};
export function createQuips(say, opts = {}) {
  const rnd = opts.random || Math.random, gap = opts.gap ?? 9;
  let cd = 2, last = '', recent = [];
  function pick(list) { const pool = list.filter((l) => l !== last); const l = pool[Math.floor(rnd() * pool.length)] || list[0]; last = l; return l; }
  function speak(list, force) { if (!opts.enabled?.() || (!force && cd > 0)) return false; say('GAEL', pick(list), 2.2); cd = gap; return true; }
  return {
    tick(dt) { cd = Math.max(0, cd - dt); const now = (opts.now?.() ?? 0); recent = recent.filter((t) => now - t < 1.6); },
    onKill(type, how) {
      const now = opts.now?.() ?? 0; recent.push(now);
      if (recent.length >= 2) return speak(LINES.multi, cd < gap - 3);
      if (how === 'blast' && rnd() < .7) return speak(LINES.blast);
      if (rnd() > .42) return false;
      return speak(LINES[type] && rnd() < .65 ? LINES[type] : LINES.kill);
    },
    onHurt(hp) { if (hp < 40 && rnd() < .35) speak(LINES.hurt); },
    onHeal() { if (rnd() < .4) speak(LINES.heal); },
    get cooldown() { return cd; },
  };
}
export const QUIP_LINES = LINES;
