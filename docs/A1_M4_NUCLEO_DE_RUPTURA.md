# A1-M4 — Núcleo de Ruptura

Detalhamento da fase implementada na v0.8.0, baseado no GDD v2.2 §7/§8/§46. É a quarta missão e o encerramento do Ato I, após Usina Norte. A próxima era continua planejada; o portal desta missão não abre uma fase inexistente.

## Intenção e ritmo
O jogador aplica o Eco Cronal que já aprendeu. A primeira metade alterna combate urbano e exploração técnica; a segunda concentra a luta do Leviatã de Aço. A rota principal não exige saltos de precisão. Degraus, sinalização âmbar, iluminação ciana dos controles e marcador de objetivo conduzem o percurso. O tempo de referência de 20–35 minutos do GDD depende de playtest: não é uma duração medida desta implementação.

| Setor | Ambiente e leitura | Objetivo e desafio | Recursos e alternativas |
|---|---|---|---|
| Avenida da contenção | Asfalto molhado, rachaduras, concreto solto, ônibus abandonado, carros, edifícios e serviços expostos | Vencer dois reptilianos e um porco atirador; alcançar o complexo | Barreiras de concreto e veículos como cobertura; vida e 9 mm; duto lateral opcional |
| Complexo de contenção | Teto industrial, tubulações, inspeção, letreiros e dois painéis iluminados | Desligar alimentadores oeste e leste; vencer dois invasores | Painéis independentes persistem no save; corredor central continua livre |
| Armaria de emergência | Bancada com protótipo e terminal de registros | Retirar Rompe-Casco e abrir acesso ao reator | Proteção; registro opcional sobre uma avenida substituída nas memórias |
| Pátio do Leviatã | Arena ampla, válvulas laterais, pilares, tubos e mecha visível | Acionar contenção e interpretar os avisos de ataque | Duas válvulas ou propulsores para criar abertura; cobertura no piso e escadas laterais |
| Passarelas do reator | Duas galerias a 4 m e ligação traseira | Alterar altura, flanquear auxiliares e alcançar reserva | Vida, dispensador limitado e mais uma aproximação ao chefe |
| Plataforma de ruptura | Ponte sobre o intervalo, anéis concêntricos, pórtico e console | Após a derrota, estabilizar o primeiro portal | Um único Selo de Continuidade, concedido pelo chefe; saída 1/1 |

## Sequência de objetivos
1. Avançar pela avenida, eliminando o grupo da rua.
2. Entrar na contenção e desligar os dois alimentadores do gerador; a ordem é livre.
3. Eliminar o grupo do controle e retirar o Rompe-Casco da bancada.
4. Acionar o painel da arena. O checkpoint é gravado **antes** de ativar a luta; o portão fecha durante o confronto.
5. Desviar dos ataques, abrir a proteção por válvula ou propulsor e atingir o núcleo.
6. Derrotar o Leviatã. A ponte e a travessia ao reator são liberadas, e o Selo é concedido uma única vez.
7. Subir a escada traseira, atravessar a passarela e estabilizar o portal no console.
8. Interagir com a Fenda. A conclusão do Ato I só é confirmada após gravar o progresso.

## Leviatã de Aço
Modelo original procedural e articulado, com peças mescladas por material: chassi blindado, pernas hidráulicas, broca, metralhadora, propulsores cianos, proteções móveis e núcleo luminoso. A barra própria mostra vida, etapa e instrução de ataque/abertura.

| Etapa | Padrão | Transformação e resposta |
|---|---|---|
| 1 — Blindagem | Metralha em pista delimitada e perfuração circular; aviso de 1,65 s | A marca fixa a posição antes do ataque. Deslocamento ou Eco permite sair; cobertura real bloqueia metralha |
| 2 — Reator rompido | Mantém pistas e perfuração; chefe se reposiciona lateralmente | Proteções do complexo se soltam; um drone e um invasor pressionam o jogador. As passarelas mudam linhas de tiro |
| 3 — Último circuito | Alterna pista, perfuração e descarga circular mais ampla, com aviso de 1,85 s | Reforço adicional só entra depois de limpar o anterior; no máximo dois auxiliares ativos neste encontro |

**Abertura por válvula:** duas rodas laterais acionam o circuito e expõem o núcleo por 5,5 s. Cada uma resfria por 12 s. Não podem interromper a recomposição da arena nem o instante ativo de um ataque.

**Abertura por propulsor:** 72 pontos de dano nos propulsores expõem a mesma fraqueza, sem obrigar o jogador a ir até uma válvula. A blindagem central fechada rejeita dano.

**Contra-ataque:** núcleo exposto muda para verde; tiros de qualquer arma funcionam. Cada abertura aceita até 120 de dano. Há 1080 HP divididos em três etapas de 360, portanto são necessárias ao menos três aberturas por etapa. Rompe-Casco alcança o limite com um acerto; pistola é uma alternativa se faltar munição pesada. O excesso de um tiro não atravessa a transição de etapa.

**Eco Cronal:** reposiciona Gael para uma amostra segura do mesmo setor. Continua com as regras globais de duas cargas e recuperação sequencial. Não restaura vida, munição ou estado do chefe. Nenhum selo depende de gastar uma carga.

## Rompe-Casco e economia
Lançador de projétil visível, 125 de dano direto, voo a 32 m/s, alcance de 80 m e explosão de 3,2 m. Pente de um foguete, recarga de 2,1 s, cadência de 0,8/s e reserva máxima de 12. A explosão pode ferir Gael de perto; não há dano direto duplicado ao chefe pela área. A arma não é um hitscan instantâneo.

A armaria entrega o lançador carregado e cinco foguetes de reserva. Há dois lotes fixos de quatro na arena e três lotes de emergência de dois. O dispensador espera 18 s entre usos e só atende quando a reserva pesada está baixa. A pistola e a 9 mm da arena mantêm o confronto vencível se os foguetes forem desperdiçados; a habilidade do jogador ainda é necessária para acertar as aberturas.

Tecla **3** seleciona o lançador. A roda, botão **ARMA** no celular e **Y** no gamepad percorrem todas as armas adquiridas, pulando as indisponíveis.

## Segredos e narrativa
- **Reserva clandestina:** duto de serviço com teto baixo na avenida, acessível agachado por C; contém 45 Peças Cronais e reserva de 9 mm.
- **Memória falsa:** terminal opcional da contenção registra duas versões incompatíveis da cidade. O portal aponta para o Oeste; o texto introduz a manipulação de memória sem alterar retroativamente os objetivos das fases anteriores.

Cifra orienta a chegada pelo rádio; Íris identifica a vulnerabilidade e interpreta os registros. Gael reconhece a maquinaria e usa humor breve antes do confronto. A derrota dá espaço à revelação sobre Nova Aurora e à coordenada do próximo ato.

## Checkpoints, retomada e saída

| Checkpoint | Posição e contrato |
|---|---|
| cp00 | Início da avenida, loadout e Eco disponíveis |
| cp01 | Entrada da contenção, estado da exploração salvo |
| cp02 | Antes da arena, com gerador neutralizado e lançador adquirido; reinício restaura chefe completo e sem selo |
| cp03 | Após a derrota, selo 1/1 e ponte liberada; reiniciar preserva a vitória |

Saves v0.7 que já concluíram A1-M3 recebem A1-M4 no menu. Campos ausentes de foguetes/lançador são acrescentados sem apagar o arsenal antigo. Uma falha de gravação na Fenda mantém a missão em andamento e permite repetir a tentativa, sem marcar o Ato I como concluído.

## Verificação e limites
Testes Node usam regras reais e a mesma física AABB do navegador para atravessar alimentadores, armaria, duto, escadas, passarelas e console final. Smoke do CI carrega as quatro missões em WebGL e verifica um foguete lançado pelo controlador, blindagem, dano em janela, retomada antes/depois do chefe e conclusão transacional. As capturas ficam no artefato `qnt-v080-qa` do Actions. FPS em celular físico, duração e balanceamento final continuam pendentes de playtest.
