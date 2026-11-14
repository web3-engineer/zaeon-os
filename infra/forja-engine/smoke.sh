#!/usr/bin/env bash
# smoke.sh — fumaça da ponte da Forja (RUNBOOK §4). Confere /health, roda o graphify num repo real e,
# com --ua, roda o understand (se provisionado). Uso:
#   FORJA_BRIDGE_TOKEN=... ./smoke.sh [URL] [repoUrl] [--ua]
set -euo pipefail
URL="${1:-http://127.0.0.1:8800}"
REPO="${2:-https://github.com/karpathy/micrograd}"
TOKEN="${FORJA_BRIDGE_TOKEN:?defina FORJA_BRIDGE_TOKEN}"
QUER_UA="no"; for a in "$@"; do [ "$a" = "--ua" ] && QUER_UA="sim"; done

conta() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const g=j.grafo||{};const nos=(g.nodes||g.nos||[]).length,ar=(g.links||g.edges||g.arestas||[]).length,ca=(g.layers||[]).length;console.log("  ok:",j.ok,"· nós:",nos,"· arestas:",ar,(ca?"· camadas: "+ca:""),(j.erro?"· ERRO: "+j.erro:""));process.exit(j.ok?0:1);}catch(e){console.log("  resposta não-JSON:",s.slice(0,300));process.exit(1);}})'; }

echo "== /health =="
curl -fsS "$URL/health"; echo

echo "== graphify · $REPO =="
curl -fsS "$URL/forja" -H 'content-type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"engine\":\"graphify\",\"repoUrl\":\"$REPO\"}" | conta

if [ "$QUER_UA" = "sim" ]; then
  echo "== understand · $REPO (pode levar minutos) =="
  curl -fsS "$URL/forja" -H 'content-type: application/json' \
    -d "{\"token\":\"$TOKEN\",\"engine\":\"understand\",\"repoUrl\":\"$REPO\"}" | conta
fi
echo "✓ fumaça ok"
