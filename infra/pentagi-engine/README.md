# `infra/pentagi-engine` — motor isolado do pentest (Fase 2, recon-only)

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

## Limites honestos desta fase

- **Só recon read-only.** Nada de exploit, scan intrusivo ou mudança de estado. Emulação (ATT&CK) e alto-impacto-com-aprovação são a Fase 3.
- **Pin de IP:** para http o motor fixa a conexão no IP validado. Para **https com host DNS**, o pin de SNI é a Fase 2.1 — até lá, prefira alvos com host por IP literal, ou http, para não deixar janela de TOCTOU na conexão TLS.
- O `scope.json` real e as chaves **nunca** entram no git. Este diretório tem só código e o compose do range.
