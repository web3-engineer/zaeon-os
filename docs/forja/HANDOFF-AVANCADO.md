# Handoff — trilha AVANÇADA da Forja (projetos pesados, por tema)

Curadoria de repositórios OSS **mais difíceis e mais interessantes** pra forjar cursos de nível
intermediário/avançado, incluindo **robótica**. Complementa o `HANDOFF-NOVOS-CURSOS.md` (que ensina a
**mecânica** de registrar um curso) — aqui o foco são as **listas curadas** e as regras próprias do nível alto.

Cada repo das tabelas **apareceu em uma busca real** no GitHub (`gh api search/repositories`) — nada inventado —
e já vem com estrelas, tamanho e licença conferidos. Dividido em **4 handoffs por tema**:

| Handoff | Tema | nº repos |
|---|---|---|
| [`HANDOFF-AVANCADO-robotica.md`](./HANDOFF-AVANCADO-robotica.md) | 🤖 Robótica (ROS, SLAM, voo, legged, veículo autônomo) | 9 |
| [`HANDOFF-AVANCADO-sistemas.md`](./HANDOFF-AVANCADO-sistemas.md) | ⚙️ Sistemas & baixo nível (compilador, DB, SO, ray tracer, container) | 11 |
| [`HANDOFF-AVANCADO-ia-do-zero.md`](./HANDOFF-AVANCADO-ia-do-zero.md) | 🧠 IA do zero (autograd, GPT, RL, difusão, RAG, agentes) | 9 |
| [`HANDOFF-AVANCADO-graficos-jogos-distribuido.md`](./HANDOFF-AVANCADO-graficos-jogos-distribuido.md) | 🎮 Gráficos·Jogos & 🌐 Redes·Distribuído (engine, física, emulador, Raft, proxy) | 10 |

---

## Regras próprias do nível avançado (leia antes de registrar)

Vale **tudo** do `HANDOFF-NOVOS-CURSOS.md` (achar repo real, licença permissiva + atribuição, portão antes do
commit, prod é do dono, registrar em um catálogo). O que **muda** no nível alto:

### 1. 📏 Tamanho importa (muito mais aqui) — **fume no motor ANTES de registrar**
Repos avançados são grandes, e o motor (`graphify update`) clona + analisa o repo inteiro. Legenda das tabelas:
- **✅ enxuto** (&lt; ~30 MB): roda liso, board enche rápido. Registra à vontade.
- **⚠️ grande** (~30–150 MB): **fume primeiro** (comando abaixo); pode demorar e o grafo fica denso — o board
  mostra os nós **mais centrais**, então escala, mas confirme que sai grafo útil.
- **⛔ gigante** (&gt; ~150 MB, ex. PX4 ~600 MB): provável estourar tempo/disco do job. **Não registre direto.**
  Opções: (a) estudar como **referência** (board degrada pro esqueleto, sem mapa); (b) apontar o curso pra um
  **subdiretório** representativo do repo; (c) deixar os engines como **base passiva** (`modo: "entregavel"`).

Fumaça **LOCAL** (qualquer dev, sem a box de prod — é o MESMO `graphify update` que o motor roda):
```bash
uv tool install graphifyy            # Python 3.10+ (ou: pipx install graphifyy)
git clone --depth 1 https://github.com/<owner>/<repo> /tmp/smoke-forja && cd /tmp/smoke-forja
graphify update . --force
python3 -c "import json;d=json.load(open('graphify-out/graph.json'));print('nós:',len(d['nodes']),'links:',len(d['links']))"
```
`nós > 0` → o board enche em prod. `0`/erro/muito lento → troque o repo ou use um subdiretório. (A variante na
box de prod é só do dono — ver `HANDOFF-NOVOS-CURSOS.md §3b`.)

### 2. 🎯 O entregável MUDA — não é "publique seu primeiro projeto"
No tier de iniciante, o aluno publica o próprio projeto no GitHub pela Octa. Em robótica, ML, SO, SLAM isso não
se aplica — o entregável é **estudar + rodar/simular/treinar** (um robô em sim, um GPT treinado, um kernel
bootando no QEMU). Use `modo: "curso"` (os 3 cards do board, com "entregar" = rodar/demonstrar, não publicar).

### 3. 🏷️ Marque o nível
Se forem pro mesmo catálogo dos iniciantes, deixe claro que são avançados (um `conceito` honesto como
"compilador (avançado)", ou um catálogo próprio `lib/forja/catalogoAvancado.ts` com a mesma forma do de
iniciantes). Não misture a dificuldade sem sinalizar — um iniciante clicando em PX4 se perde.

### 4. ⚖️ Licença — permissiva, sempre
As tabelas **já filtram** por permissiva (MIT/Apache-2.0/BSD/ISC/MPL). Cada handoff lista à parte os
**copyleft notáveis** (GPL/AGPL) que ficaram **de fora** — joias como ORB-SLAM3, ArduPilot, Betaflight são
GPL-3.0 e **não entram** como curso (o aluno publicaria derivado copyleft). Ficam de fora, por decisão de licença.

### 5. 🛠️ Como registrar (idêntico ao de iniciantes)
Adicione um `EsqueletoRepo` ao catálogo (ver `HANDOFF-NOVOS-CURSOS.md §2`), com `repo` da tabela, `licenca` do
repo (atribuição!), `modo: "curso"`, e um `id`/`conceito` do tema. Portão → PR draft → o dono mergeia.
