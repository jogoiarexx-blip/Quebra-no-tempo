# QUEBRA NO TEMPO — Atos I e II

**v0.11.0 — abertura cinematográfica, telas de carregamento, Ato I completo e Ato II completo (Poeira Alta, Mina Treze, O Trem de Ferro e Forte Meia-Noite com o Marechal Ferrugem).** TPS 3D em Three.js/WebGL2, modular e sem etapa de build, para GitHub Pages. [Jogar](https://jogoiarexx-blip.github.io/Quebra-no-tempo/).

## Campanha implementada

| Missão | Conteúdo |
|---|---|
| A1-M1 — Rua Quebrada | Oficina, avenida, loja, passarelas e subestação; demonstração do Eco e saída com dois selos |
| A1-M2 — Noite de Neon | Clube Véspera, Jill no bar, Nico e performers, conversas, apagão, invasão, bastidores e metrô; Eco permanente |
| A1-M3 — Usina Norte | Resfriamento, guindaste opcional, turbinas, backup, galeria e terraço; descarga temporal |
| A1-M4 — Núcleo de Ruptura | Avenida destruída, contenção, armaria, arena em dois níveis, chefe em três etapas, selo 1/1 e portal estável |
| A2-M1 — Poeira Alta | Cidade de 1888 ao pôr do sol: Saloon Rosa de Ferro (Irene Vidal), piano secreto, Relojoaria Klein com cofre, estábulos com celeiro, varanda do hotel e duelo sob o relógio da praça |
| A2-M2 — Mina Treze | Boca da mina, galerias, cruzamento com vagões, perfuratrizes temporais (tanques), perseguição no túnel, represa, galeria mineral e elevador principal |
| A2-M3 — O Trem de Ferro | Estação, embarque, vagões em movimento (vigas sobre o teto), gôndola com a Ferrovia, vagão postal pela escotilha, tênder, reator anacrônico na locomotiva, ponte partida e estação de chegada |
| A2-M4 — Forte Meia-Noite | Canhões de muralha, portão, pátio, Âncora do Oeste, fornalha | Marechal Ferrugem (3 fases): válvulas expõem as juntas, vapor na fase 2, acumuladores e duelo na fase 3 | 1/1 selo; registro da fotografia falsa |

[Ato II, abertura e animações (v0.9)](docs/ATO_II_E_APRESENTACAO_v0_9_0.md) · [Detalhamento completo de A1-M4](docs/A1_M4_NUCLEO_DE_RUPTURA.md) · [GDD v2.2](docs/QUEBRA_NO_TEMPO_GDD_COMPLETO_v2_2.md) · [Histórico](CHANGELOG.md).

## Jogar e controlar

No PC, execute `JOGAR.bat` ou `./jogar.sh` com Python instalado e abra `http://localhost:8080/`. Abrir `index.html` por `file://` bloqueia os módulos/modelos.

WASD mover; 1/2/3/4 ou roda trocar arma (4 = Ferrovia); Shift correr; Espaço saltar/agarrar; Alt/Z rolar; C agachar ou deslizar correndo; F coronhada; mouse esquerdo atirar/direito mirar; R recarregar; E usar; **1/2/3 ou roda trocar arma**; Q Eco; V ombro; Esc pausa. Celular tem controles de toque; gamepad padrão usa Y para ciclo de armas. O menu contém a lista completa.

## Apresentação

- Tela de título "pressione qualquer tecla" (libera o áudio), abertura de ~41 s na primeira vez e botão **Abertura** no menu. Esc/Enter/clique/A pula a partir de 1 s.
- Abertura do Ato II antes da primeira partida de Poeira Alta.
- Tela de carregamento por missão com arte própria, briefing, progresso real por etapa, dica do Gael e "pressione qualquer tecla para detonar".
- Frases de efeito do Gael em combate (desligáveis em Opções) e objetos cômicos interativos em todas as fases.

## Sistemas

- Câmera sobre o ombro com colisão, ADS e troca de ombro; controlador com degraus, salto, agachado e esquiva.
- Martelo-9, Trovão Duplo e Rompe-Casco com projétil em voo, área e autolesão.
- Eco: duas cargas após A1-M2, histórico de 3 s, recuperação sequencial de 25 s; não desfaz o mundo.
- Reptiliano no E01, porco policial (javali) no E02, **Bruto Réptil com minigun no E04**, Prospector (dinamite) no E05 e Pistoleiro de Mercúrio no E06; Jill, Nico e Irene Vidal.
- Animações: cadência de passos medida em cada clipe, locomoção lateral/ré do Gael em combate, salto/pouso, golpe, recarga, três mortes, reação por lado, arremesso, saque, rajada de minigun, canto e mira sintetizada para modelos sem clipe de mira.
- Recursos visualmente distintos, coleta limitada pela capacidade e drops ponderados pela necessidade.
- Estado de missão serializável, checkpoints, save verificado em localStorage e migração de desbloqueios antigos.
- Menu, seleção de missões, pausa, documentos, dificuldade, qualidade, toque e gamepad.
- Cenário procedural com geometria estática mesclada por material e pool de seis luzes reais por missão.

## Fonte e validação

`src/main.js` coordena campanha/interface; `src/missions/` contém A1-M1 a A2-M4. Leviatã separa regras em `leviathan-state.js` e apresentação em `leviathan-view.js`. `weapon-data.js` normaliza o arsenal antigo e `rocket.js` simula voo/colisão. Three.js vendorizado está em `vendor/`.

Execute **`npm test`**. O workflow `.github/workflows/publicar-pacote-zip.yml` roda testes Node e smoke Chromium/WebGL antes de publicar no Pages pelo Actions. As capturas do workflow ficam em `qnt-v0110-qa`. [Entrega anterior e limites de teste](docs/RELATORIO_v0_7_0.md).

## Limites atuais

Os atos III–VI permanecem especificados no GDD; os Atos I e II estão implementados. O ambiente e o chefe usam arte procedural; os demais chefes, hub, upgrades, mapa e remapeamento ainda não estão implementados. Save usa localStorage, sem IndexedDB. Não houve validação de FPS em celular físico nem playtest humano completo de balanceamento/duração desta entrega. O fluxo anterior de portas, selos, elenco e opções foi preservado.

Consulte o GDD e mantenha nele a distinção entre especificação e conteúdo implementado. O estado atual tem prioridade sobre descrições históricas de versões anteriores.
