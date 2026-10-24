# REA (Reverse Engineer Anything) no Octa

Engenharia reversa dentro do Octa, a partir do `morluto/rea` (MIT) — "uma MCP pra engenharia reversa de binários, aplicações e comportamento em runtime".

Segue o MESMO modelo do Appllama no Octa: a **skill** (metodologia) é vendorizada; o **MCP** (o motor pesado) é portão do dono.

## O que entrou (fatia 1 — PR #…)
- `vendor/skills/reverse-engineer-anything/` — a skill do REA, SÓ markdown (SKILL.md + references/ + DISCLAIMER + LICENSE), pinada por SHA (`rea-agents-6.5.0`, `3b79af2…`) em `config/vetting/repos.json`. Scripts, código nativo e `install.sh` do REA **não** foram vendorizados.
- Atrás de **`OCTA_REA=1`** (portão do dono): sem a flag, a skill nem entra em `octaSkills()`. Engenharia reversa é dual-use.
- Progressive disclosure, como as outras skills do Octa: só nome+descrição no prompt; a metodologia sai via `activate_skill`. Instalar a skill **não** registra o MCP nem instala motor de análise.

## Uso lícito (DISCLAIMER do REA, preservado 1:1)
Pesquisa de segurança, análise de malware, pesquisa de vulnerabilidade e divulgação coordenada, CTF e educação, interoperabilidade, preservação de software, e auditar/depurar software que você **possui ou está autorizado** a examinar.

O REA (e, portanto, o Octa com a skill) **não** ajuda a: burlar DRM/verificação de licença/anti-cheat/medidas de proteção; criar cheats; burlar autenticação/controle de acesso em sistemas sem autorização; copiar software proprietário. Esses pedidos são recusados — o guard do Octa (deny-by-default) fica por cima.

## Fatia 3 — o motor (na Contabo)
`infra/rea-engine/` — imagem `zaeon-rea-engine` (node:22 + JDK 21 + **Ghidra 12.2** + binwalk/unblob + `rea-agents@6.5.0`) e a **ponte** `bridge.mjs` (HTTP → CLI do REA), publicada SÓ na Tailscale (`100.113.137.74:8799`), token obrigatório.
- A ponte deriva os comandos do próprio `rea --help` no boot e **nega** as famílias com efeito colateral (capture-/observe-/trace/debug-/adb/push-/pull-/import-/setup/update/annotate-/execute-/cutter-). A análise estática/leitura passa 1:1.
- Subir/atualizar: `cd infra/rea-engine && scp pra Contabo && docker build -t zaeon-rea-engine:local . && docker run ... -p 100.113.137.74:8799:8799 -e REA_BRIDGE_TOKEN=…`. Artefato analisado vai no corpo (base64), escrito num tmp e apagado; nada de caminho do host.

## Fatia 2 — a ponte no Octa
`lib/octa/rea.ts` (cliente) + tool `octa_rea` em `lib/octa/agente.ts`. Só aparece com os **dois** portões: `OCTA_REA=1` **e** `REA_BRIDGE_URL`+`REA_BRIDGE_TOKEN`. Mesmo deny-por-família do bridge (defesa em profundidade); o guard do Octa fica por cima. A tool lê um arquivo do projeto como artefato (texto) e devolve a Evidence do REA.
- Envs no `.env` da VPS: `OCTA_REA=1`, `REA_BRIDGE_URL=http://100.113.137.74:8799`, `REA_BRIDGE_TOKEN=…` (o mesmo da Contabo).

## O que falta (futuro)
- Upload de BINÁRIO pelo Octa (hoje o workspace é texto; binário/APK/firmware precisam de um caminho de upload).
- As famílias com efeito colateral (capture/observe/trace/debug/adb) — pedem autorização por-ação.
