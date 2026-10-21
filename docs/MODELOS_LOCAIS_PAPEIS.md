# Modelos da Contabo nos papéis do chat (lib/llm/papeis)

Os modelos da Contabo (CPU, sem GPU) fazem o trabalho em que **ninguém espera a resposta**. A resposta
que o aluno vê em streaming continua no Google (Vertex global + gemini-3.5-flash).

| papel | modelo local (gateway) | onde roda | fallback Google | flag (`0` desliga) |
|---|---|---|---|---|
| `guarda` | `zaeon-local-guard` (llama-guard3 8B) | `runChatTurn` → `lib/llm/guarda.auditarEntrada`, **depois** do turno (auditoria; nunca bloqueia) | 3.5-flash-lite → flash (mesma taxonomia S1–S14) | `LOCAL_GUARDA` |
| `curto` | `zaeon-local-geral` (gpt-oss-20b, `reasoning_effort: low`) — troca por `LOCAL_CURTO_MODELO` | gatekeeper do cérebro (`lib/map/gatekeeper`, zona cinzenta: estudável + título) e juiz da árvore (`lib/skilltree/assess`) — os dois fire-and-forget | `GEMINI_MODEL` (flash), o que eles já usavam | `LOCAL_CURTO` |

## Medido pelo gateway da VPS (2026-10-21, de dentro do `zaeon_web`)

| modelo | frio (1ª) | quente (2ª) | obs. |
|---|---|---|---|
| llama-guard3 (`safe`, prompt 216 tok) | TTFT 51,7 s | **0,6–0,8 s total** | 2 tokens de saída |
| gpt-oss-20b, gatekeeper JSON, effort low | 120,8 s | **17,0 s** | 48 car. pensando + 41 tok; JSON certo |
| gpt-oss-20b, juiz JSON, effort low | — | **16,8–23,2 s** | 139 car. pensando + 80 tok; score 0,9 |
| gpt-oss-20b, texto livre (200 tok) | TTFT 112 s, 142 s | TTFT 0,9 s, 36 s | 5,2–5,7 tok/s |
| qwen3:4b (thinking-2507) | TTFT 25 s | 10,6 s p/ 60 tok, **só pensamento** | 700 tok sem JSON em 133–175 s com think:false / reasoning_effort none / nada |

**qwen3 4B ficou fora:** o `qwen3:4b` do Ollama é o build thinking-2507 (contexto 262k), que pensa sempre.
Puxar `qwen3:4b-instruct-2507` na Contabo e setar `LOCAL_CURTO_MODELO=zaeon-local-mini` resolve sem deploy.

**Memória da Contabo:** Ollama com `mem_limit 42g`, `MAX_LOADED_MODELS=3`, `KEEP_ALIVE=30m` (o 24h do gpt-oss no
litellm-config não vale na prática: `ollama ps` mostra 30 min). Com o qwen3-coder do Octa (18 GB) carregado, os
outros são despejados → frio é comum. Por isso os tetos (guard 90 s, curto 150 s) e `maxEmVoo` 2/1.

**Fora do caminho crítico de propósito:** `classify` (intenção, antes de cada turno, teto 8 s), `planQuery`
(12 s), plan/reason do harness (15 s). Mesmo o melhor quente do gpt-oss (17 s) não cabe; e com NUM_PARALLEL=1
um timeout deixa o request rodando no Ollama e enfileira o próximo. Consolidação de memória não existe como
chamada de LLM (é verbatim + embedding), então não há tarefa longa de bastidor no chat pra dar ao gpt-oss.

## Como funciona

- `gerarPapel(papel, req)` tenta o grupo `zaeon-local-*` no gateway da VPS com a key `GATEWAY_KEY_LOCAL`
  (ou `GATEWAY_MASTER_KEY`). Erro, timeout, resposta vazia/ilegível, flag desligada ou papel ocupado
  (`maxEmVoo` por processo) → o MESMO pedido no Vertex com um modelo de verdade.
- O envelope não cai mais no Vertex com o nome `zaeon-local-*` (ele não existe lá): relança e o papel escolhe.
- Ledger (TokenLedger): a tentativa local grava `alvo: "contabo"` (custo 0); o fallback grava `alvo: "vertex"`.
  `phase` = `guarda` | `gatekeeper` | `assess`.
- Desligar sem build: `LOCAL_GUARDA=0` / `LOCAL_CURTO=0` no `.env` da VPS + `docker compose up -d web`.

## Provar em produção

```
docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --medir
docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --papeis
docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --papeis --forcar-falha
```

`--medir` dá TTFT / total / tok/s por modelo (2 chamadas, a 1ª pode ser fria); `--papeis` chama as funções
reais e relê as linhas do ledger; `--forcar-falha` troca a key local por uma inválida → todas em `alvo=vertex`.
