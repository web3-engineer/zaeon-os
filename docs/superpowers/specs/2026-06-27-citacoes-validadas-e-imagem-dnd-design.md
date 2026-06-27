# Citações validadas + arrastar imagem — design

**Data:** 2026-06-27
**Contexto:** Aproveitar o motor ABNT (worker `abnt-service/`, agora 6023:2018 determinístico) para deixar a feature de salvar citações da Sala de Pesquisa realmente *validada*, com sinalização honesta quando a fonte não pode ser creditada, e habilitar arrastar-e-soltar de imagens no documento no formato que a engine entende.

## Princípios

1. **Nunca bloquear** o fluxo de salvar uma citação.
2. **Nunca creditar errado em silêncio** — se a engine não consegue montar uma referência válida, o usuário vê o alerta.
3. **Reaproveitar** o que já existe; não reimplementar.

## Estado atual (verificado no repo)

Já implementado e funcional:
- `/api/ai/cite` (`app/api/ai/cite/route.ts`): motor determinístico. Cruza metadados em CrossRef (DOI/título) + arXiv; monta ABNT/inline em código via `lib/abntFormat.ts`; quando faltam dados, retorna `{ needsMetadata, have, missing }` — **nunca inventa referência quebrada**.
- `MetadataModal.tsx`: modal que pede autores/título/ano/veículo/DOI/link e chama `/api/ai/cite` com `manual` → devolve a citação montada.
- `CitationsPanel.tsx` (montado em `DocumentDesktop.tsx:114`): lista as citações, arrastáveis; já tem o **ramo de UI para `incomplete`** (hoje âmbar) com botão "Completar referência" → `MetadataModal`.
- **Drag-drop de citação → editor: COMPLETO.** `CitationsPanel`/`CitationPopover` setam `text/zaeon-citation`; o `textarea` do editor (`page.tsx:2420-2435`) tem `onDragOver`+`onDrop={handleCitationDrop}` → `applyCitationDrop` (frase no cursor, referência nas Referências). **Fora do escopo desta entrega.**
- `SavedCitation` (`lib/useSavedCitations.ts`) já tem os campos: `incomplete`, `have`, `sourceText`, `page`, `used`, `suggestion`, `suggestedText`.

Gaps reais:
- **Nada nunca grava `incomplete: true`** (só `incomplete: false` em `PdfViewer.tsx:164` e `MetadataModal.tsx:84`). Quando `/api/ai/cite` responde `needsMetadata`, o `PdfViewer` abre um modal **bloqueante**; se o usuário cancela, a citação **se perde**. O caminho "rascunho vermelho no painel" é código morto.
- O sinal de rascunho é **âmbar**; o pedido é **vermelho** + texto claro de "não está sendo creditada".
- **Imagem arrastada não é tratada** — `handleCitationDrop` retorna cedo para qualquer coisa que não seja `text/zaeon-citation`.

## Escopo desta entrega

### 1. Salvar sempre; sinalizar vermelho quando falta fonte (núcleo)

- **`PdfViewer.runCite`**: quando a resposta for `needsMetadata`, **salvar a citação mesmo assim** com `incomplete: true`, guardando `sourceText` (trecho selecionado), `page`, `have` (metadados parciais cruzados) e os campos de origem (title/authors/year/venue/doi/url do arquivo). Substituir o modal bloqueante (`setNeedMeta`) por um **toast sutil**: "Citação salva — falta a fonte para creditar (complete no painel)." O modal inline `needMeta` do PdfViewer é removido/desativado em favor do fluxo do painel.
- **`CitationsPanel`**: o ramo `cit.incomplete` passa de âmbar para **vermelho** (borda/realce vermelho), com rótulo "🔴 Sem fonte válida — não está sendo creditada" e botão **"Creditar fonte"** que abre o `MetadataModal` existente. Ao resolver, `incomplete:false` → some o vermelho. Citações válidas seguem com o status atual (＋ não usada / ✓ em uso) em verde.
- **`CitationPopover`** (lista no popover de seleção do PDF): refletir o mesmo estado visual (vermelho para incompletas; não-arrastável enquanto incompleta), por consistência.
- Regra de validade: **vermelho ⇔ a engine não consegue montar a referência** (`hasEnoughMeta` falso = falta autor, título ou ano). Verde caso contrário.

### 2. Validação alinhada ao motor 6023:2018

- A referência final no `.docx` já é montada pelo **worker** a partir dos campos estruturados (autor/título/ano/periódico/DOI/URL) que o `route.ts` repassa — então o que credita de fato no documento é a engine nova. Uma citação "verde" tem metadados suficientes para isso.
- Reconciliar `lib/abntFormat.ts` (`buildAbnt`/`buildInline`, usados no **texto exibido no painel e arrastado**) com as regras 6023:2018 do worker onde divergirem (≥4 autores → *et al.*; `Disponível em:`/`Acesso em:` com mês abreviado; destaque do título vs periódico — em texto puro sem negrito, mantendo a pontuação/ordem). Objetivo: o que o usuário vê no painel bate com o que sai no export. Cobrir com testes em `lib/abntFormat.test.ts`.

### 3. Arrastar imagem → marcador de figura (novo)

- Estender o `onDrop` do `textarea` (sem quebrar o drop de citação): ordem de tratamento
  1. `text/zaeon-citation` → caminho atual (intacto).
  2. `text/zaeon-file` (item da **biblioteca**) → resolve o arquivo; se for imagem, embute como **data URI**.
  3. `dataTransfer.files` (arquivo do **desktop**) com `type` de imagem → lê via `FileReader` como **data URI**.
- `onDragOver` passa a aceitar também `text/zaeon-file` e `Files` (além de `text/zaeon-citation`).
- Inserção no cursor de um marcador no formato da engine:
  `![<nome-do-arquivo-sem-extensão>|própria](data:image/...;base64,...)`
  — o worker já converte isso em "Figura N — Título" (legenda no topo, 10 pt) + "Fonte: elaborado pelo próprio autor". O usuário ajusta título/fonte direto no texto.
- **Nova função pura** `lib/imageInsert.ts`:
  - `insertImageMarker(doc: string, cursor: number, opts: { title: string; fonte?: string; dataUri: string }): string` — insere `\n\n![title|fonte](dataUri)\n\n` no cursor, com espaçamento limpo (espelha `insertQuoteAtCursor`).
  - `sanitizeFigureTitle(filename: string): string` — tira extensão e normaliza para o título.
  - Sem React; 100% testável.
- Limites: só `image/*`; teto de tamanho (ex.: 8 MB) com toast de aviso se exceder (data URI grande demais). Tipos não-imagem caem no comportamento padrão.

## Componentes e limites

- `lib/imageInsert.ts` — **novo**, puro: monta o marcador de figura. Entrada: doc/cursor/opts. Saída: doc. Sem dependências de React/DOM.
- `lib/citationInsert.ts` — **existe**, intacto; ganha um teste de regressão (`citationInsert.test.ts`) porque o `onDrop` será estendido.
- `lib/abntFormat.ts` — ajustes pontuais p/ casar com 6023:2018; coberto por `abntFormat.test.ts`.
- `app/research-lab/PdfViewer.tsx` — salva incompleta em vez de bloquear.
- `app/research-lab/CitationsPanel.tsx` (+ `CitationPopover.tsx`) — estado vermelho + rótulo + "Creditar fonte".
- `app/research-lab/page.tsx` — `onDrop`/`onDragOver` do editor estendidos p/ imagem (helper de leitura `FileReader`/biblioteca → `insertImageMarker`).

Sem mudança no modelo `SavedCitation` (campos já existem). Sem mudança no worker (o marcador de figura já é suportado).

## Fluxo de dados

1. **Seleção no PDF** → `runCite` → `/api/ai/cite`.
   - `ok` → salva citação **verde** (campos estruturados + `abnt`/`inline`).
   - `needsMetadata` → salva citação **vermelha** (`incomplete:true` + `have`/`sourceText`/`page`), toast sutil.
2. **Clique no vermelho** → `MetadataModal` → `/api/ai/cite` (manual) → salva **verde**.
3. **Arrastar citação verde** → `applyCitationDrop` (já existe).
4. **Arrastar imagem** (biblioteca/desktop) → data URI → `insertImageMarker` → marcador `![...]()` no cursor → worker vira Figura no export.

## Erros e bordas

- Imagem > limite → não insere, toast "Imagem muito grande para embutir (máx. 8 MB)".
- Arquivo não-imagem solto → ignora (comportamento padrão).
- `/api/ai/cite` falha de rede ao selecionar → salva **vermelha** (incompleta) com o trecho, para o usuário completar depois (não perde a seleção).
- Drop de citação continua funcionando após a extensão (teste de regressão garante).

## Testes

- `lib/imageInsert.test.ts` (novo): inserção no cursor, espaçamento, título sanitizado, fonte default "própria".
- `lib/citationInsert.test.ts` (novo): regressão de `applyCitationDrop`/`appendReference`/`removeReference`.
- `lib/abntFormat.test.ts`: casos 6023:2018 (et al., Disponível/Acesso, periódico×título).
- Gate: `npx tsc --noEmit` sem novos erros (manter os 5 pré-existentes); `npx vitest run` verde (≥354).
- Verificação manual: fluxo vermelho→modal→verde; arrastar imagem da biblioteca e do desktop → marcador correto; exportar e conferir a Figura no `.docx`.

## Fora de escopo (YAGNI)

- Restaurar/reimplementar drag-drop de citação (**já existe e funciona**).
- Modal próprio para editar título/fonte da figura (o marcador em texto basta).
- Upload de imagem para storage (escolhido: data URI embutido).
- Citação a partir de seleção em editor de texto puro (o fluxo de seleção é no visualizador de PDF do painel de documentos).
