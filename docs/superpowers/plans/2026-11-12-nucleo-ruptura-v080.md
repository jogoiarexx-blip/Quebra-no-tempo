# Núcleo de Ruptura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** A1-M4 detalhada e concluível, encerrando Ato I com Leviatã e portal estável.
**Architecture:** Missão modular, estado puro do chefe e apresentação procedural separados. Hooks existentes encaminham os tiros; uma extensão pequena do arsenal adiciona foguetes com voo e controles comuns.
**Tech Stack:** JavaScript ES modules, Three.js vendorizado, Node test, GitHub Pages e smoke WebGL no Actions.
**Spec:** docs/superpowers/specs/2026-11-12-nucleo-ruptura-design.md

## Global Constraints
- Selo de chefe 1/1, concedido uma única vez após derrota.
- Preservar esquema de save 1 e todas as fases anteriores.
- Sem dependências novas de runtime, até 6 luzes reais por nível.
- PC, celular e gamepad devem acessar a terceira arma.
- Rotas obrigatórias caminháveis e checkpoint antes do chefe.

## Review Focus
- Recarregar checkpoint durante exposição reinicia luta completa sem duplicar selo/auxiliares.
- Armadura, cobertura e desnível não podem permitir dano indevido no jogador/chefe.
- Foguetes não atravessam cobertura e explosão não duplica dano direto ao chefe.
- Falta de munição pesada não pode tornar a luta insolúvel.
- Falha de save não conclui missão nem concede recompensas duas vezes.

### Task 1: Regras serializáveis do Leviatã
**Files:** src/missions/leviathan-state.js; tests/leviathan-state.test.js.
**Interfaces:** createLeviathan(), startLeviathan(b), stepLeviathan(b,dt,target), exposeLeviathan(b,source), hitLeviathan(b,part,damage), attackHits(attack,player).
- [x] Escrever testes de blindagem, duas aberturas, limites por janela/etapa, avisos antes de dano, alvo fixo e nível vertical.
- [x] Verificar RED; implementar máquina determinística e executar testes GREEN.
- [x] Registrar resultado e commit.

### Task 2: Arsenal e projétil
**Files:** src/weapon-data.js, src/rocket.js, src/player.js, src/main.js, src/pickups.js, src/loot.js; tests/rocket.test.js, tests/weapon-data.test.js.
**Interfaces:** WEAPONS, AMMO_CAP, normalizeArsenal(snapshot), nextWeaponId(player); stepRocket(rocket,dt,enemies) retorna impacto ou null.
- [x] Escrever e observar RED para migração do arsenal, ciclo de três armas e colisão de foguete com parede antes de inimigo.
- [x] Implementar projétil com área, autolesão e integração dos recursos/controles; executar GREEN.
- [x] Registrar resultado e commit.

### Task 3: Cenário e missão
**Files:** src/missions/a1m4.js, src/missions/leviathan-view.js; tests/nucleo-route.test.js.
**Interfaces:** missão segue API X existente; geometria/padrões leem estado de Task 1 e Rompe-Casco de Task 2.
- [x] Escrever e observar RED de rotas pelo gerador/armaria, duto e passarelas, checkpoints, derrota/selo/portal.
- [x] Montar mapa com detalhes por setor, chefe procedural, interações, suprimentos, história e segredos. Validar física real, regras e restauração.
- [x] Registrar resultado e commit.

### Task 4: Campanha, publicação e QA
**Files:** src/main.js, src/save.js, src/missions/a1m3.js, index.html, package.json, README.md, CHANGELOG.md, docs/QUEBRA_NO_TEMPO_GDD_COMPLETO_v2_2.md, tools/browser-smoke.mjs, .github/workflows/pages.yml.
- [x] Adicionar RED de migração M3→M4; integrar catálogo, botão Próxima, HUD de chefe, versão 0.8.0 e documentação.
- [x] Executar suíte completa, review independente e correções importantes cobertas por regressões.
- [x] Publicar pelo fluxo existente com testes WebGL antes de deploy e observar resultado/capturas.

## Progresso
Base: 8440a74273db1b782e5561a1cdbda92b3d2949f8. Execução direta na branch feat/nucleo-ruptura-v080, preservando main até publicação validada.

Task 1: complete — regras RED→GREEN e suíte 62/62 (9490224).
Task 2: complete — arsenal/projétil RED→GREEN e suíte 66/66 (b3dafc0).
Task 3: complete — rotas RED→GREEN, ajuste do vão de saída e gabinete da passarela; suíte 69/69 (9cac9f1).
Task 4: migração RED→GREEN, catálogo/HUD/QA, suíte 70/70 (7fc7937); publicação e review aguardando verificação final.

Review final: cinco achados importantes reproduzidos em RED e corrigidos em uma passagem: recuperação de queda, ataques alcançando painel/margens, varredura inclusiva do foguete, dano direto de 125 sem área duplicada, precisão real de combate. Orientação das placas também corrigida para leitura no percurso. Suíte completa: 75/75. Review independente terminou; WebGL/ergonomia física/duração humana não foram avaliados pelo revisor.

Task 4: complete — commit publicado 27d3d9b4d4ae4085ecf404ae23514a46e5290b46, workflow 43355126822 aprovado (75 Node + WebGL das quatro missões, foguete real, três etapas, checkpoints e save transacional); deploy success. Capturas revisadas; ajuste adicional separa aviso/barra e desloca placa para o pilar do portal.
