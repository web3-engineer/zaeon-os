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

## REA com o Claude (qualidade máxima, créditos Anthropic)
O raciocínio do REA pode rodar no Claude pelos créditos do dono, pelo MESMO gateway LiteLLM — sem SDK nem chave no app. Opt-in; desligado por padrão.

**Roteamento:** Opus no AGENTE (`octa_rea`, raciocínio sobre binário/decompilação) e Sonnet na REDAÇÃO (o compositor do blueprint do chat).

**1. Chave na Contabo (gateway):** `ANTHROPIC_API_KEY` no `.env` do projeto `zaeon-models` (onde roda o LiteLLM). O `litellm-config.yaml` já tem os modelos `claude-opus` e `claude-sonnet` lendo `os.environ/ANTHROPIC_API_KEY`. Recarregue o gateway:
```bash
docker compose -p zaeon-models -f infra/zaeon-models/docker-compose.zaeon-models.yaml up -d litellm   # pega a chave + config novos
```
Se a Anthropic recusar o id do modelo, troque em `litellm-config.yaml` pelo nome datado (ex.: `anthropic/claude-opus-4-1-YYYYMMDD`).

**2. Ligar no app (`.env` da VPS do app):**
```
REA_MODELO_AGENTE=claude-opus     # Opus no agente octa_rea (só com OCTA_REA=1)
REA_MODELO_REDACAO=claude-sonnet  # Sonnet no writeup do blueprint
```
Sem essas envs, cada ponto segue no Gemini de antes.

**⚠️ Blast radius do agente:** o Octa é um agente só, um modelo por turno. Com `REA_MODELO_AGENTE` e `OCTA_REA=1`, o Octa usa o Opus em TODO turno enquanto o REA está ligado — não só nas tools do REA. Em sessão de engenharia reversa é o desejado; se o Octa também é muito usado pra código geral, pese o custo. A redação (Sonnet) é isolada: só o blueprint.

**Verificar:** `GET /api/health` → `capacidades.reaClaude` = `{ agente, redacao }` (os nomes roteados, ou `off`). Depois, um turno de RE deve aparecer no gasto da sua conta Anthropic.

## O que falta (futuro)
- As famílias com efeito colateral (capture/observe/trace/debug/adb) — pedem autorização por-ação.
