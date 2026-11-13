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

## 5. Provisionamento dos backends (o que falta pra saída completa)
- **graphify**: o `extract` documentado chama um backend de LLM (`--backend`). Aponte `FORJA_GRAPHIFY_BACKEND`
  pro gateway. (O grafo tree-sitter é estático, mas a rota documentada passa pelo backend.)
- **understand**: a análise É um pipeline multi-agente do **Claude Code** — não há CLI próprio. Instale o
  Claude Code na box, registre o plugin (`/plugin marketplace add Egonex-AI/Understand-Anything` →
  `/plugin install understand-anything`) e escreva o wrapper `FORJA_UNDERSTAND_CMD` que roda
  `claude -p '/understand'` com `cwd` no repo-alvo. Enquanto não houver wrapper, `/forja engine=understand`
  responde `503` (provisionamento), de propósito.

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
