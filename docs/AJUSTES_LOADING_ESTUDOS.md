# Handoff — Loading da geração de estudo (Meus Estudos): círculo grande + barra que contorna a moldura

> Para o **Claude Code**. Ajuste **visual sutil**, escopo pequeno. Branch `feat/loading-estudos`.
> Arquivo único: `components/study/MeusEstudosFeed.tsx` (+ um keyframe em CSS global se preciso).

## Regras DURAS
- Branch + PR. Nunca `git add -A`. Push trava (proxy ISP) → deixe commit pronto e avise o Martinez.
- `npx tsc --noEmit` no fim; só erros novos. Respeitar **light/dark** e **prefers-reduced-motion**.

## Estado atual (referência — `components/study/MeusEstudosFeed.tsx`)
Quando a Zaeon monta o estudo (`zaeonBusy === true`):
- **Frases rotativas** (status com bolinhas): ~linhas 1009–1018 (`ZAEON_PHRASES[phraseIdx]`).
- **Barrinha fina** no topo: ~1020–1025 (`<div className="... h-1 ...">` com `.zaeon-loadbar`).
- **A folha/painel** (o retângulo que sustenta o conteúdo): ~1028–1032 — `div` com
  `flex-1 ... rounded-[1.5rem] border ...` (drop target). Dentro dele, estados: `error` /
  `loading` (spinner pequeno, 1040) / vazio com texto explicativo "Folha em branco…" (1041–1046) /
  feed.

## O que mudar

### 1. Círculo de loading GRANDE no lugar dos textos explicativos
Durante a geração (`zaeonBusy`) — e no `loading` inicial do espaço — o **interior do painel** mostra
um **anel/círculo de loading grande e centralizado**, em vez das frases/explicação:
- Dentro da folha (o `div` ~1028), quando `zaeonBusy || loading`, renderizar um bloco centralizado
  (`h-full min-h-[280px] flex flex-col items-center justify-center`) com um **círculo grande**
  (~64–80px): um anel girando no gradiente da marca (violeta→ciano `#7c3aed→#22d3ee`). Pode ser um
  SVG `<circle>` com `stroke` em gradiente + `stroke-dasharray` girando, ou um conic-gradient
  mascarado (anel). Abaixo, **no máximo uma linha** curta de status (ex.: a frase atual
  `ZAEON_PHRASES[phraseIdx]`) — discreta. **Remover/ocultar** o texto explicativo "Folha em
  branco…" e as frases soltas **enquanto** está gerando (elas dão lugar ao círculo).
  - Quando NÃO está gerando e o feed está vazio → mantém o estado atual ("Folha em branco…").
  - O círculo substitui o spinner pequeno do `loading` (1040) também (unificar num só componente
    `StudyLoading` interno).

### 2. Barra de loading que CONTORNA a moldura do painel (border beam)
Em vez de só a barrinha reta no topo, uma luz que **percorre a borda** do painel: começa no canto,
vai **da esquerda pra direita** no topo e **desce contornando** o retângulo (passa as "bordas
invisíveis"), em loop — efeito "border beam".
- **Como:** sobrepor um **SVG** do tamanho do painel, posicionado `absolute inset-0 pointer-events-none`
  dentro de um wrapper `relative` que envolve a folha (~1028). Desenhar um `<rect>` com os mesmos
  cantos (`rx`/`ry` = 24px, casando com `rounded-[1.5rem]`), `fill="none"`, `stroke="url(#beam)"`,
  `pathLength="100"`, e animar um **segmento** correndo no perímetro via `stroke-dasharray` +
  `stroke-dashoffset` (ex.: `stroke-dasharray: 18 82; animation: beam 2.2s linear infinite` com
  `@keyframes beam { to { stroke-dashoffset: -100 } }`). Gradiente `#2563eb→#22d3ee→#7c3aed`.
  - Só renderiza quando `zaeonBusy` (e some ao terminar). Suave, fino (`stroke-width` ~2), glow leve
    (`filter: drop-shadow`).
  - O `<rect>` deve usar `width/height = 100%` com `vector-effect="non-scaling-stroke"` pra a borda
    ficar nítida em qualquer tamanho; deixar um pequeno inset (`x=1 y=1 width=calc(100%-2)`) pra a
    linha não cortar.
- **Manter** a barrinha reta do topo? Pode **substituí-la** pela border beam (mais bonito) — tirar o
  bloco 1020–1025 e usar só o contorno. (Confirmar com o Martinez se quer os dois; padrão: só o beam.)
- `prefers-reduced-motion`: se ativo, mostrar o anel/beam **estático** (sem girar) ou um fade simples.

## Verificação
1. `npx tsc --noEmit` zero erros novos.
2. Smoke: gerar um estudo em Meus Estudos → durante a geração aparece o **círculo grande** no painel
   (sem os textos explicativos) e a **luz percorrendo a moldura** (topo → lados, contornando); ao
   terminar, some e o feed aparece. Conferir light/dark e reduced-motion. Vazio (sem gerar) ainda
   mostra "Folha em branco…".
3. Git: branch `feat/loading-estudos` + PR. Nunca `git add -A`.

## Arquivos
- `components/study/MeusEstudosFeed.tsx` (estado de loading do painel: círculo + border-beam;
  ocultar textos durante geração). Keyframe `@keyframes beam` no `<style jsx global>` que já existe
  no arquivo (ou no CSS global).
