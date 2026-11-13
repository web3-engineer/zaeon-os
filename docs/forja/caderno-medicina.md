# Caderno de Medicina — Anatomia (variante das Jornadas)

Prompt de LOOP, mesmo formato do `ralph-cursos.md`. Rode com `/loop docs/forja/caderno-medicina.md`.
Objetivo: um **caderno de estudos para estudantes de medicina** — um **curso completo de anatomia** no
mesmo estilo Jornada (board + guia + 🌡️ temperatura + lições), mas com **interface e elementos próprios de
medicina** (o atlas 3D no lugar do teclado, casos clínicos no lugar do leetcode).

## Papel
Agente autônomo construindo o Caderno de Anatomia como um `studioKind` novo da Sala de Estudos, reusando o
que já existe em prod. Pequeno, modular, testado. Mesmos **invariantes** do `ralph-cursos.md` (portão antes
de cada commit; prod é do dono via PR draft; nunca pular teste; licença + atribuição; uma tarefa por
iteração; `docs/forja/ESTADO-MEDICINA.md` como memória).

## Reuso (não reinvente)
- **Atlas 3D** (já em prod, da #777): `components/anatomia/AtlasDoCorpo`, `lib/anatomia/*`
  (`isolamento`, `busca`, `cena-do-conceito`) e a skill `anatomia-3d` (dados **BodyParts3D**, licença
  **CC BY** — atribuição obrigatória e mantida alcançável).
- **O molde do caderno**: `lib/jornadas/cadernoRitmo` + `components/studio/CadernoView` +
  `DocumentoArtefato` + `lib/chat/documentos` (abre em aba) + o gatilho/pendência (`pedeCaderno`,
  `desbloqueio`).
- **O guia examinador**: `lib/guia` (ociosidade + voz pelo balão).
- **A temperatura**: `lib/forja/temperatura` (regulador puro).
- **Memorização**: a skill `anki-flashcards` já existe (baralhos como entregável).

## Módulos do board (em ordem, como sistemas do corpo)
Tegumentar → Esquelético → Muscular → Nervoso → Cardiovascular → Respiratório → Digestório → Urinário →
Endócrino → Reprodutor. **Cada módulo abre a estrutura isolada no atlas 3D** (clicar no card = carregar a
peça no `AtlasDoCorpo`, isolada — a regra de isolamento da #777 já garante "só a parte pedida").

## Temperatura 🌡️ (profundidade médica, não de código)
- **Básico** — macroscopia e função: o que é, onde fica, pra que serve.
- **Médio** — relações, vascularização e inervação: o que faz o sistema funcionar.
- **Avançado** — correlação clínica, variações anatômicas e correlação com imagem (o "scanner" vira o
  modo que cobra identificar tudo). Sobe o quanto explica E o quanto cobra, como no de música.

## Lições (no lugar das de código)
- **Identificação no atlas** (aponte/nomeie a estrutura; sem dica no avançado).
- **Casos clínicos** (no lugar do leetcode: um sintoma → qual estrutura).
- **Perguntas de prova** e **flashcards** (baralho Anki como entregável).
- **Simulação de OSCE / entrevista oral** (a Zaeon examina por voz).
- **"Localize sem legenda"** (o codebox da anatomia: a estrutura sem rótulo, você nomeia).

## Interface / elementos próprios (o "outra interface" que o dono pediu)
- **Atlas 3D central** (não o teclado): a peça isolada, rotável, com legenda e **cores por sistema**.
- Paleta clínica (sóbria, de atlas), não o caderno pautado de música.
- O guia da Zaeon examinando ("aponte o nervo mediano", "qual a origem deste músculo?").

## Entregável (diferente do código)
Medicina não publica no GitHub. O "entregável" do modo entregável é um **dossiê/resumo estudável** (um
`studioKind` de texto que já existe) ou um **baralho Anki** (skill `anki-flashcards`) — o que o aluno leva
pra revisar.

## Regras próprias
- Conteúdo é **educacional**, nunca aconselhamento clínico/diagnóstico; o atlas é referência adulta.
- **Atribuição BodyParts3D (CC BY)** mantida e alcançável (o botão "Sobre este atlas" já existe).
- Mesmo protocolo por iteração e parada do `ralph-cursos.md`; `ESTADO-MEDICINA.md` é a memória.

## Backlog
- **M1** modelo do caderno de anatomia (`lib/medicina/cadernoAnatomia.ts`): sistemas, módulos, estruturas
  (id do atlas), temperatura, lições — puro e testado, espelhando `cadernoRitmo`.
- **M2** `MedicinaView` (atlas 3D embutido + board + guia), espelhando `CadernoView`; `studioKind`
  `anatomia-curso` registrado (StudioBlock + documentos + DocumentoArtefato + studioClient + rota).
- **M3** as lições de anatomia (identificação, caso clínico, OSCE por voz, localizar-sem-legenda).
- **M4** gatilho/desbloqueio do card de medicina (como `desbloqueio.ts`) + abrir na Sala de Estudos.
- **M5** entregável: dossiê estudável e/ou baralho Anki.
