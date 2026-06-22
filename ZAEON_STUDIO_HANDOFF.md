# ZAEON Studio + Sala de Estudos — Handoff (2026-06-22)

> Contexto para um agente iniciar uma nova sessão. Cobre o que foi construído, o que está
> na `main` vs aberto, arquitetura, como verificar, e o que falta/pode melhorar.

---

## 1. O que é

**ZAEON Studio** transforma cada estudo (em *Meus Estudos* / Lounge) em várias "formas
mastigadas" — **podcast, vídeo, mapa mental, linha do tempo, guia, FAQ, flashcards,
imagem, narração** — e dá **multimodalidade ao chat** (foto→análise, "gere uma imagem").
Em paralelo, evoluímos o **caderno** de *Meus Estudos* num editor estilo Notion (B1) e o
**Lounge** (co-working espelho da Sala de Estudos).

**Regra de ouro:** toda IA passa por **modelo GenAI do Google** (Vertex AI: Gemini texto/
visão, Gemini-TTS voz, Imagen imagem) — debita do crédito GenAI. Nada de serviço fora dele.

## 2. Stack / infra

- **Next 14 App Router** + **server.js** custom (long-running; Socket.IO presente, realtime real via **Pusher**).
- **DB:** MongoDB Atlas via **Prisma** (primário) + Mongoose (admin legado). Client: `@/src/lib/prisma`.
- **IA:** Vertex AI. Credenciais: `lib/ai/vertex-credentials.ts` (`vertexCredentials()` lê `GOOGLE_CREDENTIALS` ou `GOOGLE_*`). Modelos: `lib/ai/model.ts`. JSON estruturado: `geminiJson()` em `lib/scholar/gemini.ts` (gera + limpa markdown + parse + timeout).
- **Deploy:** Docker Compose no VPS (`docker-compose.beta.yml`, `Dockerfile`), `beta.zaeon.space`, atrás do Caddy. **Deploy é MANUAL pelo dono** (`git reset --hard origin/main` + `docker compose up -d --build`). O agente **não** faz SSH/deploy/merge.

## 3. Protocolo de verificação (IMPORTANTE)

O agente **não consegue** rodar o app, o Vertex nem o ffmpeg localmente. Então:
- **`npx vitest run`** tem que ficar **verde** (≈354 testes). Toda lógica pura tem teste unitário.
- **Type-check** dos arquivos tocados com um tsconfig temporário que estende `./tsconfig.json` (o `next.config.mjs` tem `ignoreBuildErrors: true`, então **o `tsc` é o gate real**). Inclua `next-env.d.ts` no `include` p/ arquivos com `<style jsx>` (styled-jsx).
  ```bash
  cat > tsconfig.check.json <<'EOF'
  { "extends": "./tsconfig.json", "compilerOptions": { "incremental": false },
    "include": ["next-env.d.ts","<arquivo1>","<arquivo2>"] }
  EOF
  npx tsc -p tsconfig.check.json; echo "EXIT=$?"; rm -f tsconfig.check.json tsconfig.tsbuildinfo
  ```
- Lógica pura testável SEMPRE que possível (montadores de prompt, normalizadores de JSON, WAV, ordenação de blocos, filtros). O resto (Vertex/ffmpeg/feel de UI) o **dono valida no deploy**.

## 4. Arquitetura — arquivos-chave

**Núcleo IA/voz**
- `lib/ai/model.ts` (`GEMINI_MODEL_FLASH/PRO`), `lib/ai/vertex-credentials.ts`, `lib/scholar/gemini.ts` (`geminiJson`, `getGeminiModel`, `extractText`).
- `lib/voice/gemini-tts.ts` — `synthGeminiTTS(text, voice, timeoutMs)` (1 voz, Vertex REST `:generateContent` com `responseModalities:["AUDIO"]`), catálogo `GEMINI_VOICES`, `DEFAULT_GEMINI_VOICE_ID="leda"`, `pcmToWav`/`parsePcmRate`. Modelo via env `GEMINI_TTS_MODEL` (default `gemini-2.5-flash-tts`).
- `app/api/ai/voice` — Gemini-TTS primeiro, **fallback Piper** (voice-engine :8004). `app/api/ai/voices` — catálogo.

**lib/studio/** (puro + impuro)
- `types.ts`, `wav.ts` (PCM L16→WAV + `concatWav`, testado), `storage.ts` (`.studio/<id>.<ext>`; sanitiza id).
- `transformations.ts` (prompts + normalizadores de guia/faq/flashcards/mindmap/timeline — testado), `content.ts` (`loadStudyContext` por sourceIds/spaceId, membership), `text-pipeline.ts` (cria artifact→geminiJson→normaliza→salva; cache por sourceIds+kind; 1 retry).
- `podcast.ts` (outline/transcript portados do open-notebook + normalizadores + chunking — testado), `podcast-pipeline.ts` (roteiro Gemini → **voz turno-a-turno em paralelo (lotes de 5)** via `synthGeminiTTS` → `concatWav`; fire-and-forget), `podcast-tts.ts` (multi-speaker — **NÃO usado** pelo pipeline; modelo provavelmente não suporta).
- `imagen.ts` (`generateImage` Vertex `:predict`; env `IMAGEN_MODEL`) + `imagen-request.ts` (puro, testado).
- `video.ts` (roteiro + args do **ffmpeg**, puro testado) + `video-pipeline.ts` (Imagen slides + narração + ffmpeg → mp4; fire-and-forget).
- `gemini-tts-request.ts` (builders multi/single, puro testado), `mindmap-layout.ts` (SVG, testado), `artifact-text.ts` (artefato→texto, testado).

**lib/study/** (editor do caderno)
- `blockMarkdown.ts` (`detectHeadingShortcut` — `#`/`##`, testado), `blockOrder.ts` (`prevEditableId`, `moveBlock` — testado), `slashMenu.ts` (opções + `filterSlash`, testado — **só na PR #64, ver §6**).

**app/api/studio/**
- `[id]` (GET status/meta, DELETE), `[id]/file` (stream binário), `guide|faq|flashcards|mindmap|timeline` (texto), `podcast`, `image`, `video` (async + polling), **`diag`** (testa Imagen/TTS/TTS-multi/ffmpeg e devolve o erro REAL — use pra depurar).

**UI**
- `components/studio/StudioDock.tsx` — dock ⟁ no `MeusEstudosFeed`; gera e **dispara `zaeon:study:embed`** (encaixa no caderno). Ouve `zaeon:studio:generate` (menu "/"). Botões: Podcast · Guia · Mapa · Timeline · Flashcards · FAQ · Imagem · Vídeo.
- `components/studio/StudioBlock.tsx` — bloco colapsável (reusa as views) + salvar/baixar/remover. `StudioArtifactViews.tsx` — renderers (Guide/Faq/Flashcards/Mindmap(SVG)/Timeline/Podcast/Image/Video).
- `components/study/MeusEstudosFeed.tsx` — o caderno. Editor B1: markdown, Enter cria bloco/Backspace funde, arrastar reordenar, menu "/". `onEmbed` cria item `type:"studio"`. Preview isolado da biblioteca.
- `components/sub/LoungeChatWidget.tsx` — chat (Zaeon + humano-humano via Pusher); anexar foto→Vision; "gere imagem"→Imagen; bind `zaeon-notice` (convite).
- `components/lounge/CollabModule.tsx` (`CollabEditor`) — Lounge espelha o estudo; bind `member-joined` (foto da convidada ao vivo).
- `lib/onboarding/tour.ts` — tour guiado (passos declarativos) + **replay**.

**Prisma:** `StudioArtifact { ownerId, sourceIds[], kind, status, title, mime, storageRef, meta Json, error }`. `StudyItem.type` agora inclui `"studio"`. `ConnectionRequest` (amizade = status ACCEPTED em qualquer direção → `/api/network/friends`).

## 5. O que está NA MAIN (mergeado)

- **Studio slices 2–7** (texto/podcast/imagem/vídeo) — #44, #47, #49; fundação + StudioArtifact + storage + diag.
- **Voz Gemini-TTS** (Leda default) + Piper fallback; **podcast 2 vozes turno-a-turno paralelo** — #55, #62.
- **Caderno encaixável**: gerar no Studio → bloco colapsável no caderno; "Salvar" → cópia isolada na biblioteca; sem drag pros módulos — #52.
- **Editor B1:** B1.1 markdown (#52), B1.2 Enter/Backspace (#54), B1.3a arrastar-reordenar (#63).
- **Convite → conexão mútua** (colegas no chat ambos os lados) + foto ao vivo + aviso da Zaeon — #61.
- **Fixes:** id do TTS `gemini-2.5-flash-tts` (#46), `WebKitBlobResource` (#57), texto invisível + Play só play/pausa (#60), volume `studio_data` (#48). Research-lab (outro agente): voz 503 + PDF viewer (#56, #58).

## 6. PRs ABERTOS (mergear)

- **#64** — re-land do **menu "/"** (B1.3b). *O `lib/study/slashMenu.ts` só chega na main quando #64 entrar.* (Tinha ficado órfão do #63.)
- **#65** — **onboarding**: 3 passos novos (Meus Estudos, Studio, menu "/") no tour.
- **#66** — research-lab: persona Aura + isolamento de título + UX de resumo (outro agente).

Mergear `#64` e `#65` fecha a Sala de Estudos. Sem conflito esperado (regiões distintas).

## 7. Envs (dono seta no VPS)

Já SET: `GOOGLE_CREDENTIALS`/`GOOGLE_*`, `GEMINI_MODEL`. **Relevantes do Studio:**
```
GEMINI_TTS_MODEL=gemini-2.5-flash-tts     # já é o default no código
ZAEON_TTS_VOICE_F=Leda                     # voz feminina (narração + host A do podcast)
ZAEON_TTS_VOICE_M=Charon                    # host B do podcast
IMAGEN_MODEL=imagen-4.0-generate-001        # CONFIRMAR id no Model Garden do projeto
# opcionais: STUDIO_DIR (default /app/.studio), FFMPEG_PATH
# futuros: VEO_MODEL, LYRIA_MODEL
```
Sem TTS/Imagen válido, a voz cai no Piper e imagem/vídeo retornam erro tratado. **Use `/api/studio/diag` (logado) pra ver o erro REAL de cada capacidade.**

## 8. Deploy / infra

- `Dockerfile` runtime já inclui **ffmpeg** (#49) — necessário pro vídeo. Compose tem volume **`studio_data:/app/.studio`** (#48) pra os binários sobreviverem a `up --build`.
- **`prisma db push`** uma vez (índices de `studio_artifacts`) — opcional (coleção criada sozinha; sem índice fica lento em escala).
- **Background jobs** (podcast/vídeo): rota cria artifact `queued` + `void runXxx()` (fire-and-forget) e o cliente faz **polling** em `/api/studio/[id]`. Depende do `server.js` de longa duração (não serverless).

## 9. Como testar (dono, no deploy)

- **Studio texto** (guia/faq/flashcards/mapa/timeline): abrir estudo → dock ⟁ → clicar → encaixa no caderno.
- **Podcast**: ~1–2 min, 2 vozes (Marina/Leda ↔ Téo/Charon). **Vídeo/Imagem**: dependem do `IMAGEN_MODEL`.
- **Editor**: digitar `#`/`##` (título), Enter (novo bloco), arrastar pela alça (reordenar), `/` (menu — após #64).
- **Convite**: parceiro aceita → vira colega no chat (dois lados) + foto no Lounge + msg da Zaeon.
- **Onboarding (como usuário novo)**: acesse **`/research-lab?onboard=replay`** → tour reaparece a cada visita até "✓ Ok, não repetir".
- **Diagnóstico**: `/api/studio/diag` → JSON com `{ok,status,detail}` por capacidade.

## 10. TODO / o que pode melhorar

- **🎼 Trilha (Lyria)** e **⬆️ Veo** (vídeo melhor) — env-gated; precisam de **id + contrato da API confirmados no Model Garden** (o `:predict` do Lyria não foi verificado). Não construídos.
- **Editor B2 (completo)** — adotar TipTap/BlockNote pra rich-text real. **Rejeitado por ora**: trocaria o modelo "N itens (StudyItem)" por um doc único → quebraria o `loadStudyContext` do Studio, a co-edição do Lounge e a leitura em voz. Faria migração própria.
- **Menu "/" Studio-no-cursor**: o embed assíncrono (podcast/vídeo) posiciona via `pendingAfterId` (ref) + desempate por `createdAt`. Casos de borda com `order` duplicado podem desalinhar (raro).
- **Lounge — bugs secundários** (achados por exploração, NÃO confirmados como sintoma do dono): `/api/collab` `buildContent` filtra itens por `userId` (a CÓPIA de pesquisa não pega itens de co-autor); `/api/study/spaces` DELETE é só do dono, mas PATCH permite membro — inconsistência.
- **Voz 503 no resumo**: foi delegada a outro agente (PRs #56/#58/#66).
- **Podcast multi-speaker**: hoje desativado (per-turn). Se o `/api/studio/diag` mostrar `voz_podcast_multi: ok`, dá pra reativar o `synthGeminiTTSMulti` (já existe em `podcast-tts.ts`) pra transições mais naturais.

## 11. Gotchas / lições (LEIA antes de mexer)

- **Commit órfão (aconteceu 2x — #59, #63):** NÃO empurre um commit de continuação num branch cujo PR pode ser mergeado no meio — ele fica fora da main. **Cada nova fatia = branch novo a partir do `origin/main` atual.** Pra recuperar um órfão: `git cherry-pick <sha>` num branch fresco → novo PR.
- **Squash + branches empilhados conflitam**: se um PR base foi squashado, o branch empilhado diverge. Resolva com `git rebase --onto origin/main <ultimo-commit-ja-na-main>` ou cherry-pick só o commit novo. **Nunca mergear** um branch atrasado que reverteria PRs novos (foi o caso do #50/#59 — fechados, não mergeados).
- **Prisma `meta` Json** exige `as any` ao salvar objetos tipados.
- **AutoGrow (textarea)**: media `scrollHeight=0` quando escondido (display:none) → texto invisível; corrigido com IntersectionObserver + não-colapsar-pra-0.
- **Blob URLs** não podem ser persistidas (morrem no reload → `WebKitBlobResource error`). Use `data:` URL (com guarda de quota no localStorage).
- **open-notebook** (`/tmp/open-notebook`, MIT) foi a referência do podcast/transformações (ver `NOTICE`). Pode não estar clonado numa sessão nova; `git clone --depth 1 https://github.com/lfnovo/open-notebook /tmp/open-notebook` se precisar.

---

### Estado-resumo
Studio (texto/podcast/imagem/vídeo) + voz Leda + caderno encaixável + editor B1 (markdown/Enter/reordenar) + convite-conexão estão **na main**. Faltam mergear: **#64** (menu "/"), **#65** (onboarding), **#66** (research-lab). Pendências de produto: **Lyria/Veo** (confirmar ids) e, se quiserem, **editor B2**.
