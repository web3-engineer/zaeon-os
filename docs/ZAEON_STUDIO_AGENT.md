# ZAEON STUDIO — Prompt-mestre do agente (contexto completo, autossuficiente)

> **Você é um agente sênior full-stack** trabalhando no monorepo **Zaeon OS**. Sua missão:
> transformar cada estudo da Zaeon em **várias formas mastigadas** (podcast, vídeo, mapa
> mental, linha do tempo, guia, FAQ, flashcards, imagem didática, trilha, voz) e dar
> **multimodalidade ao chat** (mandar foto → análise; pedir → gerar imagem) — **com a
> interface da Zaeon** (⟁, botão Play, pílulas, liquid glass), **NUNCA a UI do Google**,
> **100% sobre modelos GenAI do Google** (debita do crédito). Espelhe o melhor do
> **`lfnovo/open-notebook`**. Ao terminar, o dono só faz **subir e testar**.
>
> Trabalhe em **fatias pequenas**, verificando a cada uma (`npx vitest run` + transpile),
> **sem quebrar o que está verde**. Este documento é a fonte da verdade — leia inteiro antes de começar.

---

## 1. Contexto do produto e da stack

**Zaeon OS** é uma plataforma de estudos com agentes de IA. Salas: **Sala de Estudos**
(com a aba **"Meus Estudos"** = caderno do aluno) e **Sala de Pesquisa** (Omega Scholar,
TCC/Artigo/Relatório), **Lounge** (colaborativo) e **Projetos** (IDE).

- **Front/back:** Next 14 App Router + **server.js custom** (Socket.IO presente; realtime real via **Pusher**).
- **DB:** MongoDB via **Prisma + Mongoose**. Models relevantes: `User`, `StudySpace`, `StudyItem`, `CollabDoc`, `ScholarSession`.
- **IA:** **Gemini via Vertex AI** — modelo central em `lib/ai/model.ts` (`GEMINI_MODEL`=`gemini-2.5-flash`, `GEMINI_MODEL_PRO`=`gemini-2.5-pro`). Credenciais em `lib/ai/vertex-credentials.ts` (lê `GOOGLE_CREDENTIALS` JSON OU `GOOGLE_PROJECT_ID`/`GOOGLE_CLIENT_EMAIL`/`GOOGLE_PRIVATE_KEY`/`GOOGLE_LOCATION`). **Todas as `GOOGLE_*` já estão SET no `.env` do VPS.**
- **Voz:** hoje self-hosted (`voice-engine/`, Kokoro/Piper na porta 8004) via `app/api/ai/voice/route.ts` + `lib/voice/ttsController.ts`. Kokoro é lento na CPU (~8,5s → 503); há um stopgap forçando Piper. **Vamos migrar p/ Gemini-TTS** (ver §3).
- **Deploy:** Docker Compose no VPS Hostinger (`docker-compose.beta.yml`, `Dockerfile`), domínio `beta.zaeon.space`, atrás do Caddy. **Deploy é manual pelo dono** (Zed → push → `git reset --hard origin/main` + `docker compose up -d --build` no VPS). **Você NÃO faz SSH/deploy.**

### Recon obrigatório (faça ANTES de codar — confirme nomes/símbolos reais)
Rode greps p/ ancorar onde plugar (os caminhos podem ter variações):
```
rg -n "MeusEstudosFeed|Meus Estudos|StudyItem|StudySpace" components app lib prisma
rg -n "ttsController|useTTS|/api/ai/voice|speak\(" lib app components
rg -n "GEMINI_MODEL|vertexCredentials|VertexAI|getGenerativeModel" lib app
rg -n "LoungeChatWidget|sendMessage|attach|image" components/sub
```
Mapeie: como **Meus Estudos** carrega o conteúdo do estudo, onde está o **botão Play/Ouvir**, como o **chat widget** monta mensagens, e como o **ttsController** toca áudio.

---

## 2. O crédito Google = base econômica (regra de ouro)

O crédito **"Trial credit for GenAI App Builder"** (Google Developer Program — Premium GenAI
Credit) cobre (confirmado na conta, Billing → Credits → **usage scope**):

| ✅ Coberto (use sempre) | ❌ Fora (não use) |
|---|---|
| Gemini 2.5/3/3.1/3.5 (texto, áudio, visão) | Cloud TTS clássico (Neural2/Chirp) |
| **Gemini-TTS** (voz; SKU "audio output … gemini 3.1 flash tts") | Cloud Speech-to-Text clássico |
| **Imagen 4** (imagem), **Veo 3** (vídeo), **Lyria 3** (música) | "Data labeling for Vertex AI" (irrelevante) |

**Regra de ouro:** **toda** capacidade de IA passa por um **modelo GenAI do Google**. Nada de
serviço fora do crédito. IDs de modelo sempre via **env com default** (confirmar Imagen/Veo no Model Garden do projeto).

---

## 3. Fundação compartilhada (fazer PRIMEIRO)

### 3.1 Voz via Gemini-TTS (`lib/voice/gemini-tts.ts`)
Substitui Kokoro/Piper como caminho principal (mantém Piper como fallback offline).
- Modelo: env `GEMINI_TTS_MODEL` (default `gemini-2.5-flash-preview-tts`; alt `gemini-3.1-flash-tts-preview`).
- Chamada `generateContent` (Vertex, reusar `vertexCredentials()`):
  ```jsonc
  {
    "contents": [{ "role": "user", "parts": [{ "text": "<texto>" }] }],
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": { "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "<voz feminina pt-BR>" } } }
    }
  }
  ```
  Multi-speaker (podcast): `speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs[]` (`{speaker, voiceConfig}`).
- Saída: base64 em `candidates[0].content.parts[0].inlineData.data` + `mimeType` (ex.: `audio/L16;rate=24000` → embrulhar header WAV, ou tocar via WebAudio no controller).
- Integrar em `app/api/ai/voice/route.ts` (tira o stopgap `natural-br`, usa Gemini-TTS; fallback Piper se falhar) e `app/api/ai/voices/route.ts` (catálogo de vozes Gemini-TTS, feminina default).

### 3.2 Modelo central de texto
Use `lib/ai/model.ts` (`GEMINI_MODEL`). Nada de string de modelo solta.

### 3.3 Persistência de artefatos (`StudioArtifact` no Prisma)
`{ id, ownerId, sourceIds String[], kind, status (queued|running|done|error), title, mime, storageRef, meta Json, error?, createdAt, updatedAt }` + `prisma generate`. Arquivos em `/app/.studio/<id>.<ext>` servidos por rota de stream; texto/JSON no `meta`.

### 3.4 Rotas base + libs puras
- `app/api/studio/[id]/route.ts` (GET status/meta), `app/api/studio/[id]/file/route.ts` (stream).
- `POST /api/studio/<feature>` cria o artifact e dispara a geração (await curto p/ texto; background+polling p/ áudio/vídeo).
- `lib/studio/` = orquestradores **puros e testáveis** (montar roteiro, storyboard, mindmap, validação de schema). Carregar conteúdo do estudo do banco (`StudyItem`/`StudySpace`/markdown do feed) — **não baixar PDF externo**.

---

## 4. Espelhar o `lfnovo/open-notebook` (OBRIGATÓRIO) — passo zero

> **Blueprint canônico: https://github.com/lfnovo/open-notebook (MIT).**

1. **Clonar p/ referência:** `git clone --depth 1 https://github.com/lfnovo/open-notebook /tmp/open-notebook` (só leitura; NÃO commitar no nosso repo).
2. **Mapear e resumir** (num scratch) os módulos-chave antes de codar:
   - **Podcast multi-speaker (1–4 vozes)** e os **"Episode Profiles"** (tom, duração, nº/persona das vozes) → viram nossas opções de podcast.
   - **Prompts de roteiro** (como faz dois hosts soarem naturais, com idas e voltas) e o **pipeline transcript→áudio** (chunking, concatenação, shorts vs longform).
   - **Transformações de conteúdo** (study guide, FAQ, resumo, mindmap, etc.) e seus prompts.
   - Modelagem notebook/sources/notes → comparar com `StudyItem`/`StudySpace`.
3. **Portar, não copiar cego:** adaptar os padrões/prompts pra nossa stack **Google GenAI** (Gemini roteiro + **Gemini-TTS multi-speaker** voz + Imagen/Veo/Lyria). open-notebook usa outros provedores — troque pelos modelos Google do crédito.
4. **Licença:** ao reaproveitar trechos, manter aviso MIT/origem (criar `NOTICE` se preciso). (Complemento opcional só p/ podcast: `souzatharsis/podcastfy`, Apache-2.0.)

---

## 5. UI: tudo dentro de "Meus Estudos" (a cara Zaeon)

No `components/study/MeusEstudosFeed.tsx`, adicionar o **"Studio da Zaeon"**: barra/dock de
ações no estilo da casa (pílulas liquid-glass + ⟁), cada ação gera e mostra o artefato
**inline** (player de áudio/vídeo Zaeon, viewer de mapa mental, cards de flashcards…), e
salva no acervo/biblioteca. **Reusar** componentes/estética existentes (cards, `ttsController`
p/ áudio, glitch ⟁, padrão de flip dos cards). **Sem UI/embed do Google.**

Botões: **🎙️ Podcast · 🎬 Vídeo · 🧠 Mapa mental · 🕒 Linha do tempo · 📘 Guia · ❓ FAQ ·
🃏 Flashcards · 🖼️ Imagem · 🎼 Trilha · 🔊 Ouvir**. Cada um: clica → estado "gerando…" (⟁
girando) → resultado na própria página com **Play**/preview + ações (salvar, baixar, regerar).

---

## 6. Catálogo de features (rota · modelo · schema · UI · aceite)

### 6.1 🎙️ Podcast / Audio Overview (2 vozes) — ⭐ CARRO-CHEFE, no botão Play
Hoje o **Play** em Meus Estudos só "lê o estudo" (1 voz). Evoluir o **mesmo Play** p/ 2 modos:
**Ouvir** (narração 1 voz, instantânea, Gemini-TTS) e **Podcast** (2 apresentadores conversando).
- `POST /api/studio/podcast` (`sourceIds`, duração, tom, idioma pt-BR, nomes dos hosts).
- Agente (Gemini): roteiro em turnos `{title, turns:[{speaker:"A|B", text}]}` (A condutor curioso, B especialista; fala natural, ganchos, analogias, sem markdown; fiel ao conteúdo). Inspirar nos "Episode Profiles" do open-notebook.
- Síntese: **Gemini-TTS multi-speaker** → 2 vozes pt-BR; concatenar WAV no Node (ou ffmpeg). Trilha de fundo opcional via Lyria (volume baixo).
- **Cache:** salvar `StudioArtifact{kind:"podcast", sourceIds}`; Play reusa se já existe.
- UI: **mesmo player do Play** + transcrição expansível (turnos A/B) + "Regerar".
- Aceite: Play → "Podcast" → áudio ~2–5 min, 2 vozes coerentes, pt-BR, no crédito; "Narração" continua instantânea.

### 6.2 🎬 Vídeo Overview
`POST /api/studio/video`. Gemini → seções `{narração, bullets, prompt_de_imagem}`. **Nível A (default):** Imagen 4 (1 img/seção) + narração Gemini-TTS + montagem slides (ffmpeg/slideshow). **Nível B:** Veo 3 (clipes). UI: player de vídeo Zaeon. Aceite: .mp4 curto narrado.

### 6.3 🧠 Mapa mental
`POST /api/studio/mindmap`. Gemini → JSON `{nodes:[{id,label,parent?}], edges?}` (validar). UI: render na página (SVG/canvas simples). Aceite: hierarquia coerente.

### 6.4 🕒 Linha do tempo
`POST /api/studio/timeline`. Gemini → `{events:[{when,title,detail}]}` ordenado. UI: timeline vertical Zaeon.

### 6.5 📘 Guia · ❓ FAQ · 🃏 Flashcards
`/api/studio/guide` → `{resumo, conceitos:[{termo,definicao}], revisao:[...]}`; `/api/studio/faq` → `{faq:[{q,a}]}`; `/api/studio/flashcards` → `{cards:[{front,back}]}` (UI: flip). Aceite: fiel e "mastigado".

### 6.6 🖼️ Imagem didática (Imagen) — anatomia/medicina etc.
`POST /api/studio/image` (`prompt` do estudo OU pedido direto). Imagen 4. Útil p/ diagramas. UI: imagem + salvar na biblioteca.

### 6.7 🎼 Trilha sonora (Lyria)
`POST /api/studio/soundtrack` (humor/tema). Lyria 3. UI: Play; opcional como fundo do podcast/vídeo.

### 6.8 🔊 Ouvir o estudo (Gemini-TTS)
Integrar o botão **Ouvir** com a voz feminina pt-BR (reusa §3.1 + `ttsController`).

---

## 7. Chat multimodal (`components/sub/LoungeChatWidget.tsx`)

### 7.1 Foto → análise (Gemini Vision)
Permitir anexar **imagem** no chat; rota manda a imagem (inlineData) + pergunta ao **Gemini multimodal** → resposta (explicar diagrama, resolver questão da foto, transcrever, descrever). Aceite: foto de exercício/diagrama → Zaeon analisa.

### 7.2 Gerar imagem pelo chat (Imagen)
Detectar intenção "gere/crie uma imagem de…" → Imagen 4 → imagem no balão da Zaeon (estética Zaeon) + salvar na biblioteca. Ex.: "gere um modelo do coração humano com as câmaras nomeadas". Aceite: pedir → receber inline.

---

## 8. Confiabilidade
- **Saída estruturada** sempre (Gemini `responseSchema`/JSON) + validação; inválido → 1 retry com instrução de correção; senão erro tratado (nunca renderizar lixo).
- **Idempotência/polling** p/ áudio/vídeo; status no `StudioArtifact`; **cache** por `sourceIds`+`kind`.
- **Limites:** TTS chunk ≤ ~420 chars (já no controller); cap de duração do vídeo; `maxDuration` generoso nas rotas pesadas.
- **Custos no crédito:** confirmar IDs Imagen/Veo no Model Garden; tudo Gemini/GenMedia.

---

## 9. Guardrails (NÃO violar)
- **Segredos** só em `.env`/`.env.local` (gitignored) + VPS; **nunca** em git/log. Não imprimir valores de chave.
- **Sem SSH ao VPS**; deploy é do dono.
- **macOS sem `python`** (use `python3`/Node).
- **Verificação por fatia:** `npx vitest run` (alvo ≥248/248) + transpile dos arquivos tocados (`next.config` tem `ignoreBuildErrors` → confie no vitest + revisão). Escrever **testes unitários** p/ os montadores puros (`lib/studio/*`).
- **Não quebrar o verde.** Falhou? Pare e relate; não force.
- Não copiar UI do Google/NotebookLM — só a lógica, com a cara da Zaeon.

---

## 10. Checklist de ENVs (pro dono setar no VPS)
Já SET: `GOOGLE_CREDENTIALS`/`GOOGLE_PROJECT_ID`/`GOOGLE_CLIENT_EMAIL`/`GOOGLE_PRIVATE_KEY`/`GOOGLE_LOCATION`, `GEMINI_MODEL`. **Adicionar:**
```
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
IMAGEN_MODEL=<id do Imagen 4 no projeto, ex.: imagen-4.0-generate-001>
VEO_MODEL=<id do Veo 3 no projeto>
LYRIA_MODEL=<id do Lyria, se usar>
ZAEON_TTS_VOICE_F=<nome da voz feminina pt-BR do Gemini-TTS>
```
(Imagen/Veo/Lyria: confirmar os IDs no Model Garden do projeto antes; sem id válido, a feature fica atrás de flag.)

---

## 11. Plano de execução (fatias) — cada fatia: implementar → vitest+transpile → relatar
1. **Recon** (§1) + **clonar open-notebook** (§4) + resumo dos módulos-chave.
2. **Fundação** (§3): `gemini-tts.ts`, `StudioArtifact` (Prisma), `app/api/studio/[id]` + storage/stream, `lib/studio/` puro + testes.
3. **Voz Gemini-TTS** ligada em `/api/ai/voice` (tira stopgap; fallback Piper).
4. **Geradores de texto** (guia, FAQ, flashcards, mapa mental, timeline) + **UI no Meus Estudos** (botões + render inline). Validam o pipeline ponta-a-ponta barato.
5. **Podcast** (Gemini-TTS multi-speaker) **no botão Play** (Narração | Podcast) + cache.
6. **Imagem** (Imagen) no Meus Estudos + **chat: gerar imagem** + **chat: analisar foto** (Gemini Vision).
7. **Vídeo** (Nível A: Imagen+slides+narração) → **Trilha** (Lyria) → Veo (upgrade).

---

## 12. Definição de DONE (subir e testar)
- Botões do Studio aparecem em **Meus Estudos** com a estética Zaeon e **funcionam** (geram + mostram inline + salvam na biblioteca).
- **Play** oferece **Narração** e **Podcast** (2 vozes) e toca no mesmo player.
- Chat aceita **foto (análise)** e **gera imagem**.
- Tudo passa por **modelo Google** (crédito). Padrões do **open-notebook** aproveitados (com licença).
- `npx vitest run` verde + transpile limpo. **Nenhum segredo no git.** Deploy/rebuild fica pro dono.
