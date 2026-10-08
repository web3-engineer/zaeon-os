# Fatia 7 · Esteira leve: resultado e como ligar

> Executada em 2026-10-08 a partir de `docs/EXECUTOR_PROMPT_FATIA7_ESTEIRA_LEVE.md`.
> São 6 PRs empilhados, mergeados nesta ordem: **#290 (G3) → #291 (G4) → #292 (G5a) → #294 (G6) → #295 (G5b) → #296 (G8)**.
> O merge não muda comportamento: sem as flags e as keys, nenhuma chore existe e o gateway continua só-Vertex.

## O que entrou

| PR | O que faz |
|---|---|
| **G3**: pool no gateway | Grupos `zaeon-pool-lite` (Gemini Flash-Lite, AI Studio), `-cf` (Cloudflare) e `-groq` (Groq) no LiteLLM, com fallback só entre provedores grátis. O envelope grava `alvo`/`jsonValido` no ledger e **nunca** manda modelo do pool pro Vertex. Custo do pool = 0 pelo alvo. Imagem do LiteLLM fixada em `v1.103.4`. |
| **G4**: espera, não erro | Pool esgotado vira `PoolEsgotadoError` e a fila adia o job (backoff nosso, teto de 30min), que expira em 24h. Nada aparece no canal; só o humano que pediu recebe 1 linha quando a chore expira. |
| **G5a**: AgentChore (C8) | 9 tools fechadas. Plano fixado na criação (destino/tipo); fase **ler** (Leitor) separada da fase **agir** (Executor). `diff_check` antes de qualquer LLM. Freio de 90s / 30s / ≤3 LLM. Fila `agent-chores`. Web → pool; anexo e canal → Vertex. |
| **G6**: Leitor | Container `leitor-proxy` **sem credencial nenhuma**:<br>• allowlist default-deny;<br>• DNS resolvido no proxy;<br>• bloqueia IP privado e a metadata `169.254.169.254`;<br>• conecta pelo IP (fecha DNS-rebinding);<br>• redirect só no mesmo host;<br>• corta em 1 MB e em 15s.<br>`/api/health` ganha `leitor` e `pool`. Texto de agente nunca vira `<img>`. |
| **G5b**: entrada | `@aura resume <link>` no canal vira chore (1 resposta curta com "Fonte: … · lido às HH:MM"). Rotas `POST /api/canal/[id]/chore` e `/api/admin/chores`. |
| **G8**: painel POOL | No admin → Agents: tabela por provedor (chamadas, 429, esgotado, cooldown, JSON válido, p95, custo), chores por tipo e o chip **"custo R$ 0 comprovado"**. Scripts `conferir-pool.mjs` e `gateway-sonda.mjs`. |

## Desvios do prompt (conscientes)

- **As Fatias 2 e 3 não estavam no `main`.** O prompt pede as duas antes desta.
  - `enqueue_task` existe, mas responde `skill_offline` até chegar o C1 (`criarTarefa`).
  - O post da chore vai pra **raiz** do canal: a `CanalMensagem` ainda não tem `parentId`. O `destino.parentId` fica gravado na chore.
  - A triagem entrou só como o ramo chore (`lib/chore/triagem.ts`), puro e conservador.
  - Os workers `agent-tasks` e `programa-ciclo` ainda não existem: a adoção do G4 neles é de 1 linha (`aplicarDecisao`) quando chegarem.
- **jobId do BullMQ.** O formato do contrato (`chore:<tipo>:<hash>:<dia>`) é recusado pelo BullMQ 5 (`:` fora do padrão de 3 partes). O banco guarda o contrato e a fila usa `bullJobId()` (`:`→`_`).
- **`conferenciaProvedor`** (headers do Groq) não entrou: o ledger não guarda headers. O painel mostra o que o ledger prova (429, cooldown, esgotado).
- **CSP global** fica fora (§5.7). A proibição de imagem remota é por construção.

## Como ligar em produção (ordem; o dono executa no VPS)

> Segredos **só** no `.env` do VPS. Nunca no chat nem no git.

**1. Contas e keys (uma por provedor, §8.11):**
- **Google AI Studio** com uma **conta Google dedicada** (nunca a do negócio, que guarda o crédito GenAI, o Vertex e o OAuth): `aistudio.google.com` → *Get API key* → `GEMINI_FREE_API_KEY`.
- **Cloudflare**: painel → *Workers AI* → copiar o **Account ID** (`CLOUDFLARE_ACCOUNT_ID`) → *Use REST API* → criar o token "Workers AI" → `CLOUDFLARE_API_KEY`.
- **Groq**: `console.groq.com` → *API Keys* → `GROQ_API_KEY`.
- Colar as 4 linhas no `.env` com `nano .env`.

**2. Segredos do gateway**, gerados no próprio VPS sem imprimir na tela:
```bash
cd /root/zaeon-os
PW=$(openssl rand -hex 16)
{ echo "GATEWAY_MASTER_KEY=sk-$(openssl rand -hex 24)"; echo "LITELLM_PG_PASSWORD=$PW"; echo "LITELLM_DATABASE_URL=postgresql://litellm:$PW@litellm-db:5432/litellm"; echo "LITELLM_SALT_KEY=sk-$(openssl rand -hex 24)"; } >> .env
```

**3. Subir o gateway:**
```bash
docker compose -f docker-compose.beta.yml --profile gateway up -d litellm-db litellm
```

**4. Provas de vida.** O `web` só lê o `.env` novo depois de recriado:
```bash
docker compose -f docker-compose.beta.yml up -d --force-recreate --no-deps web
```
- **Keys, direto nos provedores:** `docker compose -f docker-compose.beta.yml exec -T web node scripts/provar-chaves.mjs gemini cloudflare groq`. As 3 linhas têm de dar `APTO`.
- **Pool, pelo gateway:** `docker compose -f docker-compose.beta.yml exec -T -e GATEWAY_URL=http://litellm:4000 web node scripts/gateway-sonda.mjs`. Deve mostrar `alvo=gemini-free`.
- **Fallback:** troque a `GEMINI_FREE_API_KEY` por um valor inválido, recrie o `litellm` e rode a sonda de novo. Deve mostrar `alvo=cloudflare`.

**5. Key do agente com o pool liberado:**
```bash
docker compose -f docker-compose.beta.yml exec -T -e GATEWAY_URL=http://litellm:4000 web node scripts/gateway-keys.mjs --pool aura --ambiente prod
```
Cole a `GATEWAY_KEY_AURA=…` que o script imprimir no `.env`. Sem isso, o envelope usa a `GATEWAY_MASTER_KEY`, que também funciona, mas sem teto por agente.

**6. Leitor:** no `.env`, `LEITOR_ALLOW="*.gov.br,*.edu.br,*.scielo.br,pubmed.ncbi.nlm.nih.gov,arxiv.org,doi.org,who.int,*.wikipedia.org"` (ajuste à vontade) e `LEITOR_PROXY_URL=http://leitor-proxy:8787`. Depois:
```bash
docker compose -f docker-compose.beta.yml --profile chores up -d leitor-proxy
```

**7. Ligar as chores (por último).** No `.env`, `GATEWAY_URL=http://litellm:4000`, `CHORES_WORKER=1` e `CHORES_QUEUE=1`. Depois, redeploy (Actions → Deploy).
- Com `CHORES_QUEUE=1`, o deploy sobe o `leitor-proxy` sozinho.
- `GATEWAY_URL` também passa o turno do canal pelo gateway (Vertex via LiteLLM, que cai pro Vertex direto se o gateway cair). Pesquisa, estudos, mentores e voz não mudam.

**8. Conferir:**
- `/api/health` → `gateway:"on"`, `leitor:"on"`, `pool:["gemini-free","cloudflare","groq"]`.
- No escritório, `@aura resume https://www.gov.br/saude/pt-br` → 1 resposta curta com "Fonte: … · lido às HH:MM".
- Admin → Agents → bloco **Pool grátis**: linha `gemini-free` e chip verde **custo R$ 0 comprovado**.

**Rollback:**
- `CHORES_QUEUE=""` + redeploy: nenhuma chore nova; as `delayed` expiram sozinhas em 24h.
- `LEITOR_PROXY_URL=""`: Leitor fora do ar (lei 5).
- `GATEWAY_URL=""`: tudo volta ao Vertex direto.

## Gates (rodar no VPS e preencher aqui)

- **G3:** sonda nos 2 estados (`gemini-free` → `cloudflare`); ledger com `alvo` certo.
- **G4:** invalidar as 3 keys por 2min e rodar `npx tsx scripts/gateway-sonda.mjs --como-job` → `adiar até …`. Nenhuma mensagem no canal.
- **G5:** `resumir_link`, `checar_pagina` 2× (a 2ª `skipped`, 0 LLM), `extrair_campos`, `link_rot`, `formatar_abnt` via `POST /api/admin/chores` (use `rodada` pra re-checar).
- **G6:** `docker compose -f docker-compose.beta.yml exec -T web node -e "fetch('http://leitor-proxy:8787/fetch',{method:'POST',body:JSON.stringify({url:'http://169.254.169.254/latest/meta-data/'})}).then(r=>r.text()).then(console.log)"` → `ip_literal`. `docker inspect zaeon_leitor_proxy` → `Env` sem nenhuma key.
- **G8:** `node scripts/conferir-pool.mjs --url https://zaeon.com.br --cookie "<sessão admin>"` → diferença 0. `npx tsx scripts/gateway-sonda.mjs --agente aura --via-envelope` → 3× `BATE`.

## Medidas (handoff §9), 48h após ligar

- JSON válido % por alvo (primário < 90% → promover o fallback);
- taxa de 429 e minutos de cooldown por alvo;
- tokens por chamada de chore p50/p95 vs 8K TPM do Groq;
- p95 de latência por alvo;
- nº de chores `skipped` (saudável: a maioria);
- **custo do pool = 0** e **vazamentos = 0**.

## Não verificado nesta máquina

- O **LiteLLM de verdade** com as keys do pool: o Docker local não respondeu e o disco tinha 3 GB livres. A config é pinada por teste (`lib/llm/litellm-config.test.ts`), e a sonda e o fallback ficam pro gate no VPS.
- **Build da imagem** do `leitor-proxy`: pelo mesmo motivo. O `server.mjs` rodou direto no Node: leu `arxiv.org` de verdade e recusou metadata e domínio fora da lista.
- **Mongo/Vertex reais** para chores ponta a ponta: tudo coberto com Prisma falso e envelope mockado.
