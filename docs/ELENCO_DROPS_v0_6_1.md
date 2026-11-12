# Elenco e recursos — v0.6.1

## Personagens

Jill substitui o atendente do bar em **A1-M2 — Noite de Neon**, na posição `(-12.4, 0, 31)`, atrás do balcão. A conversa, o objetivo e a indicação dada por Dante passam a usar Jill. Não há um Basso adicional no bar. A flag histórica `talked_basso` é preservada para manter os checkpoints existentes. Durante o apagão, Jill usa CrouchIdle; o estado é reaplicado ao restaurar o checkpoint.

Os dois anexos foram comparados por SHA-256 e são exatamente os originais já processados na v0.6.0. Nenhuma nova conversão com perda foi aplicada.

| Modelo | Original | Usado no jogo | Triângulos |
|---|---:|---:|---:|
| Jill | 16.063.592 bytes | 2.333.680 bytes | 10.265 |
| Reptiliano | 12.001.716 bytes | 1.653.672 bytes | 20.000 (original: 108.498) |

O reptiliano substitui a aparência do E01 nas duas missões. Continuam valendo escala, esqueleto, animações e limites do [relatório de otimização](ELENCO_OTIMIZADO_v0_6_0.md). Os parâmetros de combate do E01 continuam os mesmos.

## Recursos

| Tipo | Forma | Cor/símbolo |
|---|---|---|
| Vida | Maleta com alça | Branca, faixas verdes e cruz nas duas faces |
| 9 mm | Quatro balas finas no suporte | Âmbar/dourado com pontas claras |
| Cartuchos | Três cartuchos grossos | Vermelhos com bases de latão |
| Proteção | Colete com ombros e recorte no pescoço | Ciano, cinta e placa clara |
| Peças cronais | Engrenagem com núcleo | Dentes violetas e núcleo claro |
| Trovão Duplo | Espingarda de dois canos | Metal e coronha marrom |

Todas as formas usam geometria local, sem novas texturas ou downloads. Partes são mescladas por material; cópias do mesmo recurso compartilham geometria e material. O descarte acontece ao trocar de missão, evitando liberar o buffer de outra cópia ao coletar um item. As malhas medem de 148 a 380 triângulos e usam três ou quatro chamadas de desenho, incluindo o halo. O teste automatizado limita cada tipo a 512 triângulos e quatro chamadas; os halos planos usam passagem única para evitar desenhar duas vezes o mesmo anel transparente.

## Sorteio e coleta

- Chance-base de drop: 50%, multiplicada pelo fator de recursos da dificuldade (1,25 / 1 / 0,85). É a mesma chance-base da versão anterior.
- O sorteio remove recursos já cheios. Kit de vida tem peso 8 com HP abaixo de 40 e peso 1 acima desse valor; não garante cura em toda morte.
- 9 mm só entra com Martelo-9 adquirida; cartuchos só entram com Trovão Duplo adquirida. Baixa reserva aumenta o peso dessas munições.
- E01 fornece 12 balas por pacote; E02 fornece 18. Kits fornecem 20 de vida; proteção fornece 15; cartuchos fornecem 2. Drones fornecem 8 peças, quando o sorteio concede drop.
- Munição recebida é ajustada pela dificuldade, limitada pela capacidade. Cura e proteção respeitam o máximo de 100. O aviso informa o ganho efetivo, inclusive em coletas parciais.
- Itens fixos e drops não são consumidos com o recurso cheio. Itens fixos continuam registrados no save. Drops de combate permanecem transitórios e são removidos ao reiniciar checkpoint.
- O raio vertical encontra o chão ou outra superfície abaixo do inimigo. Há no máximo 24 drops ativos; o mais antigo sai quando o limite é excedido.

## Verificação

- **Executado localmente:** 20 testes Node aprovados, incluindo integridade dos dois GLB, animações, skin, controle agachado, entradas, regras de loot, limites da coleta e geometrias compartilhadas.
- **Verificação WebGL no workflow:** duas missões, Jill única no balcão, diálogo de progressão, apagão/CrouchIdle e restauração, coleta real de item fixo, recusa com recurso cheio, morte de reptiliano, drop no chão, peças de drones e limite de objetos. Capturas de Jill, reptiliano e recursos ficam no artefato de QA do workflow.
- **Limitação local:** o navegador de prévia deste ambiente não disponibilizou contexto WebGL. A aprovação dos testes WebGL deve ser confirmada no workflow associado ao commit.
- **Não testado:** fixture de checkpoint produzida pela v0.6.0 (a flag e o formato foram preservados e revisados), campanha inteira, FPS e consumo real em aparelhos físicos, conteúdos além das duas missões disponíveis. O sorteio é balanceamento inicial; não representa playtest de campanha.
