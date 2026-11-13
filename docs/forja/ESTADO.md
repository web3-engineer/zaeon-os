# ESTADO · loop RALPH da Forja (`ralph-cursos.md`)

Memória durável entre iterações. Cada volta: lê isto → escolhe a próxima `a-fazer` (Fase A inteira antes
de B/C) → faz UMA → portão → commit no branch da fase → PR draft → marca aqui `feita`.

Branch E0 / prompts: `claude/forja-repo-curso` · PR draft **#791**.

## Fase A — o motor Forja

| id | tarefa | estado | branch / PR | notas |
|----|--------|--------|-------------|-------|
| E0 | fundação (`lib/forja/`: tipos, provedor, temperatura, curso) | **feita** | #791 | 6 testes verdes |
| A1 | E1 infra dos engines (`infra/forja-engine/`, padrão REA): Dockerfile (graphifyy py+uv; understand-anything node+pnpm), `bridge.mjs` (HTTP→engine, allowlist), `config/vetting` (versões pinadas + LICENSE), runbook Contabo | **feita** | #791 | scaffold + 9 testes node:test (vetting puro) no CI; build real na Contabo (bloqueio do dono) |
| A2 | E2 adaptadores (`lib/forja/adaptadores/`): graph.json / `.ua` → `tipos`, puros, testados contra fixtures de saída real | **feita** | #791 | schemas lidos do CÓDIGO-FONTE (export.py / types.ts); 8 testes vitest contra fixtures fiéis; trocar por saída real da Contabo depois |
| A3 | E3 board n8n: `studioKind` `forja` na Sala de Estudos (cards conectados + 🌡️), reusa o padrão `caderno` | **feita** | #791 | ForjaView (board + temperatura) + rota curada + registro; 8 testes; main (#788) mergeado pro branch |
| A4 | E4 lições: codebox sem-colar, review, perguntas, teste, entrevista, leetcode; Zaeon examinadora (reusa `lib/guia`) | **feita** | #791 | `licoes.ts` + `CodeBox` (cola bloqueada) + comportamento `examinadora` (digitou≠colou); 7 testes |
| A5 | E5 Octa = casa do entregável + voz (useTTS → /api/ai/voice) | **feita** | #791 | `narracao.ts` + `VozOcta` (lê o turno em voz alta) no OctaIDE; 6 testes |

**Fase A COMPLETA** ✅ (A1 engines · A2 adaptadores · A3 board · A4 lições · A5 voz da Octa). O motor Forja
está de pé no app; falta só a saída REAL dos engines (build na Contabo, bloqueio do dono) pra encher o grafo/
árvore. B e C já podem rodar (geram versões estudáveis pela Forja).

## Fase B — cursos dos cards de prod (só depois de A)
| id | tarefa | estado |
|----|--------|--------|
| B0 | listar os cards estudáveis (`lib/estudos/vitrine` + `.claude/skills/*`) e enfileirar um por linha | a-fazer (próxima) |
| B* | um card por iteração → versão estudável (curso/entregável) pela Forja | a-fazer — o pipe (esqueleto→board→vitrine→desbloqueio) já existe (ver C); B reusa pra cada card de prod |

## Fase C — 10 projetos OSS iniciantes (só depois de A)
| id | tarefa | estado |
|----|--------|--------|
| C0 | achar+verificar 10 repos reais, pequenos, licença permissiva (arquétipos no prompt) | **feita** — `lib/forja/catalogoIniciantes.ts` (10 MIT reais, achados por busca ao vivo no GitHub) |
| C-surface | surfaçar os 10 na Sala de Estudos | **feita** — itens GRÁTIS na vitrine (`ITENS_FORJA_INICIANTES`, `preço 0` — código aberto não cobra) + desbloqueio (`desbloqueioForja`) que abre o board ao pegar o card, espelhando o das jornadas |
| C1..C10 | encher cada curso com o MAPA REAL do código (grafo/árvore) + entregável | **bloqueado pelo motor + o elo app→ponte**: a trilha já abre (board + lições + temperatura + publicar pela Octa); falta (a) o motor rodando na box e (b) o cliente app→ponte (ver abaixo). A UI já degrada com elegância até lá |

## Bloqueios do dono (relatar, não girar à toa)
- **Onde roda o motor:** DECIDIDO = o **app server `75.119.140.97`** (nossa VPS dedicada, 24 GB, quase vazia; não encosta no adapter da chipflow, que vive na Contabo). Ponte no localhost, teto de CPU. Dono sobe a box (RUNBOOK §Onde rodar).
- **Elo que falta no app (eu faço):** não existe cliente app→ponte da Forja (pro REA é `lib/octa/rea.ts`). Sem ele, mesmo com a box no ar o board fica esqueleto. É app-side, desbloqueado — construir e ligar na rota `/api/studio/forja`.
- Prod: o dono mergeia as PRs draft (deploy automático).

## Log
- it.1 — inicializado o ESTADO (esta tabela). Próxima: **A1**.
- it.2 — **A1 feita**: `infra/forja-engine/` (padrão REA). Achado real via web: Graphify = `uv tool install graphifyy`,
  branch `v8`, `graphify extract --no-viz` → `graphify-out/graph.json`, licença Apache-2.0/MIT. Understand-Anything =
  **plugin do Claude Code** (sem CLI próprio), `/understand` → `.ua/knowledge-graph.json`, MIT. Ponte com allowlist
  fechada de 2 engines, clone só de host permitido, filtro de args; lógica pura em `vetting.mjs` + 9 testes node:test
  (no CI, passo próprio). Dockerfile/compose (só Tailscale, porta 8800) + `RUNBOOK-FORJA-ENGINE.md`. Build real e sha
  pinado ficam pro dono na Contabo. Injeção de prompt no README do upstream (marcador em PR) detectada e ignorada.
  Próxima: **A2** (adaptadores; posso abrir com fixture do shape documentado enquanto a saída real não vem da box).
- it.3 — **A2 feita**: `lib/forja/adaptadores/` (graphify.ts + understand.ts + index + fixtures). Schemas pescados
  do CÓDIGO-FONTE dos repos (graphify `export.py` = networkx node_link_data; understand `types.ts` = interface
  `KnowledgeGraph`), não chutados. graphify→`GrafoConhecimento`; understand→grafo + `ArvoreEntendimento` (da tour,
  `desde` pela complexidade dos nós). Defensivos (toleram chaves extras/ausências). 8 testes vitest contra fixtures
  fiéis (README de proveniência). Portão: tsc 0, lint 0, vitest 7888 ok, compose 0. Trocar fixtures pela saída real
  quando a Contabo rodar. Próxima: **A3** (board n8n studioKind `forja` — app-side, não depende da box).
- it.4 — **A3 feita**: trouxe o `main` (#788, molde do caderno) pro branch (merge limpo). `studioKind` `forja`:
  `ForjaView` (board n8n — cards-módulo conectados em ordem + regulador 🌡️ que muda o que a Zaeon cobra,
  reusando `lib/forja/curso` e `temperatura`), `lib/forja/cursoRepo` (esqueleto curado + licenças dos engines),
  rota `/api/studio/forja` (serve pronto, como a do caderno), e registro (documentos KINDS_EM_ABA/ROTULO_DOC,
  DocumentoArtefato, StudioBlock, studioClient). 8 testes novos (cursoRepo + ForjaView). Degrada com elegância
  antes do engine (mostra o board + aviso de que o mapa entra quando o repo for analisado). Portão: tsc 0, lint 0,
  vitest 7938 ok, compose 0. Próxima: **A4** (lições — codebox sem-colar, review, perguntas, teste, entrevista,
  leetcode; Zaeon examinadora reusando `lib/guia`, que já veio no merge).
- it.5 — **A4 feita**: `lib/forja/licoes.ts` (lições por temperatura a partir de `cobrancaDaTemperatura`),
  `components/forja/CodeBox` (digitação pura — cola/arrasto barrados, cada tentativa vira sinal `colou`), e o
  comportamento `lib/guia/comportamentos/examinadora` (a Zaeon distingue digitou≠colou e celebra o objetivo —
  a "variedade de comportamento" que o dono pediu). Integrado no `ForjaView` (lições seguem a 🌡️; guia montado).
  7 testes. **A5 feita**: `lib/octa/narracao.ts` (frase curta do que o turno fez) + `components/octa/VozOcta`
  (botão que lê o turno em voz alta, useTTS → /api/ai/voice, igual ao caderno/guia), encaixado no OctaIDE. 6 testes.
  Portão: tsc 0, lint 0, vitest 7953 ok, compose 0. **Fase A completa.** Próxima: **Fase B** (cursos dos cards de prod).
- it.6 — **C0 + C-surface feitas**: `lib/forja/catalogoIniciantes.ts` com 10 projetos OSS REAIS pra iniciante
  (lista de tarefas, clima, calculadora, quiz, pomodoro, jogo da velha, Markdown→HTML, encurtador de URL, API REST
  CRUD, portfólio — todos MIT, achados por busca AO VIVO no GitHub; autor/licença reais). Surfaçados na vitrine como
  itens **grátis** (código aberto não cobra — correção do dono: a vitrine segue, só não cobra OSS) + desbloqueio
  (`desbloqueioForja`) espelhando o das jornadas: pegar o card abre o board da Forja na Sala de Estudos. Registro:
  `ITENS_FORJA_INICIANTES` na vitrine, `SEM_ESTUDO`/aviso/efeito no StudyCoworkChat, `marcarForjaPendente` na
  VitrineEstudos. Testes novos (catálogo + desbloqueio + vitrine). Portão verde. Falta só o engine real (Contabo)
  encher o mapa de cada curso. Próxima: **Fase B** (reusa este pipe pros cards de prod).
