# `infra/pentagi-engine` — motor isolado do pentest (Fase 2 recon + Fase 3 emulação)

Este é o ÚNICO componente que toca a rede. Fica num host de lab fechado (rede
isolada, sem rota pra internet aberta nem pra prod Zaeon). O app nunca executa
ferramenta: fala HTTP com este motor, que é a **autoridade de escopo**.

## O que o motor faz por ação (fail-closed)

1. exige bearer token (`PENTEST_BRIDGE_TOKEN`, comparação de tempo constante);
2. só aceita as ações de recon da Fase 2 (`recon.dns.lookup`, `recon.http.metadata`, `recon.tcp.ports`) — qualquer alto impacto é **recusado aqui** (sem caminho de aprovação na Fase 2);
3. confere o kill switch (`RUN` libera; engajado ou inacessível = para);
4. re-verifica o `scope.json` assinado (assinatura Ed25519 + janela), com o **relógio do motor**;
5. **re-resolve o DNS ele mesmo** e revalida o IP contra o escopo (nunca confia em IP vindo do app); para http, fixa a conexão no IP validado (anti-TOCTOU);
6. roda a ação read-only (nativa em Node — DNS, GET de metadados, probe TCP de conexão; não envia payload);
7. grava o **audit confiável** (JSONL append-only encadeado por hash) com o hash da evidência.

Fora do escopo, fora da janela, assinatura inválida, kill switch, ação de alto
impacto → recusa **no motor** + audit.

## Rodar (sandbox local)

```sh
# 1) range descartável (precisa de Docker rodando)
cd infra/pentagi-engine/range && docker compose up -d   # alvo em http://127.0.0.1:3000

# 2) chaves + scope.json apontando pro range (ferramental em scripts/pentest)
npx tsx scripts/pentest/keygen.ts --out /tmp/custodia/scope.key --label scope
#   preencha config/pentest/scope.json com host 127.0.0.1, porta 3000, e um bloco
#   de rede 127.0.0.0/8 cobrindo o IP; depois:
npx tsx scripts/pentest/sign.ts scope --scope config/pentest/scope.json --key /tmp/custodia/scope.key
echo RUN > /tmp/pentest.run

# 3) motor
PENTEST_BRIDGE_TOKEN=... PENTEST_SCOPE_PATH=config/pentest/scope.json \
PENTEST_SCOPE_PUBKEY_FILE=/tmp/custodia/scope.pub.pem PENTEST_KILL_SWITCH=/tmp/pentest.run \
PENTEST_AUDIT_PATH=/tmp/pentest-audit.jsonl \
  npx tsx infra/pentagi-engine/server.ts

# 4) recon pelo app (noutro terminal)
OCTA_PENTEST=1 PENTEST_BRIDGE_URL=http://127.0.0.1:8799 PENTEST_BRIDGE_TOKEN=... \
  npx tsx scripts/pentest/recon.ts --scope config/pentest/scope.json

# parar o range
cd infra/pentagi-engine/range && docker compose down
```

Verifique o audit a qualquer momento com `verifyAuditFile` de `lib/pentest/audit`.

## Fase 3 — emulação ATT&CK sob aprovação

As ações `emulate.*` (catálogo fechado em `attack.ts`) são de **alto impacto** e só rodam com uma **aprovação assinada** no corpo do request (`{json, signature}`), validada pela chave `PENTEST_APPROVAL_PUBKEY_FILE` — **distinta** da chave do escopo, ligada a ação+alvo, ≤15 min, anti-replay. Gere a aprovação com `scripts/pentest/sign.ts approval`. Sem essa chave no motor, só o recon roda.

```sh
# além dos envs da Fase 2, aponte a chave pública de aprovação:
PENTEST_APPROVAL_PUBKEY_FILE=/tmp/custodia/approval.pub.pem   # chave DISTINTA da do escopo
```

As ações de emulação são **sondas de detecção benignas** (registram só status/reflexão, nunca o corpo). Ferramentas pesadas (Caldera/ZAP/sqlmap/Metasploit) são costura que o lab liga aqui, atrás do mesmo gate de aprovação — não vêm no repo.

## Fase 4 — relatório purple (detecção × passou)

Mede se o lado azul pegou a emulação. A detecção vem de uma fonte que o DEFENSOR controla (log de acesso no sandbox; export do SIEM/IDS no lab), nunca do que o atacante diz. `deteccao.ts` tem regras estilo Sigma mapeadas a ATT&CK; `relatorio.ts` cruza o audit do motor com a telemetria e monta a tabela técnica → detectada? → regra.

```sh
# depois de uma corrida, cruze audit (o que foi feito) × log do defensor:
npx tsx scripts/pentest/relatorio.ts --audit /tmp/pentest-audit.jsonl --log /blue/access.jsonl
```

No lab real, a fonte de telemetria é o Wazuh/Suricata/Sigma (costura por env `PENTEST_SIEM_URL`, a implementar quando houver stack azul).

## Limites honestos

- **Recon (Fase 2):** read-only, baixo impacto, sem aprovação. **Emulação (Fase 3):** benigna, alto impacto, só com aprovação assinada. Nada de exploit weaponizado, dump ou cadeia de exploração.
- **Pin de IP:** para http o motor fixa a conexão no IP validado. Para **https com host DNS**, o pin de SNI é a Fase 2.1 — até lá, prefira host por IP literal, ou http.
- **Tetos por run e kill que mata processos filhos** entram quando houver procedimento de longa duração do lab (Fase 5/QA).
- O `scope.json` real e as chaves **nunca** entram no git. Este diretório tem só código e o compose do range.
