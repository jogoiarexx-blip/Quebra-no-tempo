# v0.9.0 — Abertura, carregamento, Ato II e animações

## Fluxo de apresentação

`Carregador → Título ("pressione qualquer tecla") → Abertura (1ª vez) → Menu → Nova campanha → Dificuldade → Abertura (se não vista nesta sessão) → Tela de carregamento → A1-M1`

| Peça | Arquivo | Notas |
|---|---|---|
| Título | `index.html` (`#title`) | Libera o Web Audio no primeiro gesto; tema de menu com riff próprio sintetizado (faixa 9). |
| Abertura | `src/cinema.js` → `prologue` | 7 planos, ~41 s: cidade na chuva, noticiário falso, Gael na oficina (duas tomadas), porta arrombada, armário, logotipo. Usa o cenário real de A1-M1. |
| Ato II | `src/cinema.js` → `act2` | 4 planos, ~25 s: fenda, rua de Poeira Alta, chegada de Gael, título do ato. Só na primeira partida de A2-M1 (`campaign.flags.act2_intro_seen`). |
| Carregamento | `src/loading.js` | Arte por missão, briefing, 5 etapas reais (`missionSteps` em `main.js`), mínimo de 1,3 s, dica do Gael, tecla/clique/A para começar. |
| Arte compartilhada | `src/broadcast.js` | Noticiário falso (também na TV da oficina), título cromado e fenda. |
| Fontes | `vendor/fonts/` | Bungee e Black Ops One (SIL OFL 1.1, licença incluída). |

Pular: Esc / Enter / Espaço / clique / toque / A / Start, a partir de 1 s. As cenas não alteram o save.

## A2-M1 — Poeira Alta (2/3 selos, Fenda na torre do relógio)

| Setor | Conteúdo |
|---|---|
| Entrada do Vale | Chegada pelo portal, arco "POEIRA ALTA • 1888", carroça tombada, casinha cômica. |
| Rua Principal | Calçadas elevadas, toldos, falsas fachadas, atirador no telhado do telégrafo, barris de pólvora. |
| Saloon Rosa de Ferro | Irene Vidal canta no palco. Ao falar com ela, pistoleiros invadem; ela se abriga atrás do balcão. **Selo 1** ao vencer. Piano com teclas Lua/Sino/Rio/Ferro: a ordem está no cartaz → alçapão secreto (gramofone de 2275, +40 peças). |
| Relojoaria Klein | Caderno do relojoeiro ou recado de Irene revelam 11:47; o relógio-mestre desliza e mostra o cofre: **mapa da Mina Treze + Selo 2**. Em seguida, emboscada temporal com Bruto Réptil. |
| Estábulos | Escada de fardos até o celeiro: **Selo alternativo** e a chapa fotográfica (muda o cartaz do museu em A1-M1). |
| Praça do Relógio | Duelo com Quincas: três badaladas; atirar na terceira vence (+25 armadura). Antes = desonra, depois = lento: em ambos a gangue ataca. |
| Torre do Relógio | Portão abre após o duelo; escada até a varanda com a Fenda. |

Regras puras e testáveis: `src/missions/poeira-state.js`. Janela do saque: 0,85 s (Turista), 0,6 s (Mercenário), 0,45 s (Paradoxo).

## A2-M2 — Mina Treze (2/3 selos, Fenda no elevador principal)

| Setor | Conteúdo |
|---|---|
| Boca da Mina | Exterior noturno, escritório com canário, primeira dupla de inimigos. |
| Galeria de Entrada | Quadros de madeira, vagão parado como cobertura, nicho com o diário do capataz (segredo). |
| Cruzamento dos Trilhos | Vagão a cada 7,5 s com luz vermelha 1,6 s antes; perfuratriz A com dois tanques de pressão (atirar) e painel. Passarela leste. |
| Túnel Norte | Ao entrar, a perfuratriz B irrompe e persegue a 5 m/s; abrigo lateral e frestas junto à parede. Ela rompe o entulho e trava: tanques no topo e painel lateral. Desligar A e B = **Selo**. |
| Salão do Reservatório | Comporta na passarela leste drena o canal: **Selo** e caminho livre. |
| Galeria Mineral | Passagem agachada a oeste: minério luminescente, **Selo alternativo** e +60 peças. |
| Canal e Elevador | Canal drenado, emboscada final e Fenda na plataforma do elevador. |

Regras puras: `src/missions/mina-state.js`.

## A2-M3 — O Trem de Ferro (v0.10, 2/3 selos, Fenda na Estação Ponte Velha)

O trem fica parado nas coordenadas da fase e o mundo (chão, dormentes, postes, cactos, mesetas, estações e ponte) desliza por baixo, conforme `S.train.dist`. Assim jogador e inimigos usam colisores estáticos e a rota é testável. Regras: `src/missions/trem-state.js`.

| Trecho | Conteúdo |
|---|---|
| Estação Mercúrio | Tiroteio na plataforma; o trem parte quando Gael sobe na varanda traseira (capangas que ficam são deixados para trás). |
| Vagão de passageiros / restaurante | Corredores com bancos e mesas; ensopado do maquinista (+15 vida). |
| Gôndola de carga | Caixotes com núcleos temporais: **sabotar = selo**. Caixote com a **Ferrovia** e munição .44. Escada de caixotes até o teto. |
| Teto do vagão postal | Vigas de túnel/caixa d'água passam com aviso (buzina + texto): agachar (C) ou ficar dentro do vagão. Escotilha leva ao compartimento lacrado: **selo alternativo** e cartas dos apagados (segredo). |
| Tênder e cabine | Carvão em degraus até a cabine. Reator do século XXIII: fechar a válvula, depois arrancar o núcleo (**selo**). |
| Ponte partida | 10 s sobre a ponte de cavaletes; aos 4,5 s o vagão de passageiros desengata e cai (se Gael estiver nele, salta para o vagão 2). |
| Estação Ponte Velha | Frenagem de 8 s; a estação desliza exatamente a distância de parada e alinha. Fenda na plataforma. |

Cair do trem em movimento devolve Gael ao último ponto seguro do comboio (sem morte instantânea). Checkpoints: plataforma, embarque, gôndola, cabine e chegada.

## Inimigos

| ID | Nome | Modelo | Comportamento |
|---|---|---|---|
| E04 | Bruto Réptil | `models/enemies/bruto-reptil.glb` (enviado; 234.928 → 19.966 triângulos, texturas WebP 1024, 1,6 MB) | 135 de vida, placa frontal (tiro de frente no tronco ×0,3), costas ×1,5, pernas e explosões funcionam; minigun gira 0,95 s com som e cano em brasa antes de 10 disparos. |
| E05 | Prospector Corrompido | Gael com figurino de garimpeiro e chapéu | Acende o pavio (0,8 s), arremessa em arco, anel no chão mostra o raio, recua do próprio explosivo. |
| E06 | Pistoleiro de Mercúrio | Gael com figurino escuro e chapéu | Tiro forte marcado por brilho do cano. |

O modelo enviado chegou só com *Walking* e *Running*; o Idle é a média do ciclo de caminhada e a mira é sintetizada.

## Animações (todas as personagens)

- **Cadência medida**: `measureGait` mede a velocidade do pé apoiado em cada clipe de caminhada/corrida; jogador, inimigos e NPCs usam esse valor (limitado a 0,6–1,6× do antigo) para o pé não patinar.
- **Gael**: andar de lado e de costas em combate (antes deslizava andando para frente), salto/queda, compressão no pouso, golpe com coronhada, recarga parado, rolamento encolhido e morte por clipe (três variantes; tiro pelas costas cai para frente).
- **Inimigos**: reação à esquerda/direita/frente conforme o tiro, morte para trás, para frente (tiro pelas costas) ou girando; arremesso sincronizado com a soltura da dinamite; saque rápido; rajada de minigun contínua.
- **NPCs**: idle com respiração e olhar, fala com gestos alternados, aceno, canto de palco (Irene), corrida de fuga com cadência medida.
- Poses de braço (mira sintetizada, arremesso, saque, golpe, recarga, canto, salto) são resolvidas no espaço do personagem — funcionam em qualquer esqueleto mixamo. Gestos sociais mantêm os pés fixos (testado).

## Limites desta entrega

A2-M4 (Forte Meia-Noite, Marechal Ferrugem) existe desde a v0.11.0 (seção abaixo). Não houve playtest humano; a validação é automatizada.


## A2-M4 — Forte Meia-Noite (v0.11, 1/1 selo, Fenda na fornalha)
Rota: desfiladeiro (dois canhões de muralha: avisam com anel laranja, sabote-os pelas escadas laterais) → portão → pátio (eg81) → Âncora do Oeste no salão do Marechal → painel da fornalha → Marechal Ferrugem → mesa com o registro da fotografia falsa → Fenda.
Chefe: fase 1 canhão a vapor/pisão; fase 2 correntes e jatos, vapor e cobertura destruída, pistoleiros nas passarelas; fase 3 dois acumuladores e duelo. Pular desvia pisão e correntes. Válvulas laterais (12 s de recarga) expõem as juntas por 6 s, com teto de dano por janela.
Segredos: livro de ponto apagado (alojamento) e caixa do desfiladeiro. Regras puras em `src/missions/ferrugem-state.js`, testes em `tests/ferrugem-state.test.js` e `tests/forte-route.test.js`.
