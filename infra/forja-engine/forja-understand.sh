#!/usr/bin/env bash
# forja-understand.sh — o wrapper do FORJA_UNDERSTAND_CMD (RUNBOOK-FORJA-ENGINE.md §5, "marcha 2").
#
# O understand-anything (Egonex-AI/Understand-Anything, MIT) NÃO tem CLI próprio: a análise é um slash
# command do Claude Code (`/understand`). Este wrapper roda o Claude Code HEADLESS no repo-alvo e garante
# o arquivo de saída que a ponte lê.
#
# Contrato com a ponte (infra/forja-engine/bridge.mjs + vetting.mjs):
#   chamada:  forja-understand.sh <repoDir> [args-extra...]   (cwd = diretório do job)
#   saída:    <repoDir>/.ua/knowledge-graph.json   (saidaRelativaA: "repo")
#   falha:    exit != 0  → a ponte responde 502 com o stderr (nunca finge sucesso)
#
# Pré-requisitos na box (provisionamento, ver RUNBOOK §5):
#   - Claude Code instalado (`claude`), autenticado (ANTHROPIC_API_KEY ou gateway — a ponte repassa o env);
#   - o plugin understand-anything instalado/registrado no Claude Code do usuário `forja`.
set -euo pipefail

REPO="${1:?uso: forja-understand.sh <repoDir> [args-extra...]}"; shift || true
cd "$REPO"

CLAUDE_BIN="${FORJA_CLAUDE_BIN:-claude}"
# bypassPermissions: o alvo é um clone descartável e isolado do job; headless não pode travar em prompt.
PERM="${FORJA_UNDERSTAND_PERM:-bypassPermissions}"
LOG="$(mktemp -t ua-run.XXXXXX.log)"

# roda o /understand do plugin. A auth de LLM vem do env repassado pela ponte (ver UNDERSTAND_ENV_PASS).
"$CLAUDE_BIN" -p '/understand' --permission-mode "$PERM" "$@" >"$LOG" 2>&1 || true

# o plugin escreve .ua/knowledge-graph.json (ou o legado .understand-anything/). Normaliza pro .ua/.
if [ ! -f ".ua/knowledge-graph.json" ] && [ -f ".understand-anything/knowledge-graph.json" ]; then
  mkdir -p .ua && cp ".understand-anything/knowledge-graph.json" ".ua/knowledge-graph.json"
fi

if [ ! -f ".ua/knowledge-graph.json" ]; then
  echo "understand-anything não produziu .ua/knowledge-graph.json (repo: $REPO)" >&2
  echo "--- últimas linhas do run do Claude Code ---" >&2
  tail -c 2000 "$LOG" >&2 || true
  rm -f "$LOG"
  exit 1
fi
rm -f "$LOG"
