/**
 * lib/forja/adaptadores/graphify.ts — adapta a SAÍDA do Graphify (`graphify-out/graph.json`) ao modelo da
 * Forja (`GrafoConhecimento`). PURO. Nada do código do Graphify é copiado — só o JSON de saída é normalizado.
 *
 * Shape real (lido de graphify/export.py, branch v8): networkx `node_link_data(G, edges="links")` + extras.
 *   topo:  { directed, multigraph, graph:{schema_version:1, graphify_version?}, nodes, links, hyperedges? }
 *   nó:    { id, label, source_file?, source_location?, file_type?, community?, norm_label? }
 *   link:  { source, target, relation:"calls|imports|uses|...", confidence?, confidence_score? }
 *
 * Defensivo: tolera campos extras (o Graphify acrescenta community/norm_label) e ausências (fixture mínima).
 * O `grau` (centralidade) é computado das arestas; a `raiz` é o nó de maior grau, quando há um claro.
 */
import type { GrafoConhecimento, NoCodigo, Aresta, TipoAresta, TipoNo } from "../tipos";

// ── formas cruas (frouxas de propósito: a saída real traz mais chaves) ──
type NoGraphify = { id: string; label?: string; source_file?: string; source_location?: unknown; file_type?: string };
type LinkGraphify = { source: string; target: string; relation?: string };
export type GraphifyJson = { nodes?: NoGraphify[]; links?: LinkGraphify[]; directed?: boolean };

/** relation do Graphify → aresta da Forja. Desconhecido vira "referencia" (nunca quebra). PURA. */
export function arestaDeRelation(relation: string | undefined): TipoAresta {
  switch (String(relation || "").toLowerCase()) {
    case "imports": case "import": return "importa";
    case "calls": case "call": return "chama";
    case "defines": case "define": return "define";
    case "contains": case "contain": return "contem";
    case "depends": case "depends_on": return "depende";
    default: return "referencia"; // "uses" e quaisquer outros
  }
}

/** tipo do nó, best-effort: nó com localização de símbolo é função; senão, arquivo. PURA. */
export function tipoDoNoGraphify(no: NoGraphify): TipoNo {
  if (no.source_location != null) return "funcao";
  if (no.source_file && no.id === no.source_file) return "arquivo";
  return "arquivo";
}

/** Normaliza o graph.json do Graphify para o GrafoConhecimento da Forja. PURA. */
export function graphifyParaGrafo(json: GraphifyJson): GrafoConhecimento {
  const nosRaw = Array.isArray(json?.nodes) ? json.nodes : [];
  const linksRaw = Array.isArray(json?.links) ? json.links : [];

  const grau = new Map<string, number>();
  const arestas: Aresta[] = [];
  for (const l of linksRaw) {
    if (!l || typeof l.source !== "string" || typeof l.target !== "string") continue;
    arestas.push({ de: l.source, para: l.target, tipo: arestaDeRelation(l.relation) });
    grau.set(l.source, (grau.get(l.source) || 0) + 1);
    grau.set(l.target, (grau.get(l.target) || 0) + 1);
  }

  const nos: NoCodigo[] = [];
  for (const n of nosRaw) {
    if (!n || typeof n.id !== "string") continue;
    nos.push({
      id: n.id,
      tipo: tipoDoNoGraphify(n),
      nome: n.label || n.source_file || n.id,
      caminho: n.source_file,
      grau: grau.get(n.id) || 0,
      fonte: "graphify",
    });
  }

  // raiz = o nó mais central, quando destaca-se; empate ou grafo vazio → sem raiz.
  let raiz: string | undefined;
  let melhor = -1, empate = false;
  for (const n of nos) {
    const g = n.grau || 0;
    if (g > melhor) { melhor = g; raiz = n.id; empate = false; }
    else if (g === melhor) empate = true;
  }
  if (melhor <= 0 || empate) raiz = undefined;

  return { nos, arestas, raiz };
}
