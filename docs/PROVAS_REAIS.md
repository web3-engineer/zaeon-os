# Provas reais dos motores — mock não é critério de pronto

**Regra (inquebrável).** Um teste com `fetch` mockado prova que o **nosso código monta o request certo** — **nunca** que o **serviço do outro lado responde**. Subir um motor/integração externa tendo "o teste mockado passou" como critério de pronto é uma abominação: o motor pode estar fora, com contrato trocado, com shape diferente, e o verde mente.

Mock é **parte** do critério (testa a lógica pura: allowlist, montagem do corpo, degradação). Mas **todo motor/serviço externo precisa também de uma PROVA REAL** — um smoke/sonda/live test que bate no serviço de verdade e confere a resposta — antes de ser considerado funcional.

Isto nasceu de dois casos reais:
- **REA** subiu com 100% dos testes mockados; ninguém nunca tinha provado o motor ponta a ponta por teste.
- **Forja** (gêmeo do REA) tinha o mesmo buraco — e foi exatamente onde o board do Pomodoro sumiu: a cadeia de dados "passava nos testes" (mockados) mas o comportamento real só foi verificado na mão.

## Como funciona a trava

1. **`config/provas-reais.json`** — o registro: cada motor/serviço externo, o cliente, o serviço, e a **prova real** (o arquivo que a roda).
2. **`scripts/provas-reais-check.mjs`** — roda no portão. **Reprova** se um motor **próprio** (`tipo: "proprio"`) está sem prova ou aponta pra uma prova que não existe no repo.
3. Serviços de **terceiro** (`tipo: "terceiro"`) podem ficar como `aceito` (débito declarado, prioridade menor) — mas ficam **visíveis** no registro, não escondidos.

## Quando você sobe um motor novo que fala com serviço externo

1. Escreva o cliente + os testes de unidade (mockados) — tudo bem, é a lógica pura.
2. **Escreva a prova real**: um `scripts/<motor>-smoke.mjs` (ou `*.smoke.test.ts`, ou uma sonda) que, dado o endereço/token do serviço, bate nele de verdade — `/health`, um comando golden cuja resposta você conhece, e (quando houver) a recusa de um caminho perigoso.
3. **Adicione a linha no `config/provas-reais.json`** com `tipo: "proprio"`, `status: "coberto"` e o caminho da prova. Sem isso, o portão reprova.
4. **Rode a prova contra o serviço real** antes de dizer "funciona". Se não dá pra rodar daqui (está na Contabo/Tailscale), rode do app server e cole o resultado.

## As provas reais de hoje

Padrão de smoke (todos aceitam o endereço/token por env e saem com código ≠ 0 na falha):

```bash
REA_BRIDGE_URL=... REA_BRIDGE_TOKEN=...       node scripts/rea-smoke.mjs        # REA (engenharia reversa)
FORJA_BRIDGE_URL=... FORJA_BRIDGE_TOKEN=...   node scripts/forja-smoke.mjs      # Forja (graphify)
QUALITY_ENGINE_URL=...                        node scripts/quality-smoke.mjs    # Termômetro
WA_OPERATOR_URL=... WA_OPERATOR_TOKEN=...     node scripts/chipflow-smoke.mjs   # wa-adapter (read-only, não cria chip)
```

Outros motores já cobertos por sondas/drivers/live tests: gateway LiteLLM (`scripts/gateway-sonda.mjs`, `scripts/provar-chaves.mjs`), modelos locais Contabo (`scripts/provar-papeis-locais.ts`), pentest (`scripts/pentest/recon.ts`), orquestra (`scripts/orquestra/arena.ts`), navegador remoto (`lib/agent/navegadorServidor.smoke.test.ts`), leitor (`lib/leitor/proxy-server.test.ts`). Ver o registro para a lista completa.
