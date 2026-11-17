# REA (Reverse Engineer Anything) no Octa

Engenharia reversa dentro do Octa, a partir do `morluto/rea` (MIT) — "uma MCP pra engenharia reversa de binários, aplicações e comportamento em runtime".

Segue o MESMO modelo do Appllama no Octa: a **skill** (metodologia) é vendorizada; o **MCP** (o motor pesado) é portão do dono.

## O que entrou (fatia 1 — PR #…)
- `vendor/skills/reverse-engineer-anything/` — a skill do REA, SÓ markdown (SKILL.md + references/ + DISCLAIMER + LICENSE), pinada por SHA (`rea-agents-6.9.0`, tarball npm sha1 `d48047b6…`) em `config/vetting/repos.json`. Scripts, código nativo e `install.sh` do REA **não** foram vendorizados.
- Atrás de **`OCTA_REA=1`** (portão do dono): sem a flag, a skill nem entra em `octaSkills()`. Engenharia reversa é dual-use.
- Progressive disclosure, como as outras skills do Octa: só nome+descrição no prompt; a metodologia sai via `activate_skill`. Instalar a skill **não** registra o MCP nem instala motor de análise.

## Uso lícito (DISCLAIMER do REA, preservado 1:1)
Pesquisa de segurança, análise de malware, pesquisa de vulnerabilidade e divulgação coordenada, CTF e educação, interoperabilidade, preservação de software, e auditar/depurar software que você **possui ou está autorizado** a examinar.

O REA (e, portanto, o Octa com a skill) **não** ajuda a: burlar DRM/verificação de licença/anti-cheat/medidas de proteção; criar cheats; burlar autenticação/controle de acesso em sistemas sem autorização; copiar software proprietário. Esses pedidos são recusados — o guard do Octa (deny-by-default) fica por cima.

## Fatia 3 — o motor (na Contabo)
`infra/rea-engine/` — imagem `zaeon-rea-engine` (node:22 + JDK 21 + **Ghidra 12.1.4** + binwalk/unblob + `rea-agents@6.9.0` (skill v62, ~255 tools)) e a **ponte** `bridge.mjs` (HTTP → CLI do REA), publicada SÓ na Tailscale (`100.113.137.74:8799`), token obrigatório.
- A ponte deriva os comandos do próprio `rea --help` no boot e **nega** as famílias com efeito colateral (frida/spawn/attach/launch/instrument/interact/run-/extract-/environment-/agent-env/capture-/observe-/trace/debug-/adb/push-/pull-/import-/setup/update/annotate-/execute-/cutter-). A análise estática/leitura passa 1:1.
- Subir/atualizar: ver o runbook **"Atualizar o motor na Contabo"** abaixo (o motor já está no ar; atualizar é rebuild-no-lugar). Artefato analisado vai no corpo (base64), escrito num tmp e apagado; nada de caminho do host.

## Fatia 2 — a ponte no Octa
`lib/octa/rea.ts` (cliente) + tool `octa_rea` em `lib/octa/agente.ts`. Só aparece com os **dois** portões: `OCTA_REA=1` **e** `REA_BRIDGE_URL`+`REA_BRIDGE_TOKEN`. Mesmo deny-por-família do bridge (defesa em profundidade); o guard do Octa fica por cima. A tool lê um arquivo do projeto como artefato (texto) e devolve a Evidence do REA.
- Envs no `.env` da VPS: `OCTA_REA=1`, `REA_BRIDGE_URL=http://100.113.137.74:8799`, `REA_BRIDGE_TOKEN=…` (o mesmo da Contabo).

## Upload de binário (feito)
- Botão 🔬 na IDE do Octa (atrás de `NEXT_PUBLIC_OCTA_REA=1`) → `POST /api/octa/rea/upload` → o binário vai DIRETO pro motor na Contabo (nunca fica na Zaeon nem no Mongo), que devolve um **handle** (`/upload` da ponte, cache transitório, TTL 2 h). O agente analisa com `octa_rea` passando o handle. Provado em prod: `analyze --provider ghidra` pelo handle = ok, decompilação nativa com Ghidra 12.1.4.
- Envs da UI: `NEXT_PUBLIC_OCTA_REA=1` (flag de build). Runtime: `OCTA_REA=1` + `REA_BRIDGE_URL`/`TOKEN`.

## Atualizar o motor na Contabo (runbook)

### A box
- **Host:** Contabo `95.111.241.175` (Tailscale `100.113.137.74`, hostname `vmi3190478`). Mesma box dos modelos (`zaeon-models`, núcleos 4–17).
- **INQUILINO A PROTEGER:** o projeto Docker `zenith-adapter` (chipflow) nos núcleos 0–3. **NUNCA** rode Docker global aqui (`docker compose down` sem `-p`, `docker system prune -a`, `docker stop $(docker ps -q)`): mataria o adapter. Todo comando é **escopado** (`-p rea-engine -f …`).
- O motor já roda em produção: container `zaeon_rea_engine`, imagem `zaeon-rea-engine:local`, só na Tailscale (`100.113.137.74:8799`). Atualizar = **rebuild-no-lugar**, não primeira instalação.

### 1. Ache a pasta de origem e REUSE o token
A pasta é **`/home/zaeon/rea-engine/`** (layout PLANO: `Dockerfile`, `compose.yml`, `bridge.mjs`, `audit-denylist.mjs` direto nela — NÃO sob `infra/rea-engine/`). Confirme a box e a pasta:
```bash
ip -4 addr | grep -o '100\.113\.137\.74' || echo 'BOX ERRADA — pare'
find / -path '*rea-engine*' -name Dockerfile 2>/dev/null   # → /home/zaeon/rea-engine/Dockerfile
docker inspect zaeon_rea_engine --format 'img={{.Config.Image}} workdir={{.Config.WorkingDir}}'
```
O token da ponte (`REA_BRIDGE_TOKEN`) **tem de ser o mesmo** que o `.env` da VPS do app usa — **não gere outro**, senão o app para. Se precisar do valor atual, leia do container (fica na sua tela, não vai pra lugar nenhum):
```bash
docker inspect zaeon_rea_engine --format '{{range .Config.Env}}{{println .}}{{end}}' | grep REA_BRIDGE_TOKEN
```

### 2. Atualize os arquivos (a box NÃO tem o repo — são arquivos soltos)
Backup e os três ajustes que importam, de `/home/zaeon/rea-engine`:
```bash
cd /home/zaeon/rea-engine
cp Dockerfile Dockerfile.bak; cp compose.yml compose.yml.bak; cp bridge.mjs bridge.mjs.bak
sed -i 's/ARG REA_VERSION=6\.5\.0/ARG REA_VERSION=6.9.0/' Dockerfile
sed -i 's/REA_VERSION: "6\.5\.0"/REA_VERSION: "6.9.0"/' compose.yml
# deny-list idempotente (só age se ainda não tiver "frida"), idêntica à de lib/octa/rea.ts:
grep -q '"frida"' bridge.mjs || sed -i 's/\["capture-", "observe-/["frida", "spawn", "attach", "launch", "instrument", "interact", "run-", "extract-", "environment-", "agent-env", "capture-", "observe-/' bridge.mjs
grep 'ARG REA_VERSION' Dockerfile; grep 'REA_VERSION:' compose.yml; grep -c '"frida"' bridge.mjs
```
Garanta o token no `.env` ao lado (o MESMO do passo 1 — não gere outro):
```bash
test -f .env && grep -q REA_BRIDGE_TOKEN .env && echo "OK" || echo "crie: printf 'REA_BRIDGE_TOKEN=%s\n' '<token do inspect>' > .env"
```

### 3. Rebuild + up, SEMPRE escopado
```bash
cd /home/zaeon/rea-engine
docker compose -p rea-engine -f compose.yml build rea-engine   # sem --no-cache: reaproveita Ghidra/JDK, refaz só a camada do rea-agents
docker rm -f zaeon_rea_engine                                  # o antigo subiu por `docker run`: remova-o pelo NOME (seguro) antes do up
docker compose -p rea-engine -f compose.yml up -d rea-engine
```
> O build precisa de internet (npm + Ghidra/JADX já em cache). Buildar ANTES do `rm` deixa o antigo servindo durante o build; a troca é de segundos.

### 4. Verifique
```bash
docker exec zaeon_rea_engine rea --version          # 6.9.0
curl -s http://100.113.137.74:8799/health            # { ok, rea, ghidra }
```
Auditoria da deny-list — inline (o `audit-denylist.mjs` do repo não está nessa box; cruza o catálogo real do 6.9 com a deny-list):
```bash
docker exec zaeon_rea_engine rea --help | node -e 'const deny=["frida","spawn","attach","launch","instrument","interact","run-","extract-","environment-","agent-env","capture-","observe-","trace","debug-","start-adb","stop-adb","push-","pull-","read-adb","resolve-adb","inspect-adb","uninstall","collect-adb","import-","open-jeb","execute-","cutter-","annotate-","decompile-jeb","inspect-jeb","discover-webmcp","reconcile-javascript-runtime"];const ex=new Set(["setup","update","completions","evidence-import"]);const dg=["capture","observe","trace","debug","adb","spawn","attach","launch","instrument","interact","frida","exec","push","pull","install","write","delete","remove","start","stop","record","hook","annotate","patch","inject","upload","download","extract","mount","run","reset","send","kill"];let t="";process.stdin.on("data",d=>t+=d).on("end",()=>{const cat=[...t.matchAll(/^\s{2,}([a-z][a-z0-9-]+)\s{2,}/gm)].map(m=>m[1]);const ok=cat.filter(c=>!ex.has(c)&&!deny.some(p=>c.startsWith(p)));const s=ok.filter(c=>dg.some(w=>c.includes(w)));console.log("catálogo:",cat.length,"| liberados:",ok.length);console.log(s.length?"⚠️ suspeitos liberados:\n  "+s.join("\n  "):"✅ nenhum suspeito liberado");});'
```
Suspeito listado → acrescente o prefixo em `DENY_PREFIXOS` (bridge.mjs na box E `lib/octa/rea.ts` no repo) e reconstrua.
```
No Octa (com `OCTA_REA=1` + `REA_BRIDGE_URL/TOKEN`), peça uma análise de um alvo novo do 6.9 (EVM/WASM/Rust) e confira que a Evidence volta.

### 5. Rollback
Os `.bak` do passo 2 preservam os arquivos 6.5.0. Se o 6.9 der problema: `cp Dockerfile.bak Dockerfile; cp compose.yml.bak compose.yml; cp bridge.mjs.bak bridge.mjs`, depois `build` + `rm -f zaeon_rea_engine` + `up -d` de novo (escopado). A imagem 6.9 nova não apaga a anterior; a antiga fica como `<none>` até um `prune` **escopado** (`docker image prune` sem `-a`, nunca o global). Nunca `prune -a`/`down` sem `-p`.

## Análise WEB (`analyze-web-bundle <url>`) — o navegador do motor

O comando do REA não recebe URL: exige um Chromium com CDP no loopback (`<endpoint> <targetId>`). O app manda só a URL
(`lib/rea-blueprint/alvoReal.ts`), e a ponte resolve isso em `infra/rea-engine/web-bundle.mjs`:

1. valida a URL (http/https, sem credenciais, porta 80/443, host que não é interno);
2. abre um **proxy de saída** no loopback que resolve o DNS ele mesmo e só conecta em **IP público** nas portas 80/443 —
   barra RFC1918, loopback, link-local/metadata (169.254), **CGNAT 100.64/10 (a tailnet)**, ULA (fd7a:… da tailnet) e
   resposta de DNS mista (rebinding);
3. sobe um Chromium headless por pedido (`--proxy-server` + `--proxy-bypass-list=<-loopback>`, WebRTC sem UDP fora do
   proxy, CDP só no 127.0.0.1), carrega a página e espera ela assentar;
4. roda `rea analyze-web-bundle` com `--fetch-source-maps`; o fetch dos source maps do PRÓPRIO REA também vai pelo proxy
   (`NODE_USE_ENV_PROXY=1` + `HTTPS_PROXY`);
5. mata o navegador e apaga o perfil. **Um pedido web por vez** (429 `web_busy`): o motor divide os núcleos 0–3 com a ChipFlow.

Corpo: `{ command: "analyze-web-bundle", args: [url], view?: "endpoints" | "inferences" | "summary" }` → `{ ok, evidence,
pagina, bloqueados }` (`bloqueados` = o que o proxy barrou). Qualquer `args` apontando pro loopback do motor é recusado.

Orçamento (env do container): `REA_WEB_SCRIPT_MS` (420000), `REA_WEB_TOTAL_MS` (840000), `REA_WEB_HEAP_MB` (3072). Um SPA
Vite costuma ser UM bundle de vários MB — o analisador semântico do REA leva minutos nele.

**Respostas longas:** o `fetch` do Node (undici) corta em 5 min se os cabeçalhos não chegam (`headersTimeout`), mesmo com
`AbortSignal` maior. A ponte manda os cabeçalhos na hora e um espaço a cada 25 s até o JSON final (`/rea`, `/android`,
web) — erro depois disso vai no corpo (`{ ok: false, erro }`, status 200). O app espera 18 min na análise web
(`prazoDoComando` em `lib/octa/rea.ts`).

**Processos do REA:** o `rea` solta o worker de análise numa sessão própria (vira filho do PID 1); matar só o grupo do
`rea` deixava o worker rodando por 10+ min nos núcleos da ChipFlow. Cada job leva `REA_JOB=<id>` no ambiente e a ponte
varre o `/proc` por ele ao cancelar/estourar/terminar. O compose usa `init: true` (tini como PID 1) pra recolher os
zumbis do Chromium. Prazo por pedido no `/rea` estático: `prazoMin` (1–30; padrão `REA_CMD_TIMEOUT_MS` = 10 min).

Provar (na Contabo): `node scripts/rea-smoke.mjs --url https://zaeon.com.br/` com `OCTA_REA=1 REA_BRIDGE_URL REA_BRIDGE_TOKEN`
no ambiente. Medido em 17/11/2026: zaeon.com.br 226 s, 42/42 scripts, 42 endpoints.

## Sessões do REA (modo rea.tools) + domínios declarados

O REA rende quando o agente faz PERGUNTAS PEQUENAS numa sessão que lembra o alvo — não numa chamada de CLI "analise
tudo", que num bundle de vários MB estoura memória/prazo (provado: Contabo E um M1, ~29 min, provider_timeout). Então o
motor roda um `rea mcp` VIVO por sessão (infra/rea-engine/sessoes.mjs), como o REA local.

**Ponte:** `POST /sessao {dono, dominios?}` → `{sessao, ferramentas}`; `POST /sessao/ferramenta {sessao, nome, argumentos,
salvar?}` (resposta longa); `POST /sessao/fechar`. `dono` = sha256 da conta (o motor nunca vê o id). No app:
`abrirSessaoRea/chamarSessaoRea/fecharSessaoRea` (lib/octa/rea.ts) e a tool `octa_rea_sessao`.

**Três níveis de ferramenta (infra/rea-engine/politica.mjs, conferidos contra o catálogo real nos testes):**
- *estática* (livre): open_binary, search_strings, analyze_javascript_application, recover_javascript_sources,
  inspect_analysis_view… Caminhos presos na pasta da sessão; artefato enviado = `handle://<32hex>`.
- *web* (só com domínio declarado): inspect_web_page, observe_web_session, capture_browser_scenario, analyze_web_bundle…
  O navegador é SEMPRE o da sessão (atrás do proxy de saída); `cdp_endpoint`, `allowed_origins` e a URL ficam dentro dos
  domínios.
- *negada* (nenhum termo libera): adb, frida, gdb/rizin, cutter, jeb, build-computer, processos/UI nativos, Electron/Node
  locais — mexem no HOST, não no alvo.

**Pseudo-ferramentas da ponte:** `zaeon_abrir_pagina {url}` (abre no navegador da sessão, devolve target_id),
`zaeon_buscar {caminho, padrao}` e `zaeon_ler {caminho, inicio, tamanho}` (grep/ler no código recuperado),
`zaeon_arquivos`, `zaeon_ajuda {nome}`.

**Wakaru** (Apache-2.0, 1.14.0, pinado por sha256 no Dockerfile): `recover_javascript_sources` quebra um bundle
monolítico em módulos legíveis. `REA_MCP_MAX_RESPONSE_BYTES=64MiB` na sessão (a captura de uma página grande passa dos
10 MiB padrão do stdio).

### Domínio declarado sob o Termo de Uso
As ferramentas web agem sobre um site real, então a pessoa DECLARA o domínio e aceita o **Termo de Uso** (lib/rea/termo.ts):
é titular (ou tem autorização por escrito), a finalidade, e o aceite grava a PROVA (conta, domínio, finalidade, versão +
sha256 do texto exibido, data, IP, navegador) no modelo `ReaDominio`. Rotas `/api/rea/dominios` (GET/POST/DELETE); UI em
Sala de Estudos → Engenharia reversa → Domínios (components/rea/DominiosRea.tsx). `dominiosLiberados(userId)` (só aceite
vigente: hash = termo atual, não revogado) é o que o Octa manda ao abrir a sessão — o modelo NÃO escolhe domínio.
Revogar marca `revogadoEm` (a prova fica). Mudou o texto → suba `TERMO_VERSAO`; aceites antigos deixam de liberar até o
novo aceite. **⚠️ texto da engenharia; revisão jurídica recomendada.**

Limites por env: `REA_MAX_SESSOES` (2), `REA_SESSAO_OCIOSA_MS` (20 min), `REA_SESSAO_VIDA_MS` (2 h),
`REA_SESSAO_FERRAMENTA_MS` (20 min). Uma sessão fecha no prazo/ociosidade e varre os processos (REA_JOB).

## Claude no catálogo (créditos Anthropic pelo gateway)
O Claude (Opus/Sonnet) entra no catálogo ÚNICO de modelos (`lib/chat/modelos`), compartilhado por chat (Aura), Octa e REA. Roteado pelo MESMO gateway LiteLLM — sem SDK nem chave no app; a `ANTHROPIC_API_KEY` mora na Contabo (gateway). **O REA não tem modelo próprio:** ele herda o modelo selecionado na superfície (octa/aura/zaeon). Se o aluno escolher Claude, o blueprint e a análise de binário usam Claude; senão, o modelo de sempre.

**Ligar (uma vez, na Contabo — gateway `zaeon-models`):**
  a. no `litellm-config.yaml`, os blocos `claude-opus`/`claude-sonnet` (anthropic/…, `api_key: os.environ/ANTHROPIC_API_KEY`);
  b. no `docker-compose.zaeon-models.yaml` (serviço `litellm`), `ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}` em `environment:` (sem ela a chave do `.env` não chega no container);
  c. `ANTHROPIC_API_KEY=sk-ant-…` no `.env` ao lado do compose; recarregar o litellm.

Verificar: `curl $BIND_ADDR:4000/v1/models` lista `claude-opus`/`claude-sonnet`; um chat de teste com `model=claude-sonnet` responde. No app, o modelo aparece na pílula do composer (provedor "Claude"); o REA passa a usar o que estiver selecionado.

## O que falta (futuro)
- As famílias com efeito colateral (capture/observe/trace/debug/adb) — pedem autorização por-ação.
