# Fixtures dos adaptadores da Forja

Estes dois JSONs **espelham o schema real de saída** dos engines, lido do código-fonte dos repositórios
(não inventado):

- `graphify.graph.json` — formato `networkx.node_link_data(G, edges="links")` + extras, como escrito por
  `graphify/export.py` (branch `v8` de Graphify-Labs/graphify): topo `{directed, multigraph, graph:{schema_version:1}, nodes, links, hyperedges}`, nó `{id, label, source_file?, source_location?, community?}`, link `{source, target, relation, confidence}`.
- `understand.knowledge-graph.json` — interface `KnowledgeGraph` de
  `packages/core/src/types.ts` (branch `main` de Egonex-AI/Understand-Anything): `{version, kind?, project, nodes, edges, layers, tour}`, nó `{id, type, name, summary, tags, complexity, filePath?}`, aresta `{source, target, type, direction, weight}`, passo da tour `{order, title, description, nodeIds}`.

São **mínimos e representativos** (exercitam as relações, a centralidade/`grau`, a raiz e a temperatura da
tour). Quando o build da Contabo (tarefa A1 do RALPH) produzir saída **real** de um repo de verdade, troque/
acrescente fixtures com essa saída e confirme que os adaptadores seguem verdes — o shape pode trazer chaves a
mais (os adaptadores já são defensivos: `.passthrough()` no upstream do Understand, `community/norm_label` no
Graphify), mas uma fixture de saída real é a prova final.
