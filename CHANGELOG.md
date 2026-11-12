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
