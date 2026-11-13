# RALPH · Forja — repositórios → cursos estudáveis em prod

Prompt de LOOP (RALPH: *Repeat A Loop until done*). Rode com `/loop docs/forja/ralph-cursos.md`.
A cada iteração você faz **UMA** tarefa, passa o portão, abre/atualiza uma PR draft e atualiza o estado.
Quando o backlog acabar, pare.

## Papel
Você é um agente autônomo da Zaeon construindo o **motor Forja** (repo → curso interativo) e, com ele,
gerando as versões estudáveis dos cards de prod e de 10 projetos OSS para iniciantes. Trabalhe pequeno,
modular e testado.

## Invariantes — NUNCA quebre
1. **Portão antes de cada commit:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p .` (0),
   `npx next lint` (0), `npx vitest run lib/ app/ components/` (verde), `node scripts/compose-check.mjs` (0).
2. **Prod é do dono.** Nunca mergeie na `main`, nunca faça deploy de prod sozinho. Você entrega abrindo
   **PR draft** com o portão verde e avisando. O dono mergeia (→ deploy automático).
3. **Nunca** pule, desabilite ou quarentene teste pra ficar verde. Falha vermelha = conserto de raiz.
4. **Licença, sempre.** Toda base externa: confira a LICENÇA no GitHub antes de usar. MIT/Apache/BSD/ISC =
   ok (vendorize com `LICENSE` preservada + atribuição + integridade/sha verificada). GPL/AGPL = rode como
   **serviço separado self-hosted** (padrão `infra/rea-engine`) ou não use. **Nunca reproduza código
   copyrighted** — a Forja consome a SAÍDA do engine (grafo/árvore), não o código-fonte dele.
5. **Uma tarefa por iteração.** Branch por fase. Commit com o trailer da sessão.
6. Sem segredo em commit/estado. Dados de aluno são privados.

## Estado durável
Leia e escreva **`docs/forja/ESTADO.md`** (crie se não existir): a tabela de tarefas
(`a-fazer | fazendo | feita`), o branch/PR de cada fase, e notas. É a sua MEMÓRIA entre iterações —
sem ela o loop se repete. Na 1ª iteração, gere o ESTADO a partir do backlog abaixo.

## Backlog

### Fase A — o motor Forja (pré-requisito; E0 já está em `lib/forja/`)
- **A1 · E1 infra dos engines** — `infra/forja-engine/` no padrão `infra/rea-engine`: Dockerfile (Python+uv
  para o Graphify `graphifyy`; Node+pnpm para o Understand-Anything), `bridge.mjs` (HTTP → roda o engine
  num repo-alvo, deny-list de segurança), `config/vetting` com versões pinadas + LICENSE, e o runbook da
  Contabo. (Build/roda na box → saída real.)
- **A2 · E2 adaptadores** — `lib/forja/adaptadores/`: `graph.json` do Graphify e `.ua/knowledge-graph.json`
  do Understand-Anything → `lib/forja/tipos` (GrafoConhecimento/ArvoreEntendimento), puros e testados
  contra fixtures de saída real.
- **A3 · E3 board n8n** — novo `studioKind` `forja` na Sala de Estudos: cards-módulo conectados em ordem
  (`lib/forja/curso`) + o regulador 🌡️ (`lib/forja/temperatura`), reusando o padrão `caderno`
  (`components/studio/CadernoView` + `DocumentoArtefato` + `lib/chat/documentos`).
- **A4 · E4 lições** — `codebox` (só digitação, cola bloqueada), `review`, `perguntas`, `teste`,
  `entrevista`, `leetcode`, com a Zaeon como instrutora/examinadora (reusa `lib/guia`).
- **A5 · E5 Octa = casa do entregável + voz** — card `entregar` usa a Octa (IDE+GitHub+publish já existem);
  encaixe voz na Octa reusando `useTTS` → `/api/ai/voice` (o pipeline das Jornadas).

### Fase B — cursos dos cards de prod (só depois de A completa)
- **B · um card por iteração.** Para cada item de `lib/estudos/vitrine` e cada `.claude/skills/*` que seja
  curso/skill estudável: rode a Forja e gere a versão estudável (modo **curso** para conteúdo de aprender;
  modo **entregável** para app/MCP/eng. reversa). Teste. PR draft. Marque no ESTADO.

### Fase C — 10 projetos OSS para iniciantes (só depois de A completa)
- **C · um projeto por iteração.** Escolha 10 repos **reais**, pequenos, licença permissiva, **um conceito
  cada**, que um iniciante consiga entender e **publicar o primeiro projeto no GitHub**. Arquétipos
  (encontre e VERIFIQUE repos reais no GitHub por busca — não invente URL; confirme existência + licença +
  tamanho pequeno antes de usar): (1) lista de tarefas, (2) app de clima, (3) calculadora, (4) quiz,
  (5) pomodoro, (6) um jogo simples (ex. adivinhação/da-velha), (7) conversor Markdown→HTML, (8) encurtador
  de URL, (9) API REST mínima (CRUD), (10) página de portfólio. Para cada: Forja → curso **+** entregável
  publicável no GitHub do aluno via Octa. Teste. PR draft.

## Protocolo por iteração
1. Leia `docs/forja/ESTADO.md`.
2. Escolha a **próxima** tarefa `a-fazer` — **Fase A inteira antes de B/C** (B e C dependem do motor).
3. Implemente **só ela**, pequena e modular, com testes.
4. **Portão** (os quatro comandos). Vermelho → conserte antes de seguir.
5. Commit no branch da fase (`claude/forja-*`); abra/atualize a **PR draft**.
6. Marque a tarefa `feita` no ESTADO.md (com o link da PR).
7. Se **tudo** `feita`: pare e escreva o resumo final pro dono (o que ficou pronto, as PRs, o que ele
   precisa aprovar/mergear/deployar e o que precisa da Contabo).

## Parada
Pare quando o backlog esvaziar, quando o dono disser pare, ou quando bater num bloqueio que só o dono
resolve (segredo, Contabo, decisão de produto) — nesse caso, relate o bloqueio e pare, não gire à toa.
