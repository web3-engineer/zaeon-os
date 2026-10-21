# Modelos da Contabo nos papéis do chat (lib/llm/papeis)

Os modelos da Contabo (CPU, sem GPU) fazem o trabalho em que **ninguém espera a resposta**. A resposta
que o aluno vê em streaming continua no Google (Vertex global + gemini-3.5-flash).

| papel | modelo local (gateway) | onde roda | fallback Google | flag (`0` desliga) |
|---|---|---|---|---|
| `guarda` | `zaeon-local-guard` (llama-guard3 8B) | `runChatTurn` → `lib/llm/guarda.auditarEntrada`, **depois** do turno (auditoria; nunca bloqueia) | 3.5-flash-lite → flash (mesma taxonomia S1–S14) | `LOCAL_GUARDA` |
| `mini` | `zaeon-local-mini` (qwen3 4B, `/no_think`) | gatekeeper do cérebro (`lib/map/gatekeeper`, zona cinzenta: estudável + título) e juiz da árvore (`lib/skilltree/assess`) — os dois fire-and-forget | `GEMINI_MODEL` (flash), o que eles já usavam | `LOCAL_MINI` |

**gpt-oss-20b (`zaeon-local-geral`) ficou sem papel aqui.** Mapeado o chat, a Pesquisa e os Estudos: não
existe tarefa longa sem alguém olhando (consolidação de memória é verbatim + embedding, sem LLM; TCC, cérebro
e Scholar mostram progresso ao aluno). A ~6 tok/s todas passariam do que o aluno espera. Candidato natural
fora deste escopo: as chores do Escritório (fila, conteúdo público).

**Fora de propósito do caminho crítico:** `classify` (intenção, antes de cada turno, teto 8 s), `planQuery`
(12 s), plan/reason do harness (15 s). Com NUM_PARALLEL=1, um timeout no meio do turno deixa o request
rodando no Ollama e enfileira o próximo — mesmo se o warm couber, o pior caso não cabe.

## Como funciona

- `gerarPapel(papel, req)` tenta o grupo `zaeon-local-*` no gateway da VPS com a key `GATEWAY_KEY_LOCAL`
  (ou `GATEWAY_MASTER_KEY`). Erro, timeout, resposta vazia/ilegível, flag desligada ou papel ocupado
  (`maxEmVoo` por processo) → o MESMO pedido no Vertex com um modelo de verdade.
- O envelope não cai mais no Vertex com o nome `zaeon-local-*` (ele não existe lá): relança e o papel escolhe.
- Ledger (TokenLedger): a tentativa local grava `alvo: "contabo"` (custo 0); o fallback grava `alvo: "vertex"`.
  `phase` = `guarda` | `gatekeeper` | `assess`.
- Desligar sem build: `LOCAL_GUARDA=0` / `LOCAL_MINI=0` no `.env` da VPS + `docker compose up -d web`.

## Provar em produção

```
docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --medir
docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --papeis
docker exec zaeon_web npx tsx scripts/provar-papeis-locais.ts --papeis --forcar-falha
```

`--medir` dá TTFT / total / tok/s por modelo (2 chamadas, a 1ª pode ser fria); `--papeis` chama as funções
reais e relê as linhas do ledger; `--forcar-falha` troca a key local por uma inválida → todas em `alvo=vertex`.
