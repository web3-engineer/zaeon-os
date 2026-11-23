# Testes do #870 (PR 1) — Sala de Estudos e Notícias

Achados nos testes de 17 a 20/11 e nas auditorias de tela no celular (375 px).
O card vai em 2 PRs. Este é o PR 1 (Sala de Estudos + Notícias), junto com o #868 (ver `docs/TESTES_AGENTE_868.md`).
O PR 2 (apresentação, cyberespaço, Sobre nós e barra de cima) vem depois.

## O que muda

### Sala de Estudos (blueprint)
- **Abre encaixado:** o foco (a figura e o estudo) abria com zoom mínimo de 0,6. No celular, isso cortava as bordas. Agora o foco cabe na largura, com piso de 0,35 (`ZOOM_MIN_FOCO`, `PranchaBlueprint.tsx`). No computador continua grande como antes.
- **Legenda em botão:** percurso / prática / crítico ficava sempre na tela, por cima do desenho (e no celular, do zoom). Agora há um botão **"Legenda"**, que abre um quadro com fundo. No celular o botão fica em cima da barra de zoom, porque lado a lado não cabe em 375 px.
- **Zoom com fundo:** a barra "− 60% + ◎ ⤢" era transparente e ficava por cima do texto dos cartões. Agora tem fundo nas 3 skins.
- **Título provisório:** enquanto a Zaeon monta, o cartão mostrava o PEDIDO em maiúsculas ("FAZ UM BLUEPRINT DE TESTE SOBRE…"). Agora mostra "Montando o seu blueprint…". O cartão do YouTube espera o título de verdade em vez de buscar pelo pedido.
- **Carregamento:** no lugar de "a Zaeon está montando o blueprint desta conversa…" parado, aparecem:
  - um traço sendo desenhado (régua no blueprint, lápis na cartolina, pincel na barbie);
  - as etapas acendendo uma a uma (lendo a conversa · escolhendo o título · desenhando o percurso · prática e produto · fontes do YouTube).
  - Não é o progresso real: a última etapa fica acesa até o blueprint chegar. Com "menos animação", o traço fica parado.
- **Toque:** no celular, "passe o mouse pra desmontar · clique pra fixar" virou "toque numa peça pra destacar · toque de novo pra soltar" (`FiguraIso.tsx`).

### Notícias
- **Borrão ao lado do logo:** a barra de cima é fixa, e o título "THE LOUNGE" ficava atrás dela. Com o desfoque da barra, virava uma mancha branca. Agora a página começa abaixo da barra (`app/news/page.tsx`).
- **Imagem da Hedera:** a foto do Unsplash dá 404 (aparecia "Hedera I"). Na lista virou um ícone de foguete num fundo roxo, e na página da notícia virou um fundo em degradê.
- **Títulos cortados:** no celular os títulos quebram linha (até 2 linhas na lista). No computador continuam numa linha, por causa da barra lateral que encolhe.
- **Letras:** nada abaixo de 11 px nas páginas da Hedera (eram 8 a 10 px).
- "Acessar Justificativa Oficial" já estava com 11 px, e não há mais rótulos em inglês na lista.

## Para o Martinez

- **Blueprint** (`components/blueprint/`: `PranchaBlueprint.tsx`, `Modulos.tsx`, `FiguraIso.tsx`) é área dele.
- **Barra de cima sem fundo** (vai no PR 2): `bg-background/80` não é gerado porque a cor é `var(--background)` em hex. A barra fica só com o desfoque, e tudo que passa atrás vira borrão, em todas as páginas.
- Não precisa de `prisma db push`.

## Testes automáticos

- `components/blueprint/acabamento870.test.tsx` (novo, 9 testes):
  - título provisório e carregamento sem resumo;
  - o título de verdade volta com resumo;
  - as etapas acendem uma a uma e param na última;
  - o YouTube não busca pelo pedido;
  - a legenda em botão;
  - o zoom com fundo nas 3 skins;
  - o piso do encaixe;
  - o texto de toque.
- `app/news/noticias870.test.ts` (novo, 4 testes): página abaixo da barra, sem a foto 404, títulos sem corte no celular e letras ≥ 11 px.
- Blueprint, Sala de Estudos e dicas (`DicasRapidas`) continuam passando (70 testes).
- Suíte completa (23/11): 836 arquivos, 8040 testes passando. As falhas são as mesmas da main, mais o `lib/rag/docx.test.ts`, que é instável.

## Verificado na prévia local (prints enviados à Giulia, `prints-870/`)

- Notícias no celular: "THE LOUNGE" inteiro abaixo da barra, sem borrão; destaque com o foguete; títulos em 2 linhas.
- Blueprint montando (celular): "Montando o seu blueprint…", traço e régua, etapas acendendo.
- Blueprint pronto (celular): encaixado, botão "Legenda" em cima do zoom, zoom com fundo.
- Legenda aberta (celular): quadro com fundo, acima do botão, sem cobrir o zoom.
- Computador: blueprint em 110%, sem mudança.

## Como testar em produção (depois do deploy)

1. **Notícias no celular:** o "THE LOUNGE" aparece inteiro, sem a mancha branca ao lado do logo.
2. O destaque da Hedera mostra o foguete roxo, não "Hedera I". Os títulos aparecem inteiros.
3. Abra a notícia da Hedera: o topo tem um fundo colorido, sem imagem quebrada.
4. **Sala de Estudos, blueprint novo:** peça um blueprint na conversa e vá pra Sala.
   - Enquanto monta: "Montando o seu blueprint…", o traço e as etapas.
   - Quando chega: o título de verdade.
5. No celular, o blueprint abre com as bordas dentro da tela.
6. O botão **"Legenda"** abre e fecha a legenda. O zoom tem fundo e não se mistura com o texto dos cartões.
7. No celular, embaixo da figura, aparece "toque numa peça pra destacar".
8. Troque a skin (cartolina e barbie): o zoom e a legenda seguem com fundo.

## Resultado dos testes

| Teste | Resultado |
|---|---|
| 1. Notícias sem borrão | ⏳ falta testar |
| 2. Destaque e títulos | ⏳ falta testar |
| 3. Página da Hedera | ⏳ falta testar |
| 4. Blueprint montando | ⏳ falta testar |
| 5. Blueprint encaixado no celular | ⏳ falta testar |
| 6. Legenda e zoom | ⏳ falta testar |
| 7. Texto de toque | ⏳ falta testar |
| 8. Skins | ⏳ falta testar |
