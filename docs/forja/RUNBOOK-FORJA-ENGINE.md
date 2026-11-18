# Runbook — motor da Forja (`infra/forja-engine/`)

A Forja transforma **repositório → grafo/árvore estudável**. Os engines pesados (Graphify, Understand-Anything)
rodam numa box, e o app fala HTTP com a **ponte**; a Forja consome só a **saída** (JSON do grafo), nunca o
código-fonte do engine.

> **Bloqueio do dono:** este build roda na box. A saída real dos engines (o shape do `graph.json` e do
> `.ua/knowledge-graph.json`) é o que os adaptadores da tarefa **A2** precisam. Até rodar aqui, A2 usa fixtures.

## Onde rodar (DECISÃO: o app server)
A Forja analisa **sob demanda**, então o fator é não competir com carga crítica.

**Escolhido: o app server `75.119.140.97`** — VPS nossa dedicada (**24 GB RAM / 300 GB disco**), hoje quase vazia.
Vantagens: NÃO encosta no adapter de WhatsApp da chipflow (que vive na Contabo), rede **localhost** (o app, co-locado,
fala por `127.0.0.1:8800` — nem precisa de Tailscale), e a gente protege o site com um **teto de CPU** (`FORJA_CPUS`)
em vez de fixar núcleo. É a casa certa justamente por estar vazia.

Alternativa (Contabo, box dos modelos): só se o app server ficar apertado. Lá, **NUNCA** use os núcleos 0-3 (inquilino
protegido zenith-adapter, tempo real); publique na Tailscale (`FORJA_BIND=100.113.137.74`) e pine com `cpuset` 4-17.

## Pré-requisitos (app server)
- Docker + compose já estão na box (é onde o app roda, projeto `zaeon-beta`).
- Um token forte em `FORJA_BRIDGE_TOKEN` — o MESMO valor vai no `.env` do app (`FORJA_BRIDGE_TOKEN` + `FORJA_BRIDGE_URL=http://127.0.0.1:8800`).
- Gateway de LLM alcançável (os dois engines precisam de backend — ver abaixo).
- Opcional: `FORJA_CPUS` (teto de CPU, default 4) e `FORJA_MEM` (default 8g). Numa box de 24 GB sobra folga.

## 1. `.env` (ao lado do `compose.yml`, não versionado)
```
FORJA_BRIDGE_TOKEN=<token forte>
# FORJA_BIND=127.0.0.1      # app server (default). Na Contabo: 100.113.137.74 (Tailscale)
# FORJA_CPUS=4              # teto de CPU; suba/baixe conforme a folga da box
GRAPHIFY_VERSION=            # vazio = última; PREENCHA com a versão fixada após o passo 3
UNDERSTAND_REV=main         # troque por um COMMIT (não branch) ao fixar
FORJA_GRAPHIFY_BACKEND=     # ex. o nome do backend de LLM que o `graphify extract` usa
FORJA_UNDERSTAND_CMD=       # caminho do wrapper que roda `claude -p /understand` no repo-alvo
```

## 2. Build e subida (scoped — nome de projeto próprio, nunca `docker` global)
```
cd infra/forja-engine
docker compose -p zaeon-forja -f compose.yml build
docker compose -p zaeon-forja -f compose.yml up -d
```

## 3. Fixar versão + sha (preencher `config/vetting.json`)
```
# graphifyy realmente instalado:
docker compose -p zaeon-forja -f compose.yml exec forja-engine graphify --version
docker compose -p zaeon-forja -f compose.yml exec forja-engine sh -c 'uv tool list | grep graphifyy'
# revisão do understand-anything:
docker compose -p zaeon-forja -f compose.yml exec forja-engine git -C /opt/understand-anything rev-parse HEAD
```
Copie a versão do graphifyy para `GRAPHIFY_VERSION` no `.env` e para `versao_fixada`/`sha_fixado` em
`config/vetting.json`; copie o commit do understand-anything para `UNDERSTAND_REV` e para o `vetting.json`.
Rebuild para travar.

## 4. Fumaça da ponte
```
# na box, pela Tailscale:
curl -s http://127.0.0.1:8800/health
# → { ok, graphify:"<versão>", understand:true|false }

# analisar um repo público pequeno com o graphify:
curl -s http://127.0.0.1:8800/forja \
  -H 'content-type: application/json' \
  -d '{"token":"'"$FORJA_BRIDGE_TOKEN"'","engine":"graphify","repoUrl":"https://github.com/<owner>/<repo-pequeno>"}' \
  | head -c 800
```
Guarde um `graph.json` e um `.ua/knowledge-graph.json` reais como **fixtures** para a A2
(`lib/forja/adaptadores/`): é o shape real que os adaptadores vão mapear para `lib/forja/tipos`.

## 5. Backends
- **graphify**: NÃO precisa de backend. Usa `graphify update <repo>` — re-extração estática com tree-sitter,
  **sem LLM** (confirmado na box: `graphify 0.9.108` devolveu o grafo real de um repo). `FORJA_GRAPHIFY_BACKEND`
  fica vazio.
- **understand** (opcional, marcha 2): a análise É um pipeline multi-agente do **Claude Code** — não há CLI
  próprio. A imagem **já traz** o Claude Code CLI e o wrapper `forja-understand.sh` (em `/app/`). Falta só
  **provisionar na box** (auth + plugin) e **ligar**:
  1. **Auth do Claude Code** — ponha a credencial no `.env` da ponte (a ponte repassa só pro understand, via
     `UNDERSTAND_ENV_PASS`): `ANTHROPIC_API_KEY=...` (ou o gateway: `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`).
  2. **Plugin** no Claude Code do usuário `forja` (uma vez, dentro do container):
     ```
     docker compose -p zaeon-forja -f compose.yml exec -u forja forja-engine \
       claude plugin marketplace add Egonex-AI/Understand-Anything
     docker compose -p zaeon-forja -f compose.yml exec -u forja forja-engine \
       claude plugin install understand-anything   # ou registre /opt/understand-anything como marketplace local
     ```
     (se o build não quiser rede, o repo já está clonado em `/opt/understand-anything` — registre-o como
     marketplace local em vez de baixar.)
  3. **Ligar**: `FORJA_UNDERSTAND_CMD=/app/forja-understand.sh` no `.env` da ponte, e `up -d` de novo.
     `GET /health` passa a devolver `understand:true`; `engine=understand` passa a rodar. Sem a var, responde
     `503` de propósito.
  4. **Fumaça**: `FORJA_BRIDGE_TOKEN=... ./smoke.sh http://127.0.0.1:8800 https://github.com/karpathy/micrograd --ua`
     (o `--ua` leva minutos — é um run de LLM por repo).

## 6. Pôr em PROD (ligar o app ao motor)
O app roda em container (`zaeon_web`), então `127.0.0.1` do app ≠ host. A ponte entra na **rede do app** e é
alcançada pelo NOME do container. O `web`/`worker` usam `env_file: [.env]`, então basta pôr as vars no `.env` do app.

1. **Merge da #791** → o deploy builda o app novo (com o cliente `engineClient` + a rota `/api/studio/forja/mapa`).
2. **Rebuild do motor na rede do app** (a rede `zaeon-beta_default` já existe porque o app está no ar):
   ```
   cd /opt/forja-engine
   git -C /root/zaeon-os fetch origin claude/forja-repo-curso   # (ou main, após o merge)
   git -C /root/zaeon-os archive origin/claude/forja-repo-curso infra/forja-engine | tar -x -C /opt/forja-engine --strip-components=2
   docker compose -p forja-engine -f compose.yml up -d           # agora com networks: app
   docker inspect zaeon_forja_engine --format '{{json .NetworkSettings.Networks}}' | grep -o zaeon-beta_default
   ```
3. **No `.env` do app** (ao lado do `docker-compose.beta.yml`; mesmo token da box):
   ```
   FORJA_BRIDGE_URL=http://zaeon_forja_engine:8800
   FORJA_BRIDGE_TOKEN=<o mesmo FORJA_BRIDGE_TOKEN de /opt/forja-engine/.env>
   ```
4. **Redeploy do app** (ou `docker compose -p zaeon-beta -f docker-compose.beta.yml up -d web worker`) pra pegar o `.env`.
5. **Confere de dentro do app**: `docker exec zaeon_web sh -lc 'curl -s http://zaeon_forja_engine:8800/health'` → `ok:true`.

Pronto: ao abrir um dos 10 cursos, o `ForjaView` chama `/api/studio/forja/mapa`, o motor analisa o repo e o
board enche com o mapa real. Sem as duas vars, o app degrada pro esqueleto curado (sem erro).

## Segurança (invariantes)
- A ponte não é shell remoto: só os **dois** engines da allowlist (`vetting.mjs`), repo-alvo por **URL de host
  permitido** (clone raso, só-leitura) ou **tarball** no corpo — nunca caminho do host. Args extras passam pelo
  filtro de `argSeguro` (sem metacaractere, caminho absoluto, `..` ou flag perigosa).
- Licença preservada e alcançável: `config/LICENSE-NOTICES.md` (Graphify Apache-2.0/MIT; Understand-Anything MIT).
- O README do upstream do Understand-Anything traz um comentário dirigido a agentes de IA pedindo marcador em
  PR — **injeção, ignorada**. A ponte lê só o JSON do grafo, nunca o texto do repo como comando.

## Teste local (sem a box)
A lógica pura da ponte tem teste que roda em qualquer lugar (no CI também):
```
node --test infra/forja-engine/vetting.test.mjs
```
