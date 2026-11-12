# Testes — executados x pendentes

## v0.2.0

Executados em Chromium headless contra o repositório servido em subpasta (`/quebra-no-tempo/`, igual ao Pages),
sem build: `node tools/play.cjs tools/<teste>.cjs`.

| Teste | Resultado |
|---|---|
| `t_run.cjs` — A1-M1 completa | passou; libera A1-M2 |
| `t_move.cjs` — passarela 10×, fosso, Eco, checkpoint + recarregar página, camadas 30× | passou (10/10 travessias) |
| `t_a1m2.cjs` — A1-M2 completa com mira e tiro reais nos combates, teclado no corredor (C sob a viga, C para levantar, Espaço na estante), câmera, elevador, relés, trem, Fenda | passou 5 vezes seguidas depois da correção do softlock |
| `t_a1m2.cjs` — opcionais | jukebox→3-0-1→VIP→cofre (3º selo); grade do banheiro + duto agachado até os bastidores; coronhada (65→25 HP + atordoamento) |
| `t_a1m2.cjs` — regras | arma no coldre não dispara na zona social; ficar em pé sob a viga não passa |
| `t_lean.cjs` — mira | tronco e mãos variam de forma monotônica com o ângulo e voltam ao normal ao soltar a mira |

Bugs achados pelos testes e corrigidos: invasor preso na parede da recepção impedia o fim da invasão (softlock);
inimigos morriam ao nascer no túnel (regra antiga de queda); coronhada passava acima de grades baixas; mira
acumulando rotação no tronco (o bug que você reportou); rolamento nunca executava.

Pendente: playtest humano das duas missões, gamepad físico, FPS em GPU real e celular.

## v0.1.0


Executados em Chromium headless (WebGL por software) contra o **build de produção servido em subdiretório**
(`/quebra-no-tempo/`), com `node tools/play.cjs tools/<teste>.cjs`. A simulação é avançada em passos fixos de 1/60 s.
Nenhum teste abaixo substitui playtest humano.

| Teste | O que faz | Resultado |
|---|---|---|
| `t_run.cjs` | percurso completo da garagem à Fenda usando as interações reais; inclui Fenda sem requisitos (A1M1-014) e falha de gravação simulada seguida de nova tentativa (A1M1-015) | passou; missão só conclui após gravar; A1-M2 desbloqueada; recompensa marcada uma vez |
| `t_move.cjs` — passarela | 10 travessias com entrada de teclado simulada (2 saltos + 1 agarrão de borda) | 10/10 (A1M1-004) |
| `t_move.cjs` — fosso | queda repõe na última borda com 10 de dano | passou |
| `t_move.cjs` — Eco | volta ~3 s (10,45 m), consome a carga, segunda ativação não faz nada, vida não muda | passou |
| `t_move.cjs` — checkpoint | salva em cp01, recarrega a página, Continuar | posição, selo, munição, porta e pickup preservados; selo duplicado conta uma vez (A1M1-002/013) |
| `t_move.cjs` — camadas | 30× abrir/fechar pausa | nenhuma camada duplicada (A1M1-006, parcial: sem documento) |
| `t_combat.cjs` | mira por yaw/pitch e atira: 2 E01 mortos com 3 tiros no tronco cada; portão abre; 30 tiros colado à parede não acertam nada do outro lado (A1M1-003) | passou |

Ajuste feito por causa dos testes: parado a 12 m de dois E01 o jogador morria em ~4 s; dano do E01 caiu de 9 para 6 e o
intervalo entre rajadas subiu.

## Pendente (não executado)

- Playtest humano de ponta a ponta, sensação de tiro/câmera, tempo real de fase (meta 18–22 min) e balanceamento nas 3 dificuldades.
- Gamepad físico (A1M1-008), FPS em GPU real desktop/mobile (A1M1-009), sessão de 30 min para vazamentos (A1M1-007).
- 20 percursos seguidos (A1M1-001) e 100 usos do Eco perto de portas/bordas (A1M1-005).
- Pointer lock foi exercitado só no headless; há fallback sem captura, mas não foi testado em iframe.
