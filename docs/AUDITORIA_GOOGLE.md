# Auditoria: onde a Zaeon ainda depende do Google

Feita em 27/11/2026, a partir da `main` (commit 68adf246).

**Por quê:** o Martinez pediu para "tirar o Google da equação". Hoje o projeto do Google está sem faturamento: o `/api/studio/diag` devolve 403 ("requires billing to be enabled"). Então **tudo que chama o Google sem outra saída está fora do ar**.

**Como foi feita:** busca no código por `@google-cloud/vertexai`, `VertexAI`, `aiplatform.googleapis`, token do Vertex e `gemini-*`. Depois, para cada arquivo, conferimos se a chamada passa pelo envelope (`lib/llm/envelope`), que com `LLM_PRIMARIO=hf` vai primeiro ao Hugging Face, ou se vai **direto** ao Google.

## Resumo

| # | O que o aluno usa | Arquivos principais | Hoje | Gravidade |
|---|---|---|---|---|
| 1 | **Imagem** (chat e Studio) | `lib/studio/imagen.ts`, `lib/ai/gemini-image.ts`, `lib/ai/gemini-image-request.ts`, `app/api/studio/image/route.ts` | Só Google, sem reserva | ❌ fora do ar |
| 2 | **Voz do Studio**: narração, podcast, vídeo, aula narrada | `lib/voice/gemini-tts.ts`, `lib/studio/gemini-tts-request.ts`, `lib/studio/podcast-pipeline.ts`, `lib/studio/video-pipeline.ts`, `lib/videodoc/gerar-server.ts`, `lib/aula-interativa/narracao.ts` | Só Google | ❌ fora do ar |
| 3 | **Voz da Aura** (resposta falada) | `app/api/ai/voice/route.ts` | Google primeiro, Piper de reserva | ⚠️ funciona pela reserva, voz pior |
| 4 | Outras vozes: Zaeon no cyberespaço e no lounge 3D | `lib/cyber/vozZaeon.ts`, `app/api/lounge3d/[id]/zaeon/voz/route.ts` (sem o Piper de reserva: sem voz, o balão sai mudo) | Google | ❌ provável fora do ar |
| 5 | **Busca nos PDFs** (RAG) e memória longa do agente | `lib/rag/embed.ts` (gemini-embedding-001), `lib/agent/memory.ts` | Só Google | ❌ busca nova e upload novo falham. Trocar de modelo exige **reindexar** todos os PDFs |
| 6 | **Ler imagem e PDF escaneado** (visão) | `lib/ai/descreverImagem.ts`, `lib/ai/contextCache.ts` | Só Google | ❌ fora do ar |
| 7 | Textos que **pulam o HF** (vão direto ao Google) | ver lista abaixo | Só Google | ❌ essas telas falham |
| 8 | Chat da Aura | `app/api/ai/chat/route.ts` | Pelo envelope (HF primeiro). O caminho antigo direto ao Google só roda com `AURA_HARNESS=0` | ✅ ok |
| 9 | Textos pelo envelope (`geminiJson`, `geminiText`: ~30 lugares) | `lib/scholar/gemini.ts`, `lib/ai/gemini-text.ts` | HF primeiro, Google de reserva | ✅ ok. Se o HF falhar, a reserva (Google) também falha |

### Item 7: telas que chamam o Google direto, sem passar pelo HF

- `app/api/agentic/biosim/route.ts`, `codelab/route.ts`, `quantum/route.ts` (laboratórios agênticos)
- `app/api/ai/agent-search/route.ts` (busca do agente)
- `app/api/ai/generate-document/route.ts` (gerar documento)
- `app/api/ai/relate/route.ts` (relacionar; parte já usa o envelope)
- `app/api/onboarding-extract/route.ts` (onboarding)
- `app/api/research/chat/[researchId]/route.ts` (chat da pesquisa)
- `lib/aula-interativa/gerar.ts` (aula interativa: o padrão é `gerarJsonVertex`, direto)
- `lib/cyber/ia/motor.ts` (personagens do cyberespaço)
- `lib/scholar/suggest.ts` (sugestões)
- `lib/whatsapp/brain.ts` (Zaeon no WhatsApp) e `lib/whatsapp/voice.ts` (o texto das mensagens; este tem um texto fixo de reserva)
- `lib/ai/router.ts` (roteador antigo)
- `lib/avatars/gemini-image.ts` (imagem dos avatares)

**Scripts que rodam fora do site** (só quando alguém roda à mão): `scripts/avatars/gerar-saudacao.mjs`, `scripts/generate-voice-fillers.mjs`, `scripts/provar-chaves.mjs`.

**Só tipo, sem chamada:** `lib/agent/runtime.ts`, `lib/agent/tools.ts` e `lib/agent/mcp.ts` importam o *tipo* `FunctionDeclaration` do pacote do Vertex. Não chamam o Google, mas o pacote continua no projeto até isso mudar.

## Sugestão de ordem (cards)

1. **Imagem e voz** (itens 1, 2 e 4): é o que está visivelmente quebrado. Imagem por um modelo de imagem do Hugging Face (ex.: FLUX). Voz por uma opção sem Google (o Piper já existe como reserva da voz da Aura).
2. **Telas que pulam o HF** (item 7): trocar a chamada direta pelo envelope, que já sabe usar o HF. Costuma ser mudança pequena por arquivo.
3. **Visão** (item 6): ler imagem e PDF escaneado com um modelo de visão do HF.
4. **Busca nos PDFs** (item 5): o maior. Trocar o modelo de embedding muda os vetores, então todos os PDFs da base precisam ser indexados de novo. Precisa de plano com o Martinez (banco e servidor são área dele).
5. **Limpeza**: tirar o Google de reserva do envelope (item 9), o caminho antigo do chat (item 8), os scripts e o pacote `@google-cloud/vertexai`.

## Para o Martinez

- Provedor, custo e servidor são área dele. As trocas de provedor (imagem, voz, visão, embedding) precisam da escolha dele, e as chaves do HF são dele.
- O item 5 mexe no banco (reindexar a base). Precisa ser combinado antes.
