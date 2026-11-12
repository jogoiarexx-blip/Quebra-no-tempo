# Elenco otimizado — v0.6.0

12/11/2026. Modelos recebidos: `Jill Valentine.glb` e `reptiliano humanoid.glb`. Originais preservados; somente as versões processadas são usadas pelo jogo.

| Modelo | Arquivo original | Otimizado | Triângulos antes | Depois | Uso |
|---|---:|---:|---:|---:|---|
| Jill | 16.063.592 bytes | 2.333.680 bytes | 10.265 | 10.265 | NPC no balcão do Véspera (A1-M2) |
| Reptiliano | 12.001.716 bytes | 1.653.672 bytes | 108.498 | 20.000 | Substitui a aparência do E01 Saqueador Cronal |

## Integração

- Jill mede 1,70 m e fica em `(-12.2, 0, 34.2)`, atrás do balcão, voltada para o salão. Basso, seus diálogos e os gatilhos da missão são mantidos. Jill é uma NPC não hostil, sem bloquear passagem nem receber dano; durante o apagão se abaixa atrás do balcão. O estado é reaplicado ao restaurar checkpoint.
- O reptiliano é usado pelas quatro instâncias do pool E01 nas duas missões. Malha e materiais são compartilhados; cada instância tem seu esqueleto e mixer. Sua escala resulta em aproximadamente 1,80 m. IA, vida, dano, rajadas, telegraph, colisores e progressão continuam os do E01. O atirador E02 e o drone continuam com as aparências anteriores.
- Mantidos esqueleto, UVs, normal map e mapa de material. Base e normal map passam para 1024 px; mapa de material para 512 px, em WebP. A estimativa teórica de memória dos três mapas RGBA com mipmaps passa de 64 MiB para 12 MiB por conjunto; o consumo real depende da GPU/navegador.
- O reptiliano recebeu simplificação por colapso de arestas, mantendo skin com até quatro influências normalizadas por vértice. A Jill já tinha uma malha adequada: sua geometria foi preservada.
- Idle, Walking, Running, Aim, Fall e Crouch foram adaptados das animações corrigidas do jogo para os eixos de bind de cada esqueleto. As quatro ações adicionais da Jill continuam disponíveis. O motor também gera CrouchIdle/CrouchWalk para ela durante o carregamento.

## Reprodução e testes

`tools/optimize_cast.py` reproduz o processamento com Blender, numpy, Pillow e os dois arquivos originais. Caminhos e hashes dos originais, contagens e tamanhos constam em `CAST_OPTIMIZATION_v0_6_0.json`.

`npm test`: 13 testes aprovados localmente, incluindo pesos, altura de bind, animações finitas, limites de deformação amostrados em Idle/Walking/Running/Aim e as 11 regressões da versão anterior. Render neutro dos dois GLB otimizado inspecionado: modelos completos, texturizados, escala compatível, braços sem T-pose e pés próximos do chão.

A publicação executa também teste de WebGL das duas missões e verifica os assets realmente usados pelo E01 e pela Jill, o local do balcão, spawn e dano/morte de um E01. A aprovação desse teste deve ser conferida no workflow de publicação. Não representa teste de campanha completa nem medição de FPS em celulares físicos.
