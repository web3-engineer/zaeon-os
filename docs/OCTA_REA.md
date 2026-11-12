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
- Subir/atualizar: `cd infra/rea-engine && scp pra Contabo && docker build -t zaeon-rea-engine:local . && docker run ... -p 100.113.137.74:8799:8799 -e REA_BRIDGE_TOKEN=…`. Artefato analisado vai no corpo (base64), escrito num tmp e apagado; nada de caminho do host.

## Fatia 2 — a ponte no Octa
`lib/octa/rea.ts` (cliente) + tool `octa_rea` em `lib/octa/agente.ts`. Só aparece com os **dois** portões: `OCTA_REA=1` **e** `REA_BRIDGE_URL`+`REA_BRIDGE_TOKEN`. Mesmo deny-por-família do bridge (defesa em profundidade); o guard do Octa fica por cima. A tool lê um arquivo do projeto como artefato (texto) e devolve a Evidence do REA.
- Envs no `.env` da VPS: `OCTA_REA=1`, `REA_BRIDGE_URL=http://100.113.137.74:8799`, `REA_BRIDGE_TOKEN=…` (o mesmo da Contabo).

## Upload de binário (feito)
- Botão 🔬 na IDE do Octa (atrás de `NEXT_PUBLIC_OCTA_REA=1`) → `POST /api/octa/rea/upload` → o binário vai DIRETO pro motor na Contabo (nunca fica na Zaeon nem no Mongo), que devolve um **handle** (`/upload` da ponte, cache transitório, TTL 2 h). O agente analisa com `octa_rea` passando o handle. Provado em prod: `analyze --provider ghidra` pelo handle = ok, decompilação nativa com Ghidra 12.1.4.
- Envs da UI: `NEXT_PUBLIC_OCTA_REA=1` (flag de build). Runtime: `OCTA_REA=1` + `REA_BRIDGE_URL`/`TOKEN`.

## Atualizar o motor (6.5.0 → 6.9.0)
O catálogo REAL de comandos vem do `rea --help` do binário instalado na Contabo, então a skill nova e a
deny-list reforçada (já no app) SÓ passam a valer quando o motor é reconstruído. Na Contabo:

```bash
cd infra/rea-engine
# puxe o compose/Dockerfile já com REA_VERSION=6.9.0 (git pull, ou scp destes arquivos)
docker compose build --no-cache rea-engine     # baixa rea-agents@6.9.0 + Ghidra 12.1.4
docker compose up -d rea-engine
```

Verificar (da própria Contabo, ou de um host na Tailscale):
```bash
docker exec zaeon_rea_engine rea --version      # deve dizer 6.9.0
curl -s http://100.113.137.74:8799/health       # { ok, rea, ghidra }
```
No Octa, com `OCTA_REA=1` + `REA_BRIDGE_URL/TOKEN`, peça uma análise estática (ex.: um alvo novo do 6.9:
EVM/WASM/Rust) e confira que a Evidence volta.

**A verificar neste bump:** o provider JADX (Android) é um jar pinado à parte (`jadx-headless-mcp` 0.7.1,
auditado contra o 6.5.0); o 6.9 referencia JADX 1.5.6. Análise Android pode pedir re-pinar esse jar — fora
deste commit, porque é outro binário com sha256 próprio no vetting.

## O que falta (futuro)
- As famílias com efeito colateral (capture/observe/trace/debug/adb) — pedem autorização por-ação.
