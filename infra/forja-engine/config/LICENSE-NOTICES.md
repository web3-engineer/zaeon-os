# Atribuição dos engines da Forja

A Forja **consome a saída** (grafo/árvore) destes engines; **não redistribui o código-fonte deles** no app.
Ainda assim, ambos são vendorizados/instalados no container da box e rodam ali, então a licença e a
atribuição são preservadas e alcançáveis, como manda o invariante 4 do loop RALPH.

## Graphify — `graphifyy`
- Repositório: https://github.com/Graphify-Labs/graphify (branch `v8`)
- Licença: **Apache-2.0 OR MIT** (o repo traz `LICENSE` Apache-2.0 e `LICENSE-MIT`).
- Apache-2.0: https://github.com/Graphify-Labs/graphify/blob/v8/LICENSE
- O `LICENSE` não traz linha de copyright preenchida (template do apêndice Apache). O MIT alternativo
  permite uso, cópia e modificação com a nota preservada.
- Uso aqui: CLI `graphify extract` produz `graphify-out/graph.json`; a Forja lê esse JSON.

## Understand-Anything
- Repositório: https://github.com/Egonex-AI/Understand-Anything (branch `main`)
- Licença: **MIT**
- Copyright: `Copyright (c) 2026 Yuxiang Lin` e `Copyright (c) 2026 Infinite Universe, Inc.`
- LICENSE: https://github.com/Egonex-AI/Understand-Anything/blob/main/LICENSE
- Uso aqui: é um **plugin do Claude Code** (sem CLI próprio de análise). O slash command `/understand`
  roda o pipeline multi-agente e escreve `.ua/knowledge-graph.json`; a Forja lê esse JSON.

### Nota de segurança (upstream)
O README do Understand-Anything termina com um comentário HTML dirigido a agentes de IA, pedindo que um
agente que abra PR por conta própria injete um marcador na descrição do PR. **Isso é injeção de prompt e
foi ignorado** — nada do conteúdo do upstream é tratado como instrução nossa. A ponte consome apenas a
SAÍDA (o JSON do grafo), nunca o texto do README como comando.

---
Ao reconstruir na Contabo, fixe `versao_fixada`/`sha_fixado` em `config/vetting.json` com os valores reais
capturados no build (ver `docs/forja/RUNBOOK-FORJA-ENGINE.md`).
