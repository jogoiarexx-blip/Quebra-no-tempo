> **v0.6.0:** Jill no balcão do Véspera e reptiliano no E01, com modelos otimizados. [Detalhes e medidas](docs/ELENCO_OTIMIZADO_v0_6_0.md).

# QUEBRA NO TEMPO — Ato I: A1-M1 "Rua Quebrada" e A1-M2 "Noite de Neon"

TPS 3D para navegador (Three.js, WebGL2, sem etapa de build, publicado no GitHub Pages), construído a partir do
`docs/QUEBRA_NO_TEMPO_GDD_COMPLETO_v2_2.md` e de `src/data/game_config_v2_2.json` (lido em runtime: vida, armadura,
velocidades, coyote/buffer, FOV, escalas de render, Eco Cronal, selos e tempos da Fenda vêm dele).

## Documentação principal e evolução do jogo

- **[Abrir o GDD completo v2.2](docs/QUEBRA_NO_TEMPO_GDD_COMPLETO_v2_2.md)** — referência de design da campanha, das 24 missões e dos sistemas.
- [Parâmetros do jogo](src/data/game_config_v2_2.json) — valores usados pelo código.
- [Histórico de alterações](CHANGELOG.md) — evolução das versões.
- [Relatório de testes](docs/RELATORIO_TESTES.md) — evidências e pendências de validação.

### Como manter o projeto alinhado

1. Consultar o GDD antes de mudar fases, progressão ou sistemas. O que está especificado no GDD não significa que já foi implementado.
2. Registrar mudanças de design no GDD e atualizar os parâmetros correspondentes quando necessário.
3. Registrar cada entrega no histórico, separando implementado, testado e pendente.
4. Atualizar os estados de implementação deste README e o relatório de testes conforme o código evoluir.
5. Usar o histórico de commits para consultar alterações anteriores e evitar cópias divergentes do GDD. Este é o documento de referência: `docs/QUEBRA_NO_TEMPO_GDD_COMPLETO_v2_2.md`.

## Jogar

- **Online:** https://jogoiarexx-blip.github.io/Quebra-no-tempo/ (GitHub Pages servindo a raiz do repositório).
- **No computador:** dê dois cliques em `JOGAR.bat` (Windows) ou rode `./jogar.sh`; abre `http://localhost:8080/`.
  Precisa de Python ou Node instalado. Abrir o `index.html` direto do disco não funciona (o navegador bloqueia
  módulos e modelos em `file://`).
- **Não há etapa de build.** O three.js está em `vendor/` e o `index.html` usa importmap. Para publicar, basta enviar
  a pasta inteira; o Pages deve estar em "Deploy from a branch", branch `main`, pasta `/ (root)`.

## Controles

WASD mover · Shift sprint · Espaço saltar/agarrar borda (segure = mais alto) · **C agachar / slide no sprint** ·
**Alt ou Z rolar** · **F coronhada** · mouse esq. atirar · mouse dir. mirar · R recarregar · E interagir ·
1/2/roda trocar arma · Q Eco Cronal · V trocar ombro · Esc pausa. Ctrl não é usado de propósito: Ctrl+W fecha a aba.
Gamepad padrão suportado (ver tela Controles).

Novidades desta versão: ver `CHANGELOG.md`.

## O que está implementado (GDD §9 / §9.3 / §46)

| Sistema | Estado |
|---|---|
| Fluxo completo | menu → dificuldade → A1-M1 → resultados → A1-M2 → resultados; tela de Missões; save por checkpoint |
| A1-M2 | clube social, show, painel de luz, jukebox/VIP, apagão, invasão + transmissor, bastidores com câmera, elevador, metrô, trem |
| 8 setores | garagem, beco, avenida, loja, duto/estoque (rota opcional), Véspera/praça, passarela, subestação |
| Selos de Continuidade | 2 de 3 (loja, subestação, painel do relógio opcional); HUD `SELOS n/2`; IDs não duplicam |
| Saída | flags `substation_breaker_a/b` + `extraction_terminal_armed` + interação; `mission_complete` só após gravar |
| Encontros | eg01–eg05, 12 inimigos (E01, E02, drone), telegraph, sem tiro por parede, anti-cobertura-eterna |
| Movimento | corrida/sprint/caminhada, salto variável, coyote 120 ms, buffer 130 ms, controle no ar 40%, rolamento com i-frames, agarrar borda, agachar, slide, coronhada |
| Câmera | sobre o ombro 2,7–3,3 m com colisão, troca de ombro, ADS, FOV 65–95° |
| Armas | Martelo-9 (24 / 4 por s / 15) e Trovão Duplo (10×10 / 2), tiro validado câmera → cano, multiplicadores cabeça/perna |
| Eco Cronal | buffer 60 amostras a 20 Hz; demonstração de 1 carga na A1-M1; permanente na A1-M2 (2 cargas, recarga sequencial 25 s) |
| Checkpoints | cp00–cp03 com snapshot (flags, selos, pickups, destrutíveis, eventos únicos) e kit anti-softlock |
| Interface | máquina única de camadas (Esc fecha só a de cima), pausa, opções reais (65/85/100% de escala, sombras no Alto), morte, resultados |
| Áudio | SFX e trilha sintetizados por Web Audio (camada de combate dinâmica) |
| Personagens | 2 modelos reaproveitados por máscaras: 4 performers, equipe do clube, 8 pessoas no público e os inimigos; opção "apresentação atenuada" |
| HUD | marcador de objetivo com distância (desligável), contador de selos, Eco com recarga, indicador de agachado |

## O que NÃO está feito (para não parecer mais do que é)

- Cenário é *greybox* texturizado por código: não há arte final de ambientes nem modelos de armas/veículos.
- O E01 usa o reptiliano otimizado; o E02 ainda usa o humanoide com roupa de atirador e o drone é geométrico. Os demais modelos de
  `docs/conceitos_inimigos/` continuam pendentes — ver `docs/ELENCO_INIMIGOS.md`.
- Não implementados: vault dedicado (o salto cobre), consumível rápido, mapa (Tab), remapeamento, interface de toque/mobile,
  hub, upgrades de arma, mesa de sinuca, A1-M3 em diante. Mara não aparece em cena (só pelo rádio): não há modelo
  feminino além do da dançarina.
- Na A1-M2 os selos do palco e dos bastidores estão os dois na rota principal; o do VIP é bônus, não substituto.
- Save usa `localStorage` com gravação verificada, não IndexedDB.
- Valores são de protótipo. **Nenhum playtest humano foi feito**; ver `docs/RELATORIO_TESTES.md` para o que foi
  realmente executado (testes automatizados em navegador headless) e o que continua pendente.

## A1-M2 em uma frase

Entrar no Véspera desarmado, conversar com a equipe, achar o canal de luz que carrega o sinal, sobreviver ao apagão
e à invasão (ganhando o Eco Cronal definitivo), atravessar os bastidores, descer ao metrô, religar três relés e sair
pela Fenda. Detalhes, segredos e checkpoints no `CHANGELOG.md`.

## Pastas

```
index.html      página do jogo (importmap → vendor/three)
src/            motor: main, player, enemies, npcs, world, physics, characters, fx, audio, input, save, state
src/missions/   a1m1.js (Rua Quebrada) e a1m2.js (Noite de Neon) — geometria, eventos, puzzles, encontros
src/data/       game_config_v2_2.json (fonte de verdade dos parâmetros)
models/         gael.glb, sol.glb, sol_masks.png, gael_masks.png, enemies/manifest.json
vendor/three/   three.js r170 (MIT) + GLTFLoader, SkeletonUtils, BufferGeometryUtils
assets_src/     coloque aqui os GLB originais (principal.glb, vixen.glb) para rodar o pipeline
tools/          build_models.py e testes automatizados (play.cjs + t_*.cjs)
docs/           GDD, relatórios, imagens, artes de conceito dos inimigos
figurinos.html  visualizador dos figurinos da dançarina
```

Refazer modelos e máscaras a partir dos originais: `python3 tools/build_models.py assets_src/principal.glb assets_src/vixen.glb models` (Python 3 + numpy + Pillow).
