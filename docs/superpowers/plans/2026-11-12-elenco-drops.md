# Elenco e drops v0.6.1 — plano

Objetivo: substituir o atendente do bar pela Jill, preservar a missão e distinguir todos os recursos por silhueta, símbolo e cor. Manter os GLB otimizados v0.6.0: os hashes dos anexos são idênticos aos originais já processados.

1. `src/missions/a1m2.js`: uma única Jill em (-12.4, 0, 31), diálogo e objetivo com nome Jill; preservar flags `talked_basso` e saves. Remover NPC Basso duplicado; manter registros históricos da narrativa. Verificar conversa, apagão e restauração no smoke WebGL.
2. `src/pickups.js`: fábrica compartilhada com maleta de primeiros socorros, munições 9 mm, cartuchos vermelhos, colete azul, engrenagem violeta e espingarda. Mesclar partes por material, compartilhar recursos entre cópias e liberar ao trocar missão. Testar geometria finita, formas distintas, orçamento de triângulos/draw calls e compartilhamento.
3. `src/loot.js`: sorteio ponderado por inimigo e necessidade; kits de vida mais prováveis com HP baixo, munição apenas de armas possuídas, proteção apenas se incompleta, drone fornece peças. Manter chance-base e dificuldade atuais. Aplicar limites e retornar ganho real para feedback. Testar reserva cheia, cura parcial, armas bloqueadas e dificuldades.
4. `src/main.js`: integrar fábrica e regras, pousar loot no chão por raycast, limitar a 24 drops ativos e animar flutuação. Não consumir itens quando atributo cheio. Itens fixos continuam no save; loot transitório continua sendo limpo ao reiniciar checkpoint.
5. `tools/browser-smoke.mjs`: testar substituição, interação, coleta de todos os recursos, recusa com atributo cheio, drop real e checkpoint. Atualizar documentação e versão. Executar regressões Node, inspeção visual no navegador, publicar no GitHub Pages e conferir workflow.

Riscos a conferir: modelo da Jill não duplicado; contato acessível através do balcão; nenhuma deformação nova nos GLB; recursos de pickup não descartados ao coletar uma cópia; drops do drone acessíveis no chão; compatibilidade de saves; teste de navegador usa as duas missões. Não alegar campanha completa ou FPS em aparelho físico.

Andamento: base limpa em a3fbd93; 13/13 testes existentes aprovados. Trabalho em branch isolada neste checkout.

Progresso: modelos existentes conferidos por hash; Jill e recursos integrados; testes novos falharam inicialmente por módulos ausentes e depois passaram (19/19 totais). Preservados limites e comportamento dos pickups fixos. Ajuste de decisão: manter esqueleto/animações já otimizados evita uma segunda conversão com perda. Prévia local limitada por WebGL desabilitado; publicação fica protegida pelo smoke do workflow.

Revisão independente: nenhum problema crítico/importante. 19 testes confirmados. Ressalva: o smoke testa restauração de checkpoint atual; não há fixture antiga v0.6.0. Comentário e relatório ajustados para explicitar esse limite.

CI inicial confirmou conversa, apagão/restauração, coleta e morte do reptiliano. Falhou na expectativa do teste de drone: o spawn estava acima da cobertura da recepção (3,90 m), onde o drop corretamente pousou a 4,25 m. Reproduzido com os mesmos AABBs. Teste corrigido para setor aberto e adicionada verificação separada da cobertura. Sem alteração no comportamento de produção.
