# Handoff — Voz + Sala de Pesquisa/Estudos (Zaeon OS)

> Documento para o **próximo agente** assumir o trabalho. Resume o que foi entregue nesta
> sessão, o que está aberto, o que falta, e os _gotchas_ do fluxo. Datado de 2026-06-22.

---

## 0. Contexto do projeto (essencial)

- **Repo:** `/Users/donmartinez/Documents/Projects.nosync/zaeon-os` · branch base `main`.
- **Stack:** Next 14 (App Router) + `server.js` custom. IA = **Gemini via Vertex AI**
  (`lib/ai/model.ts`, default `gemini-2.5-flash`). Roda em **VPS Hostinger** (Docker Compose,
  `docker-compose.beta.yml`, `beta.zaeon.space`).
- **Deploy = automático no merge:** push pra `main` dispara `.github/workflows/deploy.yml`
  (SSH no VPS → `git reset --hard origin/main` + `docker compose up -d --build`). O dono
  merga os PRs pelo GitHub; **não há passo manual de deploy** além do merge.
- **Verificação por fatia (obrigatória):** `npx tsc --noEmit -p tsconfig.json` (filtrar nos
  arquivos tocados) **+** `npx vitest run`. `next.config` tem `ignoreBuildErrors` → o build
  NÃO pega erro de tipo; confie em `tsc` + `vitest`.
- **Erro de tsc TOLERADO (pré-existente):** `app/research-lab/page.tsx` tem **1** erro
  (`onWorkType` — `WorkType` vs `string`). Espere o count = **1**, não 0.
- **Segredos:** só em `.env`/`.env.local` (gitignored) e no VPS. As `GOOGLE_*` (credenciais
  Vertex) **estão setadas localmente** no Mac do dono — dá pra rodar scripts que chamam o
  Vertex localmente.

---

## 1. ⚠️ GOTCHA #1 — "Stranding" (o problema que mais atrapalhou)

O dono **merga PRs muito rápido**. Várias vezes um commit foi empurrado **depois** do merge
e ficou **preso fora do `main`** (o PR mergeou num estado anterior). Aconteceu 3-4 vezes.

**Regras pra não cair nisso:**
- Sempre **`git fetch origin`** e confira o que `origin/main` realmente tem antes de assumir
  o que está deployado (`git show origin/main:<arquivo> | grep <coisa>`).
- Avise o dono **explicitamente** quando a branch está completa e pronta pra mergear.
- Se um PR ficar `CONFLICTING` por causa de stack (PR criado em cima de outro antes do merge),
  **reconstrua a branch do zero a partir do `origin/main`** com cherry-pick só dos commits
  próprios (foi o que fiz com #72/#73): `git reset --hard origin/main && git cherry-pick <sha>`.

---

## 2. Arquitetura de VOZ (o coração desta sessão)

A voz foi uma saga. Estado final:

- **Rota:** `app/api/ai/voice/route.ts` → `synthGeminiTTS` (`lib/voice/gemini-tts.ts`, REST no
  Vertex) com **fallback Piper** (container `voice-engine`). Modelo via env `GEMINI_TTS_MODEL`
  (default **`gemini-2.5-flash-tts`** — **confirmado funcionando** no projeto, mas **LENTO**:
  ~3-5s de cold-start, às vezes mais). Timeout do Gemini-TTS reduzido pra **12s** → cai no
  Piper rápido em vez de estourar 30s (`503 "aborted"`).
- **Controlador global:** `lib/voice/ttsController.ts` (singleton; um áudio só no app).
  - `speak(text)` **delega pra `speakSequence([text])`** → **TUDO chunka** (~420 chars/POST).
    Isso foi o fix crítico: antes `speak()` mandava o texto inteiro → texto longo estourava o
    timeout do Gemini-TTS → 503. (Por isso só funcionava com texto curto.)
  - `speakSequence(parts, { voice?, gender?, filler? })`. **`filler` é opt-in** → curinga só em
    **leitura de documento inteiro** (não em título/chat curto, nem na sala de estudos).
  - `buildSpeechChunks` é **exportado** (o karaokê usa pra montar os mesmos pedaços).
  - Estado consumido via `useTTS()` → `{ speaking, loading, activeText }`. `activeText` = o
    **pedaço atual** sendo falado (o karaokê casa por igualdade).
- **Curingas de cold-start (fillers):** `lib/voice/fillers.ts` + `public/agents/voice-fillers/`.
  - Frases-isca pré-gravadas que tocam **na hora** (áudio fixo) enquanto o 1º pedaço real
    sintetiza. **Por voz** (`manifest.json` indexado por `voice id`) → a curinga sai sempre na
    voz que o usuário escolheu. Tocam **INTEIRAS, sem sobrepor** a voz real; encadeiam se a
    latência for longa; sem clipes → não rodam.
  - **Gerar/regenerar:** `node --env-file=.env scripts/generate-voice-fillers.mjs` (idempotente,
    com throttle + retry no 429 de quota). Já gerado: **8 frases × 5 vozes** (kore, aoede, leda,
    callirrhoe, charon). Se adicionar voz ao catálogo (`lib/voice/gemini-tts.ts → GEMINI_VOICES`),
    re-rode o script.
- **Ondas sonoras:** `components/voice/VoiceWaveIndicator.tsx` mostra as ondas só em
  `speaking && !loading` (= áudio realmente saindo; durante a síntese fica no ⟁ discreto).
- **Botões de voz drop-in:** `components/voice/SpeakButton.tsx` (`<SpeakButton text=… />`).

---

## 3. O que foi ENTREGUE (mergeado no `main`)

Em ordem cronológica (vários PRs):
- Voz → **Gemini-TTS** (PCM→WAV) com fallback Piper; cruzar/conversar com documentos por
  texto; auditoria de modelos (100% Gemini/crédito); fixes de regressão (relate 400, full-PDF
  compare); **PDF context caching** (`lib/ai/contextCache.ts`, `/api/ai/pdf/cache`).
- **#56** chat de PDF **por janela** (resumo não vaza mais entre abas).
- **#58/#68** religar o **viewer de PDF** (arrastar pra folha) + **voz por chunks**.
- **#66/#69** persona Aura (ir direto ao resumo) + isolamento de **título** por tipo de
  trabalho + play não sobrescreve o título + experiência de resumo (loading com etapas,
  **erro + "Tentar de novo"**, sem "Nenhum resumo gerado").
- **#71** voz funcionando em **todo o app** (`speak` chunka) + ondas só no áudio + **curingas
  por voz** + gerador de curingas.

## 4. ABERTO e MERGEÁVEL (pode mergear — independentes entre si)

- **#72** (`feat/study-typography-voice`): **voz** (SpeakButton) em **Insights** e **Base**
  (módulos do omega) + **tipografia** — frases geradas (`e.claim`, `p.why`, listas de
  Tendências/Contradições) subiram de `text-xs` → `text-base/lg leading-relaxed` (Space Grotesk).
  **Não** mexe em título/autores/DOI/citação verbatim.
- **#73** (`feat/research-karaoke`): **curinga opt-in** (corrige curinga em texto curto/"duas
  vezes"/sala de estudos) + **botão ▶/⏹ de play da pesquisa** (no lugar do caderninho da aba,
  lê `docContent`) + **karaokê** (camada de leitura sobre o editor destacando o trecho falado;
  `app/research-lab/ResearchReadingView.tsx`).

> Ambos a partir do `main` atual, limpos, `tsc` ok (1 pré-existente), **354 testes verdes**.

## 5. O que FALTA (pendências combinadas com o dono)

1. ~~**Persona "Zion" (bug):** a Aura chamava o usuário de "Zion"/"Zaeon".~~ ✅ **RESOLVIDO.**
   Roster canônico agora vive em `lib/ai/personas.ts` (Bento/Aura/Nina/Caio/Téo) com um
   `PERSONA_PREAMBLE` compartilhado: _"Zaeon é a PLATAFORMA (o coletivo); cada agente tem nome
   próprio; nunca chame o USUÁRIO de Zaeon/nome de agente — use `userData.name` ou nome nenhum."_
   O nome **"Zion" foi removido** do código (orquestrador → **Bento**).
2. ~~**Foto da Aura:** `public/agents/aura.png` FALTANDO.~~ ✅ **RESOLVIDO** (PNG quadrado on-brand adicionado).
3. **Persistir a aba da página de pesquisa:** refresh sempre cai na aba "pesquisa"; o dono quer
   cair na **última aba usada**. Estado `activeTab` em `app/research-lab/page.tsx` (~linha 646);
   persistir em `localStorage` e restaurar no mount — **cuidado** com o deep-link `?tab=` que já
   existe (~linha 1213) e com o `?session=`/`?worktype=`.
4. **Tipografia (cosmético):** confirmar no visual após deploy e calibrar se preciso. Usei
   `text-base md:text-lg` nas frases dentro de cartões (pra não inverter a hierarquia); os
   resumos principais seguem `text-lg md:text-xl`. O dono pode querer tudo exatamente no tamanho
   do resumo.
5. **Latência da voz:** `gemini-2.5-flash-tts` responde mas é **lento** (3-5s). As curingas
   mascaram. Otimização possível: pré-aquecer (sintetizar o 1º pedaço no fundo assim que o texto
   existe) ou achar um modelo TTS mais rápido. O **gerador de curingas é um bom diagnóstico**:
   se ele gera, o TTS está respondendo.

## 6. Mapa rápido de arquivos (voz + sala de pesquisa)

- `lib/voice/ttsController.ts` — controlador global (speak/speakSequence/stop/buildSpeechChunks).
- `lib/voice/fillers.ts` — curingas por voz (pickFiller).
- `lib/voice/useTTS.ts` — hook (speaking/loading/activeText).
- `lib/voice/gemini-tts.ts` — síntese Vertex + catálogo `GEMINI_VOICES`.
- `app/api/ai/voice/route.ts` — rota (Gemini-TTS → Piper, timeout 12s, devolve `detail` no 503).
- `scripts/generate-voice-fillers.mjs` — gera os clipes (rodar local com `--env-file=.env`).
- `app/research-lab/page.tsx` (~2900 linhas — usar âncoras precisas): editor da pesquisa,
  `readResearch`/`readingResearch`, `playVoice`, chat de PDF por janela, viewer wiring.
- `app/research-lab/WindowSwitcher.tsx` — abas; o ▶/⏹ da pesquisa vive aqui.
- `app/research-lab/ResearchReadingView.tsx` — karaokê.
- `app/workstation/student/omega/modules/{Insights,Prereqs,References}Module.tsx` — sala de
  estudos (omega): Insights, Base, Referências (voz + tipografia do #72).
- `components/study/MeusEstudosFeed.tsx` — feed "Meus Estudos" (grande).
