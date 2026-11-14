# v0.11.0 — 13/11/2026

- **A2-M4 Forte Meia-Noite** (GDD §7, §8.2, §35, §37) fecha o Ato II: desfiladeiro noturno com dois canhões de muralha (aviso em anel no chão, sabotagem pelas escadas laterais), portão, pátio com Bruto Réptil e dinamiteiros, alojamento com o livro de ponto apagado (segredo), caixa escondida (segredo), salão do Marechal com a Âncora do Oeste, fornalha e a luta.
- **Marechal Ferrugem** (chefe, 3 fases, 1/1 selo): canhão a vapor (a cobertura protege), pisão e correntes (pule), jatos de vapor em três pontos (entre nas frestas). Blindado: válvulas laterais expõem as juntas por 6 s (teto de 130 por janela). Fase 2: a armadura racha, a arena enche de vapor, as caixas de cobertura estouram e chegam dois pistoleiros nas passarelas. Fase 3: dois acumuladores dourados no peito protegem o motor; destruídos, começa o duelo curto sem blindagem. Reserva limitada no painel (3 usos).
- Mesa do Marechal: registro da fotografia falsa de Poeira Alta (14 pessoas → 11) com ligação à cópia do museu de Nova Aurora; recompensa de campanha `west_anchor` e `act2_complete`.
- Trem de Ferro leva ao Forte; saves com A2-M3 concluída liberam A2-M4. Carregamento com arte noturna da fortaleza, cartaz de procurado e carvão como pequenos easter eggs.
- 100 testes Node (estado puro do chefe e dos canhões, rota física completa, ordem Âncora→painel, três fases, duelo, selo e reentrada) e smoke WebGL das oito missões.

# v0.10.0 — 13/11/2026

- **A2-M3 O Trem de Ferro** (GDD §8, §8.2, §12, §35): tiroteio na Estação Mercúrio, embarque pela varanda traseira, comboio em movimento com o mundo deslizando por baixo (colisão estável), vigas de túnel sobre o teto com aviso (agache ou desça), gôndola de carga temporal (**selo**), vagão postal lacrado acessível pela escotilha do teto (**selo alternativo** + cartas dos apagados), tênder de carvão, reator do século XXIII na cabine (válvula → núcleo, **selo**), travessia da ponte partida com o vagão de passageiros caindo no desfiladeiro e chegada alinhada à Estação Ponte Velha, onde abre a Fenda.
- **Ferrovia** (GDD §5): rifle de alavanca, 52 de dano, 8 tiros, munição .44 própria (reserva 40), perfuração leve (o tiro atravessa um inimigo e acerta o de trás com 60%). Tecla 4, roda/Y/ARMA no ciclo. Drops de .44 só depois de adquiri-la.
- Mina Treze leva ao trem; saves com A2-M2 concluída liberam A2-M3. Tela de carregamento com arte do trem, dicas novas e prato do vagão-restaurante.
- 91 testes Node (rota física completa do trem, vigas, queda, desengate, frenagem alinhada, Ferrovia) e smoke WebGL das sete missões aprovados.

# v0.9.0 — 13/11/2026

- **Abertura do jogo** (GDD §2.3 e §39.3): tela de título "pressione qualquer tecla", prólogo no próprio motor — Nova Aurora na chuva, noticiário falso, Gael na oficina, a Ordem Cronal batendo na porta e o logotipo explodindo. Pula com Esc/Enter/clique/A após 1 s; "Abertura" no menu para rever.
- **Abertura do Ato II** (fenda → Vale de Mercúrio → chegada de Gael → "ATO II — OURO DE MENTIRA") na primeira partida de A2-M1.
- **Tela de carregamento** em estilo pôster de ação dos anos 90: arte procedural por missão, título cromado, briefing, progresso real em cinco etapas, dica do Gael e "pressione qualquer tecla para detonar" (garante o gesto que captura o mouse).
- **A2-M1 Poeira Alta**: saloon com Irene Vidal e defesa, piano de quatro notas com alçapão secreto, cofre atrás do relógio-mestre (código pela Irene OU pelo caderno), estábulos com celeiro (selo alternativo), chapa fotográfica que muda o museu de Nova Aurora em A1-M1, duelo sob o relógio (terceira badalada; atirar antes é desonra) e Fenda na torre.
- **A2-M2 Mina Treze**: vagões com luz de aviso, perfuratriz A com tanques de pressão, perseguição pela perfuratriz B com abrigo lateral, represa drenada pela comporta, galeria mineral agachada (selo alternativo + 60 peças) e Fenda no elevador.
- **Novos inimigos**: E04 **Bruto Réptil** (modelo enviado, conceito 03; otimizado 235 mil → 20 mil triângulos, 17,8 → 1,6 MB) com placa frontal e minigun que gira antes de atirar; E05 Prospector com dinamite em arco e anel de aviso; E06 Pistoleiro com brilho do cano. O Bruto também reforça A1-M3 e A1-M4.
- **Animações revisadas**: velocidade natural medida em cada clipe de caminhada/corrida (pés não patinam), Gael com locomoção lateral/de costas em combate, salto, pouso, golpe, recarga e três mortes; inimigos com reação por lado, morte conforme a direção do tiro, arremesso, saque, rajada de minigun; Irene canta; idle com respiração e olhar. Poses de braço resolvidas no espaço do personagem (funcionam em qualquer esqueleto mixamo).
- **Fases antigas**: TV com o noticiário falso, Café Paradoxo, outdoor "Premium Ontem", cartaz do museu, vaso inteligente que julga, geladeira do turno, "faz café?" na turbina, máquina de sobrevivência premium; frases de efeito do Gael (Opções).
- 86 testes Node (rotas físicas de A2-M1/A2-M2, duelo, piano, vagões, perseguição, migração de save, frases); smoke WebGL das seis missões aprovado.

# v0.8.0 — 12/11/2026

- A1-M4 **Núcleo de Ruptura**: avenida destruída, alimentadores do gerador, armaria, duto secreto, registro de memória falsa e plataforma do reator.
- Leviatã de Aço procedural com três etapas, barra própria, metralha/perfuração/descarga sinalizadas, válvulas e propulsores como duas aberturas, auxiliares limitados e arena em dois níveis.
- Rompe-Casco: foguete visível com voo e colisão, área, autolesão, recursos próprios e ciclo de três armas PC/celular/gamepad. Arsenal antigo é normalizado sem perder o equipamento anterior.
- Quatro checkpoints; retomada antes do chefe reinicia o confronto completo. A derrota concede um único selo (1/1), libera a ponte e permite estabilizar o portal.
- A1-M3 libera A1-M4; migração também atende saves com a Usina já concluída. Conclusão do Ato I permanece condicionada à gravação confirmada.
- 75 testes Node locais aprovados. O workflow cobre WebGL das quatro missões, foguete real, blindagem/abertura, checkpoints e conclusão transacional; capturas em `qnt-v080-qa`.
- Revisão corrigiu queda sem retorno, posição segura no painel, colisão de foguete na face da parede, dano direto de 125, precisão de combate e orientação das placas.
- [Fase detalhada, regras, economia e limites de verificação](docs/A1_M4_NUCLEO_DE_RUPTURA.md). Ato II ainda não implementado.

# v0.7.1 — 12/11/2026

- Corrigida a adaptação A-pose → T-pose do NPC enviado: mãos e cotovelos permanecem no lado anatômico correto, sem atravessar o tronco.
- O modelo masculino passa a representar Nico, cliente da boate com conversa própria. Maya mantém sua aparência de performer.
- Missão/checkpoint inicia com comandos neutros. Deltas do mouse são consumidos uma vez, evitando multiplicar a rotação quando um frame executa vários ticks.
- Smoke controla pointer lock e verifica orientação/altura da câmera na entrada da Usina. 59 testes Node.

# v0.7.0 — 12/11/2026

- A1-M3 Usina Norte jogável: resfriamento/vapor, guindaste e ponte alternativa, turbinas/backup, galeria, defesa do terraço e saída por 2/3 Selos.
- Três checkpoints após o início; roteiro físico testado com o mesmo controlador de colisão. Desbloqueio automático para saves que já concluíram M2.
- Cenários de M1/M2 com detalhes mesclados de garagem, avenida, fachadas, subestação, bar/palco, bastidores e metrô. Sem alterar colisores das rotas antigas.
- Porco policial otimizado no E02; modelo enviado da boate substitui Maya. Novos modelos têm locomoção calibrada pelo contato da malha com o piso.
- Jill com idle de atendente, saudação/conversa e abrigo no apagão. Inimigos com impacto, recuo de tiro, movimento lateral/para trás e morte que termina apoiada no piso.
- Suporte a clipes one-shot no Actor. Corrigida a perda de reforços quando o pool ficava cheio: agora aguardam uma vaga e contam para o encontro.
- Mantidos os drops distintos e seus limites, o controle agachado e os checkpoints antigos. Detalhes e limites de verificação no relatório v0.7.0.

# v0.6.1 — 12/11/2026

- Jill substitui o atendente no ponto original do balcão. Objetivo, conversa e indicação da entrada usam Jill; a flag antiga permanece para compatibilidade com saves.
- Modelos otimizados já existentes mantidos: Jill 2,33 MB; reptiliano E01 1,65 MB, 20 mil triângulos. Anexos comparados por SHA-256.
- Cada recurso tem silhueta e símbolo próprios: maleta médica, balas 9 mm, cartuchos, colete, engrenagem e espingarda. Buffers compartilhados e partes mescladas por material.
- Loot ponderado pela necessidade de vida, munição e proteção. Atirador fornece mais 9 mm; drones fornecem peças. Cartuchos só entram no sorteio após adquirir a espingarda.
- Drops pousam na superfície abaixo do inimigo, flutuam e giram. Limite de 24 drops transitórios. Feedback de coleta mostra o ganho real; atributos cheios preservam itens no chão.
- Testes de regras e malhas, mais smoke WebGL de conversa, apagão, checkpoint, coleta e combate.

# v0.6.0 — 12/11/2026

Jill adicionada atrás do balcão da boate, preservando Basso e a missão. Reptiliano substitui o E01 nas duas fases. Jill: 16,06 → 2,33 MB; reptiliano: 12,00 → 1,65 MB e 108.498 → 20.000 triângulos. Animações adaptadas aos rigs, texturas WebP e testes do elenco incluídos. [Detalhes](docs/ELENCO_OTIMIZADO_v0_6_0.md).

# v0.5.0 — 12/11/2026

Fenda com shader, partículas, fragmentos instanciados e luz local. CrouchIdle/CrouchWalk com pés apoiados e cadência por velocidade. Materiais com relevo e integração dos controles móveis preservando A1-M2. Onze testes automatizados aprovados; inspeção WebGL pendente por bloqueio de inicialização do navegador.

# Changelog

## v0.2.0 — A1-M2 Noite de Neon + melhorias da A1-M1

**Publicação**
- O repositório agora roda direto no GitHub Pages, sem compilação: three.js vendorizado em `vendor/`, importmap no
  `index.html`, config lido por `fetch`, modelos em `models/`. Antes, o `index.html` da raiz era a versão de
  desenvolvimento do Vite e a página publicada não carregava.

**Nova missão: A1-M2 — Noite de Neon (GDD §28)**
- Rua do Elevador → recepção → salão com palco/passarela, bar, mesas, cabine de luz, jukebox, fliperama, banheiros,
  camarote VIP, corredor de serviço, bastidores (escritório, camarim, estúdio), elevador e túnel do metrô.
- Zona social com arma no coldre; conversa com Basso, Sol, Rubi, Maya, Jade, Dante e Cifra; Mara pelo rádio.
- Show com 4 performers (o mesmo modelo, 4 figurinos por máscara), 4 canhões de luz e 8 pessoas no público.
- Painel de luz: o canal que pisca "3, pausa, 1" é sorteado a cada partida; cortar o errado só apaga por 3 s.
- Apagão: alarme, luz de emergência, evacuação (público pela frente, artistas pelo palco), console analógico →
  **Eco Cronal permanente** (2 cargas, recarga sequencial de 25 s, salvo na campanha).
- Invasão em duas ondas por duas entradas com aviso, drone e transmissor portátil que precisa ser destruído.
- Corredor de serviço exige agachar sob a viga e saltar a estante; câmera de segurança varrendo os bastidores
  (ser visto chama 2 inimigos; dá para atirar nela); backup do Cifra; elevador até o túnel; 3 relés; emboscada com
  atirador na passarela suspensa; trem que passa uma vez; Fenda de Saída na plataforma.
- Opcionais: jukebox faixa 7 → código 3-0-1 → camarote VIP → cofre (3º selo + gravação original); banheiro →
  cartaz + grade do duto → atalho agachado até os bastidores; fliperama com registro corrompido. Espelho quebrável.
- Checkpoints: entrada, início da invasão (extra, para não refazer a parte social), invasão neutralizada, túnel.

**A1-M1 e sistemas**
- **Mira**: segurar o botão de mira deixava o tronco e os braços presos e inclinados para trás. O mixer do three.js
  não reescreve ossos com trilha constante (Idle), então a sobreposição de mira acumulava; e o sinal da inclinação
  estava invertido. Agora os ossos são restaurados a cada quadro, o tronco inclina para o lado certo e tem limite.
- **Rolamento** nunca acontecia (o estado era sobrescrito no mesmo tick). Corrigido.
- **Ctrl removido**: Ctrl+W fecha a aba do navegador. Rolar = Alt ou Z; **agachar = C** (alterna), **slide** = C
  durante o sprint; **coronhada = F** (também quebra grade, vidro, barril).
- Marcador de objetivo na tela com distância (desligável em Opções); segredos nunca são marcados.
- Inimigos com visual próprio: roupas por máscara (`gael_masks.png`) + capacete, placas e ombreiras.
- Céu noturno, skyline instanciado, chuva só em área externa, postes.
- Pointer lock: após sair com Esc o jogo não fica mais preso no modo "clique para capturar".
- Inimigo travado sem visão por 15 s recua (GDD: IA travada não bloqueia a missão). Achado em teste: um invasor
  ficava preso na parede da recepção e impedia o fim da invasão.
- Tela de Missões, botão "Próxima missão" nos resultados, Continuar retoma a próxima missão liberada.
