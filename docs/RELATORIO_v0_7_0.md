# Quebra no Tempo v0.7.0 / v0.7.1 — cenários, animações e Usina Norte

## Novos modelos

| Modelo enviado | Original | No jogo | Triângulos antes → depois | Aplicação |
|---|---:|---:|---:|---|
| Porco policial | 17.265.992 bytes | 1.668.620 bytes | 253.590 → 19.993 | E02 Atirador |
| NPC da boate | 5.850.540 bytes | 1.005.448 bytes | 49.304 → 13.977 | Nico, cliente da boate em M2 |

Originais preservados. A conversão mantém UVs, esqueleto e os três mapas PBR; texturas em WebP 1024/512. Altura de bind aproximada de 1,70 m. A geometria é simplificada inteira, sem apagar partes do corpo/roupa. Locomoção usa retarget dos clipes corrigidos e calibração por vértices da sola, com amostragem adicional entre chaves para evitar penetração no piso. [Métricas e hashes](CAST_OPTIMIZATION_v0_7_0.json); pipeline em `tools/optimize_cast_v07.py`.

## Animações e cenários

Jill tem idle de atendente, saudação e gesto de conversa; continua se abaixando no apagão. Nico usa o modelo recebido, com idle, conversa/saudação e evacuação; Maya permanece entre as performers originais. Modos de apresentação atenuada e restauração de material continuam disponíveis.

Inimigos passam a reagir a impactos e tiros com clipes curtos. Há animações para movimento de costas e lateral, selecionadas pelo deslocamento relativo ao corpo. A morte roda uma vez, termina na última pose e é calibrada contra o piso; a rotação adicional que duplicava o tombamento foi removida. O suporte a one-shot reinicia ações ao solicitá-las e permite retornar a loops sem manter o mixer pausado.

Rua Quebrada ganhou detalhes na oficina, ferramentas/prateleiras, fachadas, grelhas, marcação da avenida, cabos e isoladores da subestação. Noite de Neon ganhou garrafas/taças, prateleiras, treliças de palco, caixas de som, iluminação aparente e acabamento no metrô. O passe de detalhes é estático, mesclado por material, sem novos colisores ou luzes reais; fica abaixo de 35 mil triângulos e 24 malhas extras por fase. Não altera passagens antigas.

## A1-M3 — Usina Norte

Percurso: doca → pátio → resfriamento/guindaste → turbinas → backup → galeria → terraço da chaminé. Onze inimigos em quatro encontros. Vapor alterna aviso e janela de dano; fechar a válvula local neutraliza o jato. O Eco Cronal permanente fica disponível.

| Selo | Como obter |
|---|---|
| Resfriamento | Fechar as duas válvulas |
| Turbinas | Parar as turbinas, defender o hall e copiar o backup na passarela |
| Guindaste | Encontrar fusível no duto baixo e operar a cabine elevada |

A porta do hall aceita válvulas **ou** guindaste. A ponte do guindaste é um atalho real com colisão; uma passarela lateral permite atravessar sem ela. Dois de três selos bastam, mas a saída exige recuperar o backup, defender o terraço e cortar a descarga temporal. A1-M4 não está implementada.

Checkpoints: início, entrada do hall, galeria após o backup e chegada ao terraço. As posições de restauração foram verificadas contra os colisores. A progressão de saves antigos é preservada; concluir M2 libera M3 também para quem já tinha terminado antes desta atualização. Recompensas continuam transacionais e concedidas uma única vez.

## Verificação

- 59 testes Node locais aprovados: regressões anteriores, modelos/PBR/skin, interpolação dos pés, clipes e one-shots, morte sem atravessar piso, compartilhamento/descarte de recursos, recuperação de vagas de snipers antigos distantes, regras da Usina e migração de save.
- Rotas físicas de M3 exercitadas com `moveBody`: caminho das válvulas, escadas, backup, passarela lateral, subida ao terraço; caminho agachado do fusível, cabine e ponte alternativa. A ação e os inimigos são verificados separadamente no smoke WebGL.
- Smoke do workflow: carregamento das três missões, novos GLB, animações de impacto/tiro/morte, Jill/conversa/apagão, Nico, drops, falha de save na transição M2→M3, objetivos/checkpoints e conclusão de M3. Capturas de cenários e elenco no artefato `qnt-v071-qa`.
- A publicação permanece condicionada ao smoke WebGL. Confirmar o resultado no workflow associado ao commit final.
- Limites: não representa campanha completa de 24 fases, playtest humano contínuo, medição de FPS/VRAM em celulares físicos nem todos os estados possíveis de combate. Conteúdos futuros do GDD continuam especificações.

## Correções após inspeção visual — v0.7.1

A pose de bind do NPC enviado é A-pose, diferente da T-pose do rig de referência. A calibração dos eixos anatômicos de ombro/braço/antebraço evita dobrar os braços duas vezes. Um teste verifica que mãos e cotovelos de Idle permanecem no lado correto do tronco. O cliente foi chamado Nico e colocado entre o público, com diálogo próprio; Maya foi preservada.

Os comandos pendentes são limpos ao reiniciar o jogador e a câmera consome cada delta de mouse uma única vez. O smoke libera o pointer lock antes de suas reposições de QA e verifica pitch, direção e altura da câmera no pátio. O teste automatizado de transição por botão continua sendo executado.
