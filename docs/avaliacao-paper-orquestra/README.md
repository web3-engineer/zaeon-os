# Avaliação do PaperOrchestra na Zaeon (nov/2026)

Três documentos gerados pelo pipeline (`lib/paper-orquestra`) comparados com versões escritas à mão com as MESMAS fontes.
Método, achados e limitações: `docs/PAPER_ORQUESTRA.md` §Avaliação.

| arquivo | o que é |
|---|---|
| `1-…`, `2-…`, `3-…` | os documentos da Zaeon (rodada 20) |
| `referencia-claude/` | as versões de referência (`*.corpo.md` = texto; `*.fontes.json` = as fontes incluídas, com citação ABNT) |
| `comparacao-*.md` | a comparação métrica por métrica (rodada 20: os três similares) |
| `biblioteca/*.json` | as consultas e os candidatos fixados (pra reproduzir) |

Reproduzir um caso (precisa das credenciais do Vertex no ambiente):

```bash
npx tsx scripts/paper-orquestra/gerar-local.ts revisao /tmp/aval docs/avaliacao-paper-orquestra/biblioteca/revisao.json
npx tsx scripts/paper-orquestra/comparar.ts /tmp/aval/revisao/zaeon.md docs/avaliacao-paper-orquestra/referencia-claude/revisao.corpo.md docs/avaliacao-paper-orquestra/referencia-claude/revisao.fontes.json /tmp/aval/ref.md /tmp/aval/comparacao.md
```
