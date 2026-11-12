# Quebra no Tempo — v0.5.0

12/11/2026. Base: repositório `766a803`, preservando A1-M1 e A1-M2. Controles de toque e CSS responsivo adaptados do pacote v0.4.0; a versão inteira desse pacote não foi sobreposta porque continha apenas A1-M1 e removeria sistemas presentes na base do repositório.

## Alterações

- Fenda: substituição do retângulo uniforme por shader com máscara afilada irregular, borda ciano/branca, filamentos animados, halo aditivo e círculo de energia no chão. Dezoito fragmentos triangulares em uma malha instanciada, órbitas e rotações diferentes; partículas em buffer fixo atraídas ao centro. Duas luzes locais, azul e âmbar, pulsando; estabilidade e flare continuam controlados pela lógica original da missão.
- Brilho implementado com camadas aditivas locais. Não há bloom de tela inteira, refração do cenário, SSAO ou novas sombras dinâmicas da fenda. A sombra existente do personagem segue o preset alto.
- Agachado: novos CrouchIdle/CrouchWalk gerados uma vez durante o carregamento, a partir do esqueleto real e das poses existentes. IK analítico em duas articulações durante a geração, com pé de apoio fixo na altura do chão, balanço curto do outro pé, pelve 54 cm abaixo, compensação do pescoço e braços em pose tática. Isso não é IK contínuo para terrenos irregulares.
- Mistura de estados em 0,18 s; velocidade máxima agachada de 1,65 m/s; aceleração de 14 m/s²; cadência considera velocidade e escala do modelo. Crouch estático original preservado para rolamento/escalada.
- Câmera desce/sobe com amortecimento; verifica teto antes de manter a posição elevada. Colisor muda imediatamente entre 1,8 e 1,1 m para garantir passagem/segurança física; levantar continua exigindo espaço livre. Altura de saída dos tiros acompanha o agachamento.
- Piso, concreto e metal recebem relevo por bump usando as texturas locais existentes, com resposta especular moderada. Sem downloads de texturas novas.
- Toque: joystick, câmera, tiro, mira, interação, pulo, agachado, esquiva, golpe, recarga, corrida, Eco, ombro e troca de arma. Pausa e tela cheia visíveis. Preservados teclado/mouse/gamepad e recursos da segunda missão.
- Pausa interrompe animação do jogador, inimigos e fenda; perda de foco limpa comandos e pausa a partida. Aba oculta suspende renderização. Entradas e menus responsivos incorporados.

## Verificação reproduzida

`npm test`: 11 testes aprovados, zero falhas.

1. Dois ciclos próprios, fechamento do loop, valores finitos e pelve abaixada.
2. Amostragem dos ciclos no GLB real: pés não atravessam a altura de apoio; pé de contato permanece apoiado (tolerância de 3 mm na articulação do tornozelo).
3. Controlador real: agachar parado, andar agachado, parar, câmera amortecida, limite de velocidade, teto impedindo levantar e retorno a Idle.
4. Fenda: luz responde à estabilidade, nenhuma nova malha/buffer após 240 atualizações, partículas finitas, 48/96 pontos em qualidade baixa/alta e tempo congelado na pausa.
5–11. Regressões de entrada: foco, teclado/Tab, três ponteiros simultâneos, cancelamento, pausa, menus e alternância toque/mouse.

Verificados também sintaxe de todos os módulos de `src`, existência dos imports relativos e ausência de IDs duplicados na página.

## Limites e pendências

O Chromium de teste não iniciou: bloqueio do ambiente ao criar o socket interno do navegador. Portanto **não houve inspeção visual WebGL, compilação dos shaders em GPU, medição de FPS, teste físico Android/iPhone ou conclusão das missões nesta sessão**. Testes matemáticos do esqueleto e do controlador não substituem esse playtest.

Revisar visualmente: proporção/brilho da fenda nas duas missões, contato do corpo/roupa durante os blends, marcha lateral/em marcha à ré durante mira, obstáculos baixos, legibilidade dos botões em telas pequenas e FPS nos três presets. SSAO, refração do fundo e polimento adicional de cenário ficam para uma próxima revisão após essas verificações.

## Jogar e publicar

Extraia a pasta `Quebra-no-tempo` e execute `JOGAR.bat` (Windows com Python) ou `jogar.sh`. Alternativamente: `python3 -m http.server 8080`, abrindo `http://localhost:8080`. Não abra a página com `file://`.

O ZIP tem a estrutura reconhecida pelo workflow existente de publicação por pacote, com index, fontes, modelos e Three.js local. Esta entrega **não alterou a branch principal nem publicou no GitHub Pages**. O carregamento é estático e não requer npm install/build. `npm test` requer Node moderno.
