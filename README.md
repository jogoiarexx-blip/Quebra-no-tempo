# QUEBRA NO TEMPO — vertical slice A1-M1 "Rua Quebrada"

TPS 3D para navegador (Three.js + Vite, WebGL2, build estático para GitHub Pages), construído a partir do
`docs/QUEBRA_NO_TEMPO_GDD_COMPLETO_v2_2.md` e de `src/data/game_config_v2_2.json` (lido em runtime: vida, armadura,
velocidades, coyote/buffer, FOV, escalas de render, Eco Cronal, selos e tempos da Fenda vêm dele).

## Jogar

- **Sem instalar nada do projeto:** dê dois cliques em `JOGAR.bat` (Windows) ou rode `./jogar.sh`. Ele serve a pasta `dist/`
  em `http://localhost:8080/` (precisa de Python ou Node instalado; abrir o `index.html` direto do disco não funciona,
  o navegador bloqueia módulos e modelos em `file://`).
- **Desenvolvimento:** `npm install` → `npm run dev`.
- **GitHub Pages:** suba o repositório e ative Pages com "GitHub Actions" (o workflow `.github/workflows/deploy.yml` já
  compila e publica), ou publique o conteúdo de `dist/` direto. A `base` é relativa, então funciona em `/nome-do-repo/`.

## Controles

WASD mover · Shift sprint · Espaço saltar/agarrar borda (segure = mais alto) · Alt/Ctrl/C rolar · mouse esq. atirar ·
mouse dir. mirar · R recarregar · E interagir · 1/2/roda trocar arma · Q Eco Cronal · V trocar ombro · Esc pausa.
Gamepad padrão suportado (ver tela Controles).

## O que está implementado (GDD §9 / §9.3 / §46)

| Sistema | Estado |
|---|---|
| Fluxo completo | menu → dificuldade → A1-M1 → checkpoints → Fenda de Saída → resultados, com save |
| 8 setores | garagem, beco, avenida, loja, duto/estoque (rota opcional), Véspera/praça, passarela, subestação |
| Selos de Continuidade | 2 de 3 (loja, subestação, painel do relógio opcional); HUD `SELOS n/2`; IDs não duplicam |
| Saída | flags `substation_breaker_a/b` + `extraction_terminal_armed` + interação; `mission_complete` só após gravar |
| Encontros | eg01–eg05, 12 inimigos (E01, E02, drone), telegraph, sem tiro por parede, anti-cobertura-eterna |
| Movimento | corrida/sprint/caminhada, salto variável, coyote 120 ms, buffer 130 ms, controle no ar 40%, rolamento com i-frames, agarrar borda |
| Câmera | sobre o ombro 2,7–3,3 m com colisão, troca de ombro, ADS, FOV 65–95° |
| Armas | Martelo-9 (24 / 4 por s / 15) e Trovão Duplo (10×10 / 2), tiro validado câmera → cano, multiplicadores cabeça/perna |
| Eco Cronal | buffer 60 amostras a 20 Hz, 1 carga demonstrativa na praça, destino inválido não gasta carga, não é permanente |
| Checkpoints | cp00–cp03 com snapshot (flags, selos, pickups, destrutíveis, eventos únicos) e kit anti-softlock |
| Interface | máquina única de camadas (Esc fecha só a de cima), pausa, opções reais (65/85/100% de escala, sombras no Alto), morte, resultados |
| Áudio | SFX e trilha sintetizados por Web Audio (camada de combate dinâmica) |
| Dançarinas | vitrine-palco do Véspera com 2 figurinos gerados por máscara; opção "apresentação atenuada" |

## O que NÃO está feito (para não parecer mais do que é)

- Cenário é *greybox* texturizado por código: não há arte final de ambientes nem modelos de armas/veículos.
- Inimigos usam substitutos (o humanoide do protagonista tingido + capacete, e um drone geométrico) até os GLB das
  artes em `docs/conceitos_inimigos/` existirem — ver `docs/ELENCO_INIMIGOS.md`.
- Não implementados: agachar, slide, vault dedicado (o salto cobre), corpo a corpo, consumível rápido (F), mapa (Tab),
  remapeamento, interface de toque/mobile, hub, upgrades de arma, A1-M2 em diante.
- Save usa `localStorage` com gravação verificada, não IndexedDB.
- Valores são de protótipo. **Nenhum playtest humano foi feito**; ver `docs/RELATORIO_TESTES.md` para o que foi
  realmente executado (testes automatizados em navegador headless) e o que continua pendente.

## Pastas

```
src/            código do jogo (main, player, enemies, level, physics, characters, fx, audio, input, save, state)
src/data/       game_config_v2_2.json (fonte de verdade dos parâmetros)
public/models/  gael.glb, sol.glb, sol_masks.png, enemies/manifest.json  (gerados/corrigidos)
assets_src/     coloque aqui os GLB originais (principal.glb, vixen.glb) para rodar o pipeline
tools/          build_models.py (correção dos modelos) e testes automatizados (play.cjs + t_*.cjs)
docs/           GDD, relatórios, artes de conceito dos inimigos
dist/           build pronto para publicar
figurinos.html  visualizador dos figurinos (abrir em /figurinos.html no `npm run dev`)
```

Refazer os modelos a partir dos originais: `npm run models` (Python 3 + numpy + Pillow).
