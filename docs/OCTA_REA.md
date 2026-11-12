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
O container foi construído de uma pasta na própria box. Ache-a (e confirme que é a box certa):
```bash
ip -4 addr | grep -o '100\.113\.137\.74' || echo 'BOX ERRADA — pare'
find / -path '*rea-engine*' -name Dockerfile 2>/dev/null   # ex.: /opt/rea-engine/... 
docker inspect zaeon_rea_engine --format 'img={{.Config.Image}} workdir={{.Config.WorkingDir}}'
```
O token da ponte (`REA_BRIDGE_TOKEN`) **tem de ser o mesmo** que o `.env` da VPS do app usa — **não gere outro**, senão o app para. Se precisar do valor atual, leia do container (fica na sua tela, não vai pra lugar nenhum):
```bash
docker inspect zaeon_rea_engine --format '{{range .Config.Env}}{{println .}}{{end}}' | grep REA_BRIDGE_TOKEN
```

### 2. Atualize os arquivos para a versão nova
- **Se a pasta é um checkout git** com acesso ao repo: `git fetch && git checkout <branch-ou-main> && git pull`.
- **Se são arquivos soltos** (sem GitHub na box): os ajustes que importam, aplicáveis com editor/`sed`:
  - `infra/rea-engine/Dockerfile`: `ARG REA_VERSION=6.5.0` → `6.9.0`.
  - `infra/rea-engine/compose.yml`: `REA_VERSION: "6.5.0"` → `"6.9.0"`.
  - `infra/rea-engine/bridge.mjs`: a linha `const DENY_PREFIXOS = [...]` ganha, no começo, `"frida", "spawn", "attach", "launch", "instrument", "interact", "run-", "extract-", "environment-", "agent-env", ` (manter idêntica à de `lib/octa/rea.ts`).
  - copie `infra/rea-engine/audit-denylist.mjs` (novo) para a pasta.

### 3. Rebuild + up, SEMPRE escopado
```bash
cd <pasta-de-origem>   # a que o find achou
docker compose -p rea-engine -f infra/rea-engine/compose.yml build --no-cache rea-engine
docker compose -p rea-engine -f infra/rea-engine/compose.yml up -d rea-engine
```
> O build precisa de internet (baixa `rea-agents@6.9.0` do npm + Ghidra + JADX). A box tem egress (baixa modelos). O `compose.yml` já traz o `REA_BRIDGE_TOKEN` do `.env` ao lado; se o container original subiu por `docker run`, crie `infra/rea-engine/.env` com o MESMO token do passo 1.

### 4. Verifique
```bash
docker exec zaeon_rea_engine rea --version          # 6.9.0
curl -s http://100.113.137.74:8799/health            # { ok, rea, ghidra }
cd <pasta-de-origem> && node infra/rea-engine/audit-denylist.mjs   # rc=1 se algo perigoso escapou
```
No Octa (com `OCTA_REA=1` + `REA_BRIDGE_URL/TOKEN`), peça uma análise de um alvo novo do 6.9 (EVM/WASM/Rust) e confira que a Evidence volta.

### 5. Rollback
A imagem antiga continua local (o `--no-cache` cria uma nova; a de 2 semanas atrás fica como `<none>` até um `prune` escopado). Se o 6.9 der problema, reconstrua com `--build-arg REA_VERSION=6.5.0` (ou `git checkout` da versão anterior) e `up -d` de novo. Nunca `prune` global.

## O que falta (futuro)
- As famílias com efeito colateral (capture/observe/trace/debug/adb) — pedem autorização por-ação.
