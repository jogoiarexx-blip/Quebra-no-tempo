# A1-M4 — Núcleo de Ruptura

## Intenção e fonte
Implementar a próxima missão do GDD v2.2 (§7, §8, §46): finalizar Nova Aurora com Leviatã de Aço, uma peça de saída **1/1**, plataforma do reator e primeiro portal estável. Continuar a arquitetura Three.js modular existente, os saves e controles PC/celular/gamepad. O pedido atual autoriza implementação e a publicação segue o fluxo já autorizado deste projeto.

## Percurso e identidade
1. Avenida destruída: ônibus tombado, faixas rachadas, barreiras, carros abandonados, dutos expostos, 3 invasores. Rotas laterais têm cobertura e recursos, sem saltos obrigatórios.
2. Complexo de contenção: corredor técnico, armaria e sala de controle. Desligar os dois alimentadores do gerador; recuperar o protótipo Rompe-Casco e ler o registro opcional. Uma rota baixa leva a um esconderijo.
3. Arena do reator: piso inferior amplo e passarelas laterais a 4 m, com escadas de degraus de 0,4 m. O chefe fica visível desde a entrada; o jogador inicia a luta no painel. Checkpoint imediatamente antes, com gerador desligado e armamento adquirido.
4. Clímax: três etapas do Leviatã, maquinário rompe a proteção e abre a travessia elevada ao reator. O selo só nasce após derrota. A fenda exige também estabilizar o portal no console final.

## Chefe e decisões de implementação
Mecha procedural original: pernas hidráulicas, placas inclinadas, broca, metralhadora e núcleo brilhante. 1080 HP em três etapas de 360. Aberturas limitam dano a 120 para exigir no mínimo três contra-ataques por etapa. Núcleo blindado não sofre dano. Duas aberturas válidas: válvulas com cooldown ou dano nos propulsores. A exposição dura 5,5 s; o dano de todas as armas é válido e Rompe-Casco é mais eficiente. Nenhuma carga de Eco é requisito para terminar; os ataques fixam o alvo durante o aviso e recompensam a volta à posição segura.

Etapa 1: pista de metralha e perfuração, ambas com aviso no piso e mensagem. Etapa 2: adição de drone e deslocamento lateral do chefe; proteção do reator se rompe, ponte elevada é habilitada. Etapa 3: alterna pistas, perfuração e descarga de área com aviso mais longo; no máximo 2 auxiliares no encontro, orçamento global nunca acima de 4. Ataques respeitam nível vertical e cobertura real. A máquina de estados só avança em simulação ativa, nunca no pause. Checkpoint de luta reinicia HP, padrões e auxiliares; checkpoint pós-chefe preserva derrota e selo.

## Arma, economia e controles
Rompe-Casco: 125 de dano direto, projétil visível com voo, explosão de raio 3,2 m e risco de autolesão. 0,8 tiros/s, pente 1, recarga 2,1 s, reserva máxima 12 foguetes. Tecla 3 e ciclo genérico nas três armas para roda/gamepad/celular; saves antigos ganham os campos ausentes sem perder armas anteriores. Armaria obrigatória + reservas na arena e dispensador finito (3 usos de 2 foguetes, 18 s de cooldown, apenas quando reserva está baixa). Pistola continua permitindo terminar se todos os foguetes forem desperdiçados. Dois segredos, registro sobre memória falsa e suprimentos no duto; sem selo alternativo na missão de chefe.

## Estado e verificação
A1-M3 libera M4, inclusive saves antigos. M4 não inventa A2-M1 jogável: resultado encerra Ato I e indica destino Oeste ainda previsto. Checkpoints: cp00 início, cp01 contenção, cp02 antes do chefe, cp03 após a derrota. Nenhuma passagem obrigatória depende de pulo/mantle. Testes de regras, tiro/projétil, migração, rotas físicas e transição real via botão. Smoke WebGL no CI cobre a missão, dano bloqueado/exposto, reinício da arena e conclusão com save confirmado. Duração de referência do GDD é hipótese; não prometer duração ou FPS sem playtest/medição em aparelho físico.

## Abordagem
Extensão dos módulos de missão, física e hooks existentes; sem trocar engine, assets de elenco ou refazer o jogo. Um nível isolado sem campanha perderia a progressão; concentrar chefe no main criaria acoplamento. Assim, regras serializáveis e apresentação do Leviatã ficam em módulos próprios, consumidos por A1-M4.
