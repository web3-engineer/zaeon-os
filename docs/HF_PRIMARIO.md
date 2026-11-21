# Hugging Face como provedor PRINCIPAL de LLM (Google vira a queda)

Decisão do dono (2026-11-21): o HF tem mais modelos; o texto da Zaeon passa a sair primeiro pelo router do
Hugging Face (Inference Providers, `https://router.huggingface.co`) e o Google/Vertex fica como queda.
Tudo atrás de **uma flag** — `LLM_PRIMARIO=hf` — que volta atrás sem deploy de código.

## 1. Inventário das dependências do Google

Legenda: ✅ = o HF assume com a flag (este PR) · 🟡 = dá pra migrar, fica pra outro PR · 🔴 = fica no Google (sem par no HF hoje, ou a troca exige migração de dados).

| # | O quê | Onde | Com `LLM_PRIMARIO=hf` | Modelo HF + provedor | O que quebra / limite |
|---|---|---|---|---|---|
| 1 | **Texto pelo envelope** — chat da Aura (harness: classificar, raciocinar, rascunho, plano), `geminiJson` (~30 call sites, `lib/scholar/gemini`), `geminiText` (`lib/ai/gemini-text`), roteador do agente, papéis com queda Google (`lib/llm/papeis`), disparos do WhatsApp | `lib/llm/envelope.ts` (`gerar`, `gerarJson*`) | ✅ HF primeiro, Vertex na queda | tier rápido (`GEMINI_MODEL`): `openai/gpt-oss-120b:cerebras` → `:groq`. Tier forte (`GEMINI_MODEL_PRO`): o mesmo gpt-oss com `reasoning_effort: medium` | **Sem prévia em stream** no rascunho do chat (a resposta chega inteira — medido: ~0,5 s pra 100 tokens, 5k tokens em ~4 s). Contexto 131k (Gemini: 1M) — pedido maior dá 400 no HF e cai sozinho no Vertex. `thinkingConfig` do Gemini vira `reasoning_effort` (minimal→low). JSON mode ✅ testado. |
| 2 | **PaperOrchestra** (escritor/revisor do documento, `maxOutputTokens: 32768`) | PR #862 (aberto), `lib/tcc/gerar.ts` → `gerar()` do envelope; envs `PAPER_ORQ_MODELO_*` | ✅ assim que o #862 entrar (usa o envelope) | igual ao #1; `PAPER_ORQ_MODELO_ESCRITOR` com id Gemini segue o tier dele | Saída longa testada: 4.902 tokens / 2.873 palavras em 3,9 s, `finish=stop`. |
| 3 | **Gateway LiteLLM** — `zaeon-flash` / `zaeon-pro` (camada autônoma: Escritório, canal) | `infra/litellm.config.yaml` + `apelidoNoGateway` | ✅ o app pede `zaeon-hf-flash` / `zaeon-hf-pro`; a cadeia cai em `zaeon-flash`/`zaeon-pro` → `zaeon-reserva-google` | `openai/openai/gpt-oss-120b:cerebras` (+ `zaeon-hf-flash-groq`) com `api_base` do router e `api_key: os.environ/HF_TOKEN` | Precisa recarregar o gateway (yaml novo) e liberar os grupos nas virtual keys (checklist). Sem isso: 403 → o envelope vai direto no HF, depois Vertex — **não quebra**. |
| 4 | `vertex_ai/*` (modelo real do **Octa Code**) | `lib/octa/modelo.ts` | 🔴 fica | — | O Octa pede `vertex_ai/<id>` pelo nome; trocar = mudar `OCTA_MODELO_RESERVA` (env já existe). |
| 5 | `zaeon-reserva-google` (queda do pool grátis) e `zaeon-pool-lite` (AI Studio grátis) | gateway | 🔴 fica | — | O pool só leva web pública; o HF é pago e nunca entra na cadeia do pool (teste pina). |
| 6 | **Embeddings do RAG** (1024 dim) e **memória L3** (1536 dim) — `gemini-embedding-001` | `lib/rag/embed.ts` | 🔴 fica | (candidato: `Qwen/Qwen3-Embedding-*` ou o `zaeon-local-embed` da Contabo) | O índice pgvector e a L3 guardam vetores DESSE modelo: trocar = re-embedar a base inteira. Fora do escopo. |
| 7 | **Imagem** (Studio, avatares) — `gemini-2.5-flash-image` | `lib/ai/gemini-image.ts`, `lib/studio/imagen.ts`, `lib/avatars/gemini-image.ts` | 🔴 fica | (HF tem FLUX/Qwen-Image via fal-ai/replicate/nebius) | API diferente (não é chat OpenAI) e a EDIÇÃO mantendo o personagem é do Gemini. |
| 8 | **Voz (TTS)** — Gemini-TTS | `lib/voice/gemini-tts.ts`, `scripts/generate-voice-fillers.mjs`, `scripts/avatars/gerar-saudacao.mjs` | 🔴 fica | — | Vozes prebuilt do Gemini (Leda etc.) não existem no HF. |
| 9 | **PDF/imagem multimodal** (Gemini lê PDF nativo; context caching) | `lib/ai/descreverImagem.ts`, `lib/ai/contextCache.ts`, `app/api/ai/relate`, `lib/aula-interativa/gerar.ts`, `app/api/agentic/biosim` | 🔴 fica | (visão: `Qwen/Qwen3.8-27B:cerebras`, `google/gemma-4-26B-A4B-it:google-vertex`) | O HF não lê PDF nativo nem tem `cachedContents`; o anexo do chat que é TEXTO já passa pelo envelope (#1). |
| 10 | **Rotas que chamam o SDK do Vertex direto** (sem envelope), texto/JSON puro | `app/api/agentic/{codelab,quantum}`, `app/api/onboarding-extract`, `app/api/documents/abnt-export`, `app/api/research/chat/[researchId]` (stream), `lib/scholar/suggest.ts`, `lib/cyber/ia/motor.ts`, `lib/ai/router.ts` | 🟡 fica no Google por enquanto | o mesmo do #1 assim que migrarem pro envelope | Migrar = trocar o `getGenerativeModel().generateContent` por `geminiJson`/`gerar` (uma a uma, com teste). |
| 11 | **Function calling / grounding** | `app/api/ai/agent-search` (tools), caminho legado do `app/api/ai/chat` (tools; só com `AURA_HARNESS=0` ou agentes fora do harness), `app/api/ai/generate-document` (`googleSearchRetrieval`) | 🔴/🟡 fica | gpt-oss suporta tools OpenAI | Tools: precisa traduzir `FunctionDeclaration` → tools OpenAI. Grounding do Google Search não tem par no HF (trocar pelo `web_search`/SearXNG). |
| 12 | `backend/` (Express legado, `@google/generative-ai`) | `backend/src/controllers/ai.controller.ts` | 🔴 fica | — | Fora do app Next. |
| 13 | Tipos `FunctionDeclaration` | `lib/agent/{tools,mcp,runtime}.ts` | — | — | Só `import type`, sem chamada. |

## 2. Provedores do HF na conta do dono (testado 2026-11-21, do VPS de prod)

| Provedor | Estado | Modelos úteis provados |
|---|---|---|
| **cerebras** | ✅ ligado | `openai/gpt-oss-120b` (JSON ✅, tools, 131k, ~1.500 tok/s), `Qwen/Qwen3.8-27B` (JSON ✅, visão, 65k) |
| **groq** | ✅ ligado | `openai/gpt-oss-120b`, `openai/gpt-oss-20b` |
| **nebius** | ✅ ligado | `zai-org/GLM-5.3`, `deepseek-ai/DeepSeek-V4.1-Flash`, `moonshotai/Kimi-K3.1-Pro`, `Qwen/Qwen3.8-27B` (JSON ✅, ~3 s, pensam bastante) |
| **sambanova** | ✅ ligado | `zai-org/GLM-5.3`, `MiniMaxAI/MiniMax-M3.1-Flash` (JSON ✅) |
| **google-vertex** (via HF) | ✅ ligado | `openai/gpt-oss-120b`, `google/gemma-4-26B-A4B-it` (JSON ✅, 1 s) |
| baseten | ❌ desligado | (a prod tem `HF_RESERVA_MODELOS=…:baseten` → 400 desperdiçado: tirar) |
| together, novita, fireworks-ai, deepinfra | ❌ desligados | DeepSeek/Kimi/GLM/MiniMax mais baratos estão aqui — ligar se quiser |

## 3. Medido no router real

`scripts/smoke-hf-primario.ts` (envelope de verdade, `LLM_PRIMARIO=hf`, Vertex = stub, ledger no-op):

| Teste | Resultado |
|---|---|
| texto curto (3×) | 1.510 ms (1ª, frio) · 486 ms · 470 ms — `huggingface`, gpt-oss-120b |
| `gerarJson` | 514 ms, JSON válido com as chaves pedidas |
| tier forte (`gemini-2.5-pro` → gpt-oss medium) | 550 ms |
| saída longa (`maxOutputTokens: 32768`) | 3.874 ms, 4.902 tokens, 2.873 palavras, `finish=stop` |
| queda (provedor desligado) | HF 400 → Vertex serviu em 177 ms; Vertex chamado 1× (só na queda) |

Router direto (`python`, do VPS): Cerebras 0,37–0,49 s · JSON ✅ (gpt-oss e Qwen3.8) · 5.624 tokens em 3,56 s (~1.580 tok/s).
LiteLLM 1.103.4 (o do container `zaeon_litellm`, com os blocos novos num `Router` à parte): `zaeon-hf-flash` 0,98 s · `zaeon-hf-flash-groq` 0,35 s · `zaeon-hf-pro` 0,44 s, todos com JSON e o `model_id` `hf-*`; deployment com provedor desligado → fallback serviu.

## 4. Como funciona

- `LLM_PRIMARIO=hf` + `HF_TOKEN` → `hfPrimario()` (lib/llm/reservaHf). No envelope:
  1. HF primeiro, na lista do tier (`HF_PRIMARIO_MODELOS` / `HF_PRIMARIO_MODELOS_PRO`), `reasoning_effort` do `pensar` da fase.
  2. Todos falharam ou voltaram vazios → Vertex (como hoje: retry de 429, modelo aposentado → flash).
  3. Vertex também falhou → erro do Vertex (o HF **não** é tentado de novo no mesmo pedido).
- `gerarJsonStreamRes` (rascunho do chat) não abre o stream do Vertex com a flag: o HF responde pela chamada normal.
- Gateway: `apelidoNoGateway` troca `zaeon-flash`→`zaeon-hf-flash`, `zaeon-pro`→`zaeon-hf-pro`. Pool (`zaeon-pool-*`), Contabo (`zaeon-local-*`) e `vertex_ai/*` não mudam.
- Ledger: provedor `huggingface`, alvo `huggingface` (pago, preço do gpt-oss em `lib/ai/preco.ts`); no gateway o `model_info.id` `hf-*` vira alvo `huggingface`.
- Sem a flag: byte a byte o comportamento de antes (todos os testes antigos passam sem mudança).

## 5. Checklist do dono (NÃO aplicado em prod por este PR)

**`.env` do VPS (`/root/zaeon-os/.env`) — web, worker e gateway leem dele:**

```
LLM_PRIMARIO=hf                                                   # liga. Voltar = apagar a linha e recriar web/worker
HF_RESERVA_MODELOS=openai/gpt-oss-120b:cerebras,openai/gpt-oss-120b:groq   # tira o baseten (400 "provider disabled")
# opcionais (os defaults já são estes):
# HF_PRIMARIO_MODELOS=openai/gpt-oss-120b:cerebras,openai/gpt-oss-120b:groq
# HF_PRIMARIO_MODELOS_PRO=openai/gpt-oss-120b:cerebras,openai/gpt-oss-120b:groq   # ou zai-org/GLM-5.3:nebius,…
# HF_RESERVA_TIMEOUT_MS=45000                                     # teto por tentativa (primário e reserva)
```

`HF_TOKEN` já está lá (fine-grained, "Make calls to Inference Providers"). `HF_RESERVA=0` desliga o HF inteiro (primário e reserva) — kill switch único.

**Depois do merge + deploy:**
1. Recriar web e worker pelo deploy (memória: nunca recriar o web à mão — `gh run rerun` do deploy) com a env nova.
2. Gateway: recarregar o LiteLLM pra ler o `infra/litellm.config.yaml` novo (só importa pra camada autônoma).
3. Virtual keys: `node scripts/gateway-keys.mjs --ambiente prod` (o default agora inclui `zaeon-hf-flash,zaeon-hf-flash-groq,zaeon-hf-pro,zaeon-reserva-google`). Sem isso nada quebra: 403 → HF direto → Vertex.
4. Conferir nos logs do web/worker: some o "Vertex falhou — reserva Hugging Face serviu"; aparece "HF primário falhou … caindo para o Google" só quando o HF cair.

**No painel do HF (huggingface.co/settings/inference-providers), se quiser mais modelos:**
- Já basta pro default: **cerebras** + **groq** (ligados).
- Pra modelos maiores no tier forte: nebius/sambanova já ligados (GLM-5.3, Kimi-K3.1-Pro, DeepSeek-V4.1-Flash).
- Ligar **together / fireworks-ai / deepinfra / novita** só se for usar DeepSeek/Kimi/GLM/MiniMax mais baratos neles.
- Imagem/voz pelo HF (futuro): fal-ai ou replicate.

**Privacidade:** com a flag, a pergunta do aluno (e o histórico) vai pro provedor do HF por padrão, não só quando o Google cai — inverte a decisão de 22/10. Cerebras/Groq não treinam com dados de API, mas é terceiro fora do Google.

## 6. Fica pra depois

- Stream SSE do HF no rascunho do chat (a prévia parcial) — só se a falta dela aparecer; o HF já entrega a resposta inteira antes da 1ª palavra do Gemini.
- Migrar as rotas do #10 pro envelope (aí elas ganham o HF primário de graça).
- Tools OpenAI no envelope (#11) e o grounding → `web_search`.
- Embeddings no HF: exige re-embedar o pgvector e a L3.
