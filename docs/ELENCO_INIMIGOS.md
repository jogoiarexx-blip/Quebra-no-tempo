# Elenco de inimigos — artes de conceito recebidas

As seis artes estão em `docs/conceitos_inimigos/`. São imagens 2D em T-pose; **ainda não existem como modelos 3D**,
então o jogo segue com substitutos. Proposta de encaixe nos arquétipos do GDD §6.1:

| Arte | Papel sugerido | Arquétipo do GDD | Onde entra |
|---|---|---|---|
| 06 soldado lagarto (pistola) | infantaria básica: avança e dá rajada curta | **E01 Saqueador Cronal** | A1-M1 (substitui o humanoide de capacete) |
| 05 javali policial (escopeta) | pressão a curta distância, empurra o jogador da cobertura | variante de E01 / novo "Tropa de Choque" | A1-M2 em diante |
| 02 robô blindado | escudo frontal, fraco nas costas/pernas/explosão | **E04 Guarda Blindado** | A1-M3 |
| 03 bruto réptil com minigun | supressão pesada, lento, mini-chefe de arena | pesado / sub-chefe | A1-M4 e Ato V |
| 01 demônio alado | ameaça aérea que mergulha | voador (troca o drone em eras antigas) | Ato III (1326) |
| 04 polvo cerebral | flutuante, ataque psíquico carregado | voador de elite | Ato V / Limbo |

## Como plugar um GLB quando estiver pronto

1. Rig humanoide com clipes chamados `Idle`, `Walking`, `Running`, `Aim`, `Fall`, `Crouch` (clipe ausente cai em `Idle`).
   Modelo olhando para +Z, metros, pés em y = 0, ~1,8 m.
2. Copie para `public/models/enemies/` e aponte em `manifest.json`: `"E01": "soldado_lagarto.glb"`.
3. Se o rig for Mixamo como os dois que você mandou, `tools/build_models.py` serve de base para corrigir e gerar os clipes que faltarem.

Voadores e o robô com escudo precisam de comportamento novo em `src/enemies.js` (hoje existem E01, E02 e drone).

## Atenção antes de modelar

O GDD §2.1 proíbe copiar inimigos do jogo de referência. Duas artes estão muito próximas de inimigos clássicos dele:
o **javali policial** e o **polvo cerebral**. O robô e o bruto também carregam o símbolo de radiação, que é marca
daquele universo. Sugiro mudar a espécie/uniforme do primeiro, a anatomia do segundo e trocar o símbolo pelo emblema
do Quebra no Tempo antes de gastar tempo em 3D.
