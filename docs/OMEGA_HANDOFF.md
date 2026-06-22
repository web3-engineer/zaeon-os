# OMEGA SCHOLAR — Handoff para a próxima sessão (Claude)

> **Para o novo Claude:** leia este doc + `OMEGA_SCHOLAR.md` (prompt-mestre do agente) antes de tocar em código.
> **Objetivo da próxima sessão:** evoluir a **página de pesquisa (`research-lab`)** e o **agente Omega Scholar**.
> **Disciplina (obrigatória):** conclusão-primeiro nas respostas; caminhos absolutos ao reportar arquivos;
> **suíte verde antes de qualquer PR** (`tsc` + `lint` + `vitest` + `build`); commit/PR só quando o usuário pedir.
> **Data deste handoff:** 2026-06-06 · **main em:** `3604fce` (PRs #21–#28 já merjados).

---

## 1. O projeto (stack + deploy)

- **Next.js 14 (App Router) + TypeScript + Tailwind + framer-motion.**
- **Auth:** NextAuth (`src/lib/auth.ts`) — GoogleProvider + CredentialsProvider "Guest" (login por email). `MongoDBAdapter`. Sessão = **JWT**.
- **DB:** Prisma + **MongoDB Atlas** (`zaeon_db`, cluster `zaeoncluster…`). Singleton: `@/src/lib/prisma`. **Sem migrations versionadas** → `prisma db push`.
- **IA:** **Vertex AI** (Gemini) no lado Next/TS (`@google-cloud/vertexai`, via `lib/scholar/gemini.ts`). Os engines Python usam `google-generativeai` + `GEMINI_API_KEY`.
- **Deploy:** Vercel (projeto `zaeon-os-`, scope `donmartinezunilabedubs-projects`). **Produção sai da `main` → www.zaeon.space.** Push em branch gera **preview automático**.
- **Engines FastAPI (NÃO rodam no Vercel)** — só local/host externo, via env `*_URL`:
  - `abnt-service/` (8001) — formatação ABNT (docx/pdf).
  - `research-engine/` (8002) — **legado/dead-in-prod** (a sugestão migrou pro TS).
  - `suggestion-forge/` (8003) — **novo** (Suggestion Forge; ver §6).

## 2. Convenções e armadilhas (LEIA — economiza horas)

- **Auth quirk:** `session.user` **NÃO tem `id`**. Sempre faça lookup por email: `prisma.user.findUnique({ where: { email } })`. Padrão em todas as rotas.
- **Gemini / modelos (IMPORTANTE):** `gemini-2.0-flash-001` foi **descontinuado** (404). Config atual em `lib/scholar/gemini.ts`:
  - **HEAVY** (síntese, sugestões, prereqs) = `gemini-2.5-pro` (env `SCHOLAR_GEMINI_MODEL`).
  - **CHAT** (mini-chat) = `gemini-2.5-flash` (env `SCHOLAR_GEMINI_CHAT_MODEL`).
  - `gemini-3.1-pro-preview` **NÃO está habilitado** no projeto (404) e exigiria migrar pro SDK `@google/genai` + `location: "global"` (o `@google-cloud/vertexai` não fala `global`).
  - `geminiJson()` extrai texto de **todas** as partes (ignora `thought`), tira fences, e **lança erro com `finishReason`** (não retorna `{}` silencioso). Use `extractText()` (exportado) p/ outras chamadas.
- **`prisma db push` está QUEBRADO localmente:** falha em `users_myInviteCode_key` (índice unique) porque há **27 users com `myInviteCode: null`** (dup). É um problema **pré-existente do invite-code, NÃO quebra o auth** (índices de auth estão sãos). As features novas **funcionam sem o push** (Mongo é schemaless: campo `suggestions` e coleção `PastResearchChat` materializam na escrita; só o índice composto fica adiado). Pra aplicar de verdade: backfill do `myInviteCode` (ou índice sparse), aí `db push`.
- **`next build` exige env:** `MONGODB_URI`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (há guards que dão throw, ex. `src/lib/db.ts`). Pra buildar local use **placeholders** (`mongodb://127.0.0.1:27017/x`) — a conexão é lazy. `next.config.mjs` tem `eslint.ignoreDuringBuilds` **e** `typescript.ignoreBuildErrors` → **o gate de tipos real é `npx tsc --noEmit`** (o build não pega erro de tipo).
- **Lint em worktree aninhado:** precisa de `"root": true` no `.eslintrc.json` (já está) — senão dá conflito do plugin `@next/next`.
- **`prefers-reduced-motion`:** todos os componentes animados respeitam. Mantenha.
- **`next@14.2.15`** tem advisory de segurança (pendente upgrade).
- **Math.random/Date** no browser são OK; só não use em helpers puros testados (use seed — ver `glitch.ts mulberry32`).

## 3. Arquitetura do Omega Scholar (fluxo)

```
app/research-lab/page.tsx  (7 abas: pesquisa | sala-de-estudos | pesquisas | lounge | pevem | news | profile)
  └─ aba "sala-de-estudos" → <StudyRoomContent/>   (SEMPRE montado, escondido fora da aba — preserva pesquisa em andamento)
       └─ <OmegaScholarProvider room>              (estado: query, phases, answer, session, suggestions, prereqs, draft…)
            ├─ <OmegaScholarBar/>                  (barra minimalista: ⟁ animado + input + tokens/tempo)
            └─ <OmegaScholarWorkspace/>            (abas: Referências · Insights & Síntese · Conhecimentos Prévios)
                 ├─ <ActivityThread/>              (cena de loading: <GlitchTerm/> + <AgentSwarmLoader/>)
                 ├─ <ReferencesModule/>            (Paper[] + evidências verificadas + PDF viewer)
                 ├─ <InsightsModule/>              (summary com <Typewriter/> + tendências/contradições)
                 └─ <PrereqsModule/>               (Conhecimentos Prévios; gera sob demanda via fetchPrereqs)
```

**Backend:**
- **Busca profunda:** `POST /api/ai/scholar` (stream **NDJSON**) → pipeline `lib/scholar/` (retrieve → fulltext → synthesize → assemble → verify) → persiste **`ScholarSession`** (Prisma). Eventos: `session|phase|answer|done|error` (`ScholarEvent` em `lib/scholar/types.ts`).
- **Sugestão de pesquisa:** `POST /api/ai/research-suggest` → `lib/scholar/suggest.ts` (Vertex, **NÃO** é o engine Python). Renderizada em `ResearchSuggestionPanel` (no `ContextualSuggestionDock` da sala-de-estudos + `OmegaSuggestionHighlight`).
- **Conhecimentos Prévios:** `POST /api/ai/scholar/prereqs` → `lib/scholar/prereqs.ts` (Gemini 2.5-pro). Não persiste.
- **Mini-chat por pesquisa:** `GET/POST /api/research/chat/[researchId]` (stream) → `PastResearchChat` (Prisma) + Vertex chat. UI: `PastResearchChatModal` (3 colunas), aberto pelos cards em `app/study-rooms/lounge/main-lounge/researches/page.tsx`.
- **Suggestion Forge:** `POST /api/ai/suggestion-forge` (proxy) → engine Python `suggestion-forge/` (8003). Contrato: `suggestion-forge/engine_spec.md`. Hoje **vira modal** (`SuggestionForgeModule.tsx` existe, mas saiu das abas do workspace). **Só funciona se o engine 8003 estiver de pé** (não está no Vercel → 503).

## 4. Mapa de arquivos-chave

**lib/scholar/** (camada do scholar):
`types.ts` (Paper, ScholarEvent, Suggestion, Prereq…) · `gemini.ts` (Vertex: getGeminiModel/getGeminiChatModel/geminiJson/extractText) · `synthesize.ts` (planQuery+synthesize) · `assemble.ts`+`verify.ts` (verificação determinística de citações) · `retrieve.ts`+`fulltext.ts`+`sources/` (busca multi-base) · `suggest.ts` (research-suggest) · `prereqs.ts` (conhecimentos prévios) · `forge.ts` (Paper→IncomingRef p/ a Forge) · `termometro.ts` (tempo/bolsa/gap) · `academic-term-classifier.ts`+`academic-lexicon.json` (dock contextual) · `glitch.ts`/`loading-phases.ts`/`thinking-phrases.ts`/`typewriter.ts` (animações puras, testadas) · `omega.ts` (loader de seções do OMEGA_SCHOLAR.md p/ o chat) · `prompt.ts`/`prompts-suggest.ts` (prompts) · `bibtex.ts`/`abnt.ts`/`dedup.ts`/`normalize.ts`/`http.ts`/`ssrf.ts`/`pdf.ts`/`levels.ts`/`bolsas-brasil.ts`.

**app/workstation/student/omega/**: `OmegaScholarContext.tsx` (provider/estado — runQuery, fetchSuggestions, fetchPrereqs) · `OmegaScholarBar.tsx` · `OmegaScholarWorkspace.tsx` · `ActivityThread.tsx` · `StudyRoomSuggestionDock.tsx` · `OmegaSuggestionHighlight.tsx` · `OmegaRelatedResearch.tsx` · `PdfViewerModal.tsx` · `modules/{References,Insights,Prereqs,SuggestionForge}Module.tsx`.

**components/research/**: `ResearchSuggestionPanel.tsx` · `ContextualSuggestionDock.tsx` · `PastResearchChatModal.tsx` · `GlitchTerm.tsx` · `GlitchOnce.tsx` · `AgentSwarmLoader.tsx` · `ThinkingStream.tsx` · `Typewriter.tsx` · `AcademicThermometer.tsx` · `AuthGateNotice.tsx`.

**Prisma:** `ScholarSession` (query, references[Paper], evidence, insights, gaps, files, **suggestions**) · `PastResearchChat` (researchId, contextJson, messages[]).

## 5. Verificação (rodar SEMPRE antes de PR)
```bash
npx tsc --noEmit                 # gate de tipos REAL (build ignora erros de tipo)
npm run lint                     # exit 0 (warnings pré-existentes são tolerados)
npx vitest run                   # 229+ testes verdes (lógica pura tem TDD)
MONGODB_URI='mongodb://127.0.0.1:27017/x' DATABASE_URL='mongodb://127.0.0.1:27017/x' \
NEXTAUTH_SECRET='x' NEXTAUTH_URL='http://localhost:3000' npm run build   # exit 0
# Engine Python: cd suggestion-forge && .venv/bin/python -m pytest  (62 testes, cov 97%)
```

## 6. O que foi construído nesta sessão (já em `main`)
- **#24** Suggestion Forge (engine Python 8003, contrato fechado) + integração no workspace + mini-chats por pesquisa (`PastResearchChat`).
- **#25** Cena de loading "produtiva": `GlitchTerm` (termo grande, glitch latim↔chinês) + `AgentSwarmLoader` (barra + "agentes na rede"). **+ fix do modelo Gemini** (2.0-flash-001 → 2.5-pro/flash).
- **#26** "IA pensando" (`ThinkingStream`) na sugestão + `Typewriter` no Insights + **aba "Conhecimentos Prévios"** (engine `prereqs.ts`) no lugar da "Sugestão".
- **#27** Topo "padrão" (⟁ + contador de tokens) + botões de retry.
- **#28** Barra **minimalista** (⟁ no lugar da lupa, sem título/beca, input inativo) + **persistência da pesquisa entre abas** (StudyRoomContent sempre montado) + `geminiJson` com erros diagnósticos.

## 7. ⚠️ Bugs / pendências em aberto (começar por aqui)
1. **[BUG, prioridade] refs/insights/conhecimentos prévios dão erro a cada nova pesquisa.** Investigado: **2.5-pro funciona ao vivo** (probe: `finishReason=STOP`, JSON válido) → **não é o modelo**. O `geminiJson` agora lança erro **com `finishReason`**. **Próximo passo:** disparar uma busca que falhe e LER o erro exato — provável `SAFETY` (filtro), `MAX_TOKENS` (subir maxOutputTokens), JSON malformado (ajustar prompt) ou rede/quota. Sem esse texto, não dá pra cravar.
2. **[CONFIG] Login Google quebrado em prod** (`Error 400: redirect_uri_mismatch`). O `redirect_uri` está saindo como URL **aleatória de deploy** do Vercel porque o **`NEXTAUTH_URL` não está fixado**. **Fix (só painel, sem código):** Vercel → Production env → `NEXTAUTH_URL=https://www.zaeon.space` + redeploy; Google Cloud Console → OAuth Client → Authorized redirect URIs → `https://www.zaeon.space/api/auth/callback/google` (+ apex se usar).
3. **[DB] `prisma db push` falha** (users_myInviteCode_key, 27 nulls). Pré-existente. Backfill/sparse antes de aplicar schema. Features novas funcionam sem isso (Mongo schemaless), só sem o índice composto do `PastResearchChat`.
4. **[INFRA] Suggestion Forge (8003) não está no Vercel** → a aba/modal Sugestão dá 503. Pra usar: hospedar o engine + setar `SUGGESTION_FORGE_URL`.
5. **[SEC] `next@14.2.15`** com advisory — bump pendente.

## 8. Specs/MDs no repo (contexto extra)
- `OMEGA_SCHOLAR.md` — prompt-mestre do agente (identidade, loop, bases, regras de citação). **Carregue inteiro.**
- `suggestion-forge/engine_spec.md` — contrato fechado da Forge (porta 8003).
- `docs/superpowers/specs/` e `plans/` — designs: `2026-06-05-suggestion-forge-adr.md`, `2026-06-06-omega-loading-scene-design.md`, `2026-06-06-omega-thinking-prereqs-design.md`, `2026-05-30-research-suggestion-relocation-and-past-research-chat-design.md`, `2026-05-27-omega-scholar-research-lab-design.md`, `2026-06-04-omega-research-termometro-design.md`.
- `CLAUDE_CODE_PROMPT_*.md` / `KICKOFF_omega_surgery.md` — prompts de planejamento das implementações anteriores (referência histórica).

## 9. Próximo objetivo
Melhorar a **página de pesquisa (`research-lab`)** e o **agente Omega Scholar** (UX + qualidade do agente). Sugestão de ordem: (a) fechar o **BUG #1** (erro de refs/insights — pegar o texto do erro), (b) login Google (#2, config), depois evoluir a página/agente conforme o usuário definir (brainstorming antes de codar).
