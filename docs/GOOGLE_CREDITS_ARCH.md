# Zaeon → 100% Google GenAI (crédito como base) · Spec de execução p/ agente

> **Missão deste agente:** consolidar a Zaeon sobre o crédito **GenAI App Builder** (Google
> Developer Program — Premium GenAI Credit), migrando a **voz** para **Gemini-TTS** e
> consertando o **cruzar/conversar com documentos**. Trabalhe em **fatias pequenas**,
> verificando a cada uma (transpile + vitest), **sem quebrar o que está verde**.

---

## 0. Contexto (por que estamos fazendo isso)

O projeto roda em VPS Hostinger (Docker Compose, `docker-compose.beta.yml`, domínio `beta.zaeon.space`),
Next 14 App Router + server.js custom. A IA é Gemini via **Vertex AI** (`lib/ai/model.ts`,
default `gemini-2.5-flash`). As credenciais `GOOGLE_*` já estão **SET** no `.env` do VPS
(`GOOGLE_CREDENTIALS` JSON, `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`,
`GOOGLE_LOCATION`). Ver `lib/ai/vertex-credentials.ts`.

O crédito do Google vira a **base econômica** do produto. Confirmado na conta (Billing →
Credits → **usage scope**) que o crédito cobre:

| Coberto pelo crédito ✅ | Fora do crédito ❌ |
|---|---|
| Gemini 2.5 / 3 / 3.1 / 3.5 (input/output/áudio) | Cloud TTS clássico (Neural2/Chirp) |
| **Gemini-TTS** (SKU "audio output … gemini 3.1 flash tts") | Cloud Speech-to-Text clássico |
| Imagen 4 (imagem), Veo 3 (vídeo), Lyria 3 (música) | "Data labeling for Vertex AI" (irrelevante) |

**Conclusão estratégica:** tudo que for **modelo GenAI do Google** (Gemini, Gemini-TTS,
Imagen, Veo, Lyria) debita do crédito. Então a regra de ouro: **toda capacidade de IA da
Zaeon deve passar por um modelo GenAI do Google.**

---

## Regras / guardrails (LER ANTES)

- **Segredos:** NUNCA commitar segredo. Vivem só em `.env`/`.env.local` (gitignored) e no `.env` do VPS. Não logar valores de chave.
- **Sem SSH ao VPS:** o deploy é manual pelo dono (Zed → push → VPS rebuild). Você só mexe no repo.
- **Verificação obrigatória por fatia:** `npx vitest run` (alvo: 248/248) + transpile dos arquivos tocados. `next.config` tem `ignoreBuildErrors`, então o build não pega erro de tipo — confie no vitest + revisão.
- **macOS do dono:** sem `python` (só `python3`/curl). Não dependa de `python`.
- **Não quebrar o verde:** se uma fatia falhar, pare e reporte; não force.

---

## TAREFA 1 — Voz via Gemini-TTS (a mais importante)

**Problema:** a voz self-hosted (Kokoro/Piper no `voice-engine`) é inviável na CPU do VPS
(Kokoro ~8,5s por frase curta → 503; Piper é rápido mas masculino). Hoje a rota
`app/api/ai/voice/route.ts` está com um **stopgap** que força `natural-br` (Piper masculino).

**Solução:** sintetizar com **Gemini-TTS** no Vertex (voz feminina pt-BR, rápida, **no crédito**).

### Modelo e chamada
- Modelo: `gemini-2.5-flash-preview-tts` (estável o suficiente) ou `gemini-3.1-flash-tts-preview` (mais novo). Deixar via env `GEMINI_TTS_MODEL` (default `gemini-2.5-flash-preview-tts`).
- Endpoint Vertex: `.../publishers/google/models/<model>:generateContent`.
- Body: `generateContent` com:
  ```jsonc
  {
    "contents": [{ "role": "user", "parts": [{ "text": "<texto a falar>" }] }],
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "<voz>" } }
      }
    }
  }
  ```
- Resposta: áudio base64 em `candidates[0].content.parts[0].inlineData.data` (PCM/WAV — conferir `mimeType` em `inlineData.mimeType`; normalmente `audio/L16;rate=24000` → embrulhar em header WAV ou tocar via WebAudio).
- Vozes: há ~30 vozes prebuilt. Escolher uma **feminina** agradável p/ pt-BR (testar; ex.: "Kore", "Aoede", "Leda" — validar no projeto). Expor catálogo em `GET /api/ai/voices`.
- Multi-speaker (p/ o podcast da outra spec): `speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs[]` com `speaker` + `voiceConfig`.

### Onde mexer
1. **`lib/voice/`** — criar `gemini-tts.ts`: função `synthGeminiTTS(text, voiceName)` usando `@google-cloud/vertexai` (ou REST com `vertexCredentials()`), retornando `{ audio_base64, mime }`. Reusar `lib/ai/vertex-credentials.ts`.
2. **`app/api/ai/voice/route.ts`** — trocar o proxy do `voice-engine` por `synthGeminiTTS`. Manter o **fallback** Piper (`voice-engine` `natural-br`) só se o Gemini-TTS falhar (resiliência). Remover o stopgap `const voice = "natural-br"`; usar a voz pedida (mapeada p/ uma voz Gemini-TTS) com default feminino.
3. **`app/api/ai/voices/route.ts`** — catálogo passa a listar as vozes Gemini-TTS (feminina default).
4. **Engine local** — pode **manter** `voice-engine` como fallback offline, mas deixa de ser o caminho principal. Não precisa removê-lo agora.
5. **Cliente** — `lib/voice/ttsController.ts` já fala com `/api/ai/voice`; não deve precisar mudar (continua recebendo `{audio_base64, mime}`). Conferir o `mime` (se vier PCM, montar WAV no controller).

### Custos / limites
- Chunking: a rota já recebe texto ≤4000 chars; o `ttsController` quebra em ~420 chars. Manter.
- Gemini-TTS debita do crédito (SKU de áudio). Não usar Cloud TTS clássico.

### Critério de aceite (Tarefa 1)
- `/api/ai/voice` devolve áudio em <~3s p/ um trecho normal, voz **feminina pt-BR**.
- Sem 503 no fluxo normal; se Gemini-TTS cair, fallback Piper responde (sem quebrar a tela).
- `npx vitest run` verde; transpile limpo nos arquivos tocados.

---

## TAREFA 2 — Auditar/garantir toda IA em Vertex Gemini (rápido)

- Conferir que todas as rotas de IA usam `GEMINI_MODEL`/`GEMINI_MODEL_PRO` de `lib/ai/model.ts` (não strings soltas). Há refs a `gemini-2.0-flash-001` **só em comentários** (ok). Garantir que nada vivo aponte p/ modelo aposentado.
- Objetivo: 100% das chamadas faturam no crédito (Gemini).

---

## TAREFA 3 — Consertar "cruzar / conversar com documentos"

**Diagnóstico (já feito):** NÃO é credencial (Vertex creds SET). É **fluxo**. A rota
`app/api/ai/scholar/pdf/route.ts` só libera baixar um PDF cuja URL exista em
`scholarSession.references[].pdfUrl`. Os documentos **gerados** pelo usuário (estudos/pesquisas)
não são referências do Scholar → **403** → o PDF nunca baixa → o `relate` nunca chega no Gemini
→ "sem erro, sem merge". (Sintoma no console: `403 (pdf)`.)

**Fix:** para documentos **gerados/internos**, não passar pelo proxy de PDF. Usar o **conteúdo
de texto que o app já tem** (markdown do estudo/pesquisa, ou `CollabDoc.content`, ou
`StudyItem`) e mandar direto pro Gemini:
- **Conversar com documento:** `POST /api/ai/doc/chat` — recebe `docId(s)` + pergunta → carrega o texto do(s) doc(s) do banco → Gemini (Vertex) responde com citações do próprio texto.
- **Cruzar 2 documentos:** reusar `app/api/ai/relate/route.ts` mas no **modo texto** (já existe o caminho "vercel"/Groq que usa título+abstract sem PDF) — estender p/ aceitar o **corpo completo** dos dois docs internos e gerar a relação via Gemini. Não tentar baixar PDF p/ docs internos.
- Manter o caminho PDF/Vertex **só** p/ papers externos do Scholar (que têm `pdfUrl` válido).
- No cliente (DocumentDesktop / play / comparar): rotear docs internos pro endpoint de texto; papers externos pro fluxo atual.

**Opcional (fase 2, se sobrar tempo):** evoluir p/ **Vertex AI Search** (data store + Answer API)
p/ RAG de verdade com grounding — mas só depois do fix de texto acima funcionar.

### Critério de aceite (Tarefa 3)
- Selecionar 2 estudos/pesquisas gerados e "cruzar" → volta um resumo da relação (sem 403/502).
- "Conversar com documento" responde com base no conteúdo real do doc.

---

## Ordem sugerida (fatias)
1. Tarefa 1 (voz Gemini-TTS) — entrega o maior valor + usa o crédito.
2. Tarefa 3 (cruzar/conversar via texto) — destrava a feature quebrada.
3. Tarefa 2 (auditoria de modelos) — limpeza.

Cada fatia: implementar → `npx vitest run` + transpile → relatar diff. Deploy é do dono.
