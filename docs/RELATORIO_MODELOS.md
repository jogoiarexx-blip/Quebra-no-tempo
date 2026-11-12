# Relatório de correção dos modelos

Pipeline reproduzível: `tools/build_models.py` (entrada em `assets_src/`, saída em `public/models/`).
Imagens de antes/depois em `docs/img/`.

## principal.glb → gael.glb (protagonista)

| Problema encontrado | Evidência | Correção |
|---|---|---|
| Pelve e cinto tortos, pernas assimétricas ao andar/correr | as trilhas de translação animavam `LeftUpLeg`/`RightUpLeg` 7,1 cm e 9,0 cm fora da posição de bind | removidas todas as trilhas de translação e escala, exceto a do `Hips`; ossos ficam nos offsets de bind |
| Só havia `Running` e `Walking` | o jogo dava T-pose parado, no ar e mirando | adicionados `Idle` (respiração, 2,4 s), `Aim`, `Fall`, `Crouch`, gerados por deltas em espaço do mundo a partir da T-pose |
| 192 canais por clipe (64 de escala inúteis) | — | 67 canais por clipe |
| Arquivo de 16,0 MB (3 PNG 2048²) | — | 1,8 MB (WebP 1024², `EXT_texture_webp`) |
| Visual não era o Gael do GDD §2.2 e trazia o símbolo de radiação nas costas e na fivela, mais cabelo loiro reto com óculos — conjunto que remete ao protagonista do jogo de referência, o que o próprio GDD §2.1 proíbe | — | retextura por máscaras 3D→UV: cabelo castanho-escuro, jaqueta cinza de oficina, luva esquerda vermelha, símbolo das costas removido, fivela com o emblema do jogo (mostrador cortado por fenda) |
| Altura 1,70 m (GDD pede 1,78 m) | bounding box | escala 1,047 aplicada no jogo |

**Pendências que só se resolvem no modelo 3D, não por script:** o rosto, o corte de cabelo e os óculos continuam com a
mesma silhueta; recomendo trocar a cabeça numa próxima versão do modelo. O osso `Hips` tem bind inclinado (≈23°) e fora
do centro (x = 4,6 cm); funciona, mas um re-rig limpo evitaria surpresas. Não há malha de dano ("1 variação de dano" do GDD §23).

## Crimson_Vixen_animacoes_corrigidas.glb → sol.glb (dançarina)

| Problema encontrado | Evidência | Correção |
|---|---|---|
| Braços achatados e torcidos ("papel de bala") em **todas** as 5 animações | torção do braço em relação ao ombro de 80–110° (no modelo principal, ≈20°); mãos viradas ≈160° | erro de orientação **constante por osso**, medido contra o modelo principal nos clipes `Walking`/`Running` que os dois compartilham, e removido das 5 animações |
| — erro medido | ombros 28,7° / 36,1°, braços e antebraços 63° (esq.) / 101–102° (dir.), mãos 164° / 155°, quadril 14,7°; desvio máximo entre quadros ≤ 3,4° | depois da correção a torção volta a ≈20° e a mão a ≤ 50° |
| `Not_Your_Mom` não fechava o loop | salto de pose no último quadro (até 0,126 em quaternion) e 5 cm no quadril | últimos quadros interpolados para o primeiro |
| Danças começavam fora do centro (até 31 cm) | translação do `Hips` | recentradas em X/Z para caber num palco |
| Sem `Idle` | — | adicionado (3 s) |
| 15,6 MB | — | 1,9 MB |

As danças não tinham um original limpo para comparar; a correção delas é a mesma calibração aplicada aos clipes de
locomoção. Visualmente os braços ficaram naturais nos quadros que conferi, mas vale assistir às três inteiras.
Ossos sem uso (`Bone_022`–`Bone_025`) foram mantidos. O rig não tem dedos.

### Máscaras de figurino (reuso com roupas diferentes)

`public/models/sol_masks.png` (2048×1024, opaco): metade esquerda **R** = tecido (sutiã/tanga), **G** = couro (tiras,
coleira, punhos, ligas, sapatos), **B** = cabelo; metade direita **R** = meia arrastão. Gerado automaticamente por cor +
posição 3D + osso dominante.

Os figurinos ficam em `OUTFITS` (`src/characters.js`): `sol` (original), `lux`, `ambar`, `violeta`, `esmeralda`.
Cada um define cor de tecido, couro, cabelo e meia (`null` remove a meia). Criar outra dançarina é uma linha:

```js
new Actor('sol', { outfit: 'violeta' })
```

O que as máscaras **não** fazem: mudar o corte da roupa (vestido, jaqueta, saia). Isso exige malha nova. Elas trocam
cor/material das peças que já existem. Tom de pele também não tem canal próprio ainda.
