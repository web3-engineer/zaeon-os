# Handoff (continuação) — Sala de Aula + Perfil Professor · da Fase 2 em diante

> Pra um agente NOVO (contexto zero). A Fase 1 já foi entregue (PR #87). Leia também
> `docs/AULAS_TEACHER_AGENT.md` (plano original, 6 fases + models Prisma + regras de escopo) —
> este doc dá o contexto do projeto, o estado atual e o que fazer a seguir.

## 1) Contexto do projeto (Zaeon)
- **Zaeon OS**: plataforma acadêmica. Next.js 14 (App Router) + `server.js` custom + Socket.IO,
  **Prisma + MongoDB (Atlas)**, Pusher (realtime), NextAuth (Google). IA = **Vertex Gemini**
  (`lib/ai/`, `lib/scholar/`). Voz = **Gemini-TTS** (Google/Vertex, voz "Leda"), fallback Piper.
- **Deploy**: VPS Hostinger (2 vCPU/8 GB), Docker Compose `docker-compose.beta.yml` (`beta.zaeon.space`).
  **Deploy automático no merge pro `main`** (`.github/workflows/deploy.yml` → `docker compose up -d --build`,
  roda `prisma generate` no build). Serviços: web, redis, caddy, voice-engine (1g), abnt-service,
  e o novo **pdf-loader** (do PR #84).
- **GOTCHAS de git (importante):** o `git fetch/pull` **trava** na rede do dono (proxy do ISP come o
  protocolo git). **push/ls-remote/curl funcionam.** Por isso: **NUNCA** push direto no `main`;
  sempre **branch + PR** e merge pela UI do GitHub. Não usar `git add -A` (deleções fantasma já
  aconteceram). Não aceitar token em chat / não fazer push credenciado da sandbox.
- **Prisma + Mongo:** ao adicionar campo/model novo, montar o objeto `data` numa **const separada**
  (não literal inline) pra evitar o excess-property check do TS enquanto o client não regenera;
  `prisma generate` roda no build/deploy.
- **Verificação padrão:** `npx tsc --noEmit` (tolerar **1 erro pré-existente** em
  `app/research-lab/page.tsx` — WorkType vs string) + `npx vitest run`.
- **Super admins** (allowlist `lib/auth/roles.ts`): donmartinezcaiudoceu@gmail.com,
  donmartinez@aluno.unilab.edu.br.

## 2) Estado dos branches / PRs (pode haver merges pendentes)
- **`feat/estudos-lounge-ux`**: onboarding refeito (tour começa no menu/chat), plugins (PT + imagem,
  sem Blockchain), voz com **karaokê inline** no resumo, aba **Resultados** na pesquisa, **voice-engine
  3g→1g** (libera RAM). Conflito conhecido com outros branches **só** em `docker-compose.beta.yml`.
- **`feat/pdf-loader`** (PR #84): microserviço `pdf-loader/` (FastAPI+Java, modo Fast) — extração
  estruturada de PDF (markdown + blocks com bbox) alimentando a síntese.
- **`feat/...aulas` (PR #87) — FASE 1 ENTREGUE** (detalhe na seção 3).
- Ao mergear vários no `main`, o único choque recorrente é `docker-compose.beta.yml` (resolver
  mantendo voz `1g` + bloco do pdf-loader). Orçamento alvo ≈ 5.2g/8g.

## 3) O que a FASE 1 entregou (PR #87) — NÃO refazer
- **Models Prisma** (em `prisma/schema.prisma`): `Turma, TurmaMember, TurmaInvite, Aula, AulaQuiz,
  AulaQuestion, AulaQuizSubmission, AulaProgress`. **Decisão:** usaram **ObjectId cru sem `@relation`**
  (relações do plano original eram unilaterais e não validavam) — seguir esse padrão (`referredBy`-like).
- **Rotas:** `/api/turmas` (GET+POST), `/api/aulas` (GET por papel: professor vê as suas, aluno vê as
  **enviadas** das turmas dele; POST cria **rascunho**), `/api/aulas/invite` (token). Gate
  `isTeacherSession` testado.
- **Limpeza do professor:** removidos **Lounge** e **Finanças** do menu do workstation (itens/imports/
  cases/ícones); `FinancesContent.tsx` apagado. **Decisão:** o Lounge do research-lab foi MANTIDO
  (só saiu do menu do professor).
- **Aba "Meus Alunos"** (gated `isTeacher`) ao lado de "Aulas" na Sala → `MeusAlunosPanel`
  (criar/listar turmas + gerar convite). **Decisão:** o redirect do professor foi afrouxado
  (whitelist do módulo `sala`) — ele não é mais expulso e vê Aulas + Meus Alunos.
- Verificado: `tsc` 0 erros novos · `vitest` 388. UI precisa de **smoke manual na beta**.

## 4) O que ENTREGAR a seguir (uma fase por PR; pare e peça revisão a cada uma)
Especificação completa em `docs/AULAS_TEACHER_AGENT.md`. Resumo do que falta:

- **FASE 2 — Criar aula generativa (professor):** criação tão fluida quanto um estudo, reusando o
  padrão de `components/study/MeusEstudosFeed.tsx` (barra ⟁ → `zaeonStudy`/`typeIntoBarAndRun`) + o
  **Studio** (`components/studio/*`, motor estilo NotebookLM) adaptado pra gerar **conteúdo + quiz/
  desafios + sugestão de vídeo**. **Painel de rascunhos à direita** (estilo biblioteca do Meus
  Estudos): acumula vários rascunhos (`Aula.status="draft"`), lapida, **botão ENVIAR destacado** →
  `status="sent"` + `sentAt` + vincula `turmaId`; mostrar "enviado" no painel do professor.
  Liberdade total: gerar / co-gerar / manual (o professor escolhe).
- **FASE 3 — Módulo do aluno (a antiga "Livraria", SEM nome):** onde ficam as aulas do aluno; aula
  nova **em destaque**; abrir → **rola e abre o módulo embaixo** com conteúdo (markdown) + **vídeo
  YouTube indexado** + **quiz por texto OU por voz** (gravar resposta na voz do aluno via
  `lib/voice/ttsController.ts`/STT → salvar `audioUrl`+`transcript`) + avaliação final (assíncrona/
  síncrona) + **nota/assertividade**. Concluir → marca **concluída** (`AulaProgress`: new→in_progress
  →completed).
- **FASE 4 — Agente do chat acessa as aulas:** o agente da `components/sub/ClassesView.tsx` (já tem
  `update_schedule` da agenda) ganha tools de aula. Professor: "gere **e envie** uma aula de X pra
  turma Y" → gera+envia (autonomia de envio); "gere uma aula de X" → só **rascunho** (não envia).
  Aviso de **aula nova** chega no chat; a aula aparece como **card** na sala do aluno (rotulado pela
  turma, não solto). Entrega individual por aluno (a turma é o agrupamento; cada aluno na sua sala).
- **FASE 5 — "Meus Alunos" completo:** por aluno: **nota** (das submissões), **tempo de leitura**
  (somar `AulaProgress.readingMs`, medido quando o aluno abre a aula em **modo foco** — instrumentar
  abrir/fechar) e **nível de interesse** (pontualidade nas tarefas/resumos).
- **FASE 6 — Polir a Sala de Aula:** relógio/agenda radial **funcional** (fatias nos horários e
  **direção corretos**; manter a **linha fina do "trabalho"** como feature); **chat** minimizado numa
  **barra horizontal** que expande ao marcar algo; **cor dos balões** de mensagem → padrão Zaeon
  (hoje usam a cor do tema, fora de padrão).
- **FASE 0 (bônus rápido) — Meus Estudos:** verificar/consertar a geração — deve gerar um **exemplo
  de estudo de verdade** e **gerar mesmo ao sair da aba** (o feed fica montado/escondido; testar
  `zaeonStudy` / evento `zaeon:study:run` / `typeIntoBarAndRun`).

## 5) Regras de escopo (duras) — repetindo
- **NÃO mexer na navbar/sidebar**; não trocar layout entre perfis. Tudo só em **"Aulas" + "Meus
  Alunos"**. Sem lounge novo pro professor. Branch + PR por fase. Apache 2.0 do opendataloader/pdf
  mantido. Manter `voice-engine` em `1g`.
