/**
 * lib/forja/adaptadores/understand.ts — adapta a SAÍDA do Understand-Anything (`.ua/knowledge-graph.json`)
 * ao modelo da Forja: um `GrafoConhecimento` (nós/arestas) E uma `ArvoreEntendimento` (da `tour`). PURO.
 * Nada do código do Understand-Anything é copiado — só o JSON de saída é normalizado.
 *
 * Shape real (lido de packages/core/src/types.ts, branch main):
 *   topo: { version, kind?, project:{name,languages,frameworks,description,analyzedAt,gitCommitHash}, nodes, edges, layers, tour }
 *   nó:   { id, type:NodeType, name, summary, tags, complexity:"simple|moderate|complex", filePath?, lineRange? }
 *   aresta:{ source, target, type:EdgeType, direction, weight, description? }
 *   tour: [{ order, title, description, nodeIds, languageLesson? }]  (a "tour" guiada = a árvore de entendimento)
 *
 * Defensivo: o zod do upstream usa .passthrough(), então toleramos chaves extras e ausências.
 */
import type {
  GrafoConhecimento, NoCodigo, Aresta, TipoAresta, TipoNo,
  ArvoreEntendimento, NoEntendimento, Temperatura,
} from "../tipos";
import { rankTemperatura } from "../temperatura";

// ── formas cruas (frouxas de propósito) ──
type NoUA = { id: string; type?: string; name?: string; summary?: string; complexity?: string; filePath?: string };
type ArestaUA = { source: string; target: string; type?: string };
type PassoUA = { order?: number; title?: string; description?: string; nodeIds?: string[] };
export type UnderstandJson = { nodes?: NoUA[]; edges?: ArestaUA[]; tour?: PassoUA[]; project?: { name?: string; description?: string } };

/** NodeType do Understand → TipoNo da Forja. Desconhecido vira "conceito". PURA. */
export function tipoDoNoUA(type: string | undefined): TipoNo {
  switch (String(type || "").toLowerCase()) {
    case "file": return "arquivo";
    case "folder": case "directory": return "pasta";
    case "module": return "modulo";
    case "class": return "classe";
    case "function": case "method": return "funcao";
    case "dependency": case "package": return "dependencia";
    default: return "conceito"; // concept, topic, claim, document, article, source, entity, …
  }
}

/** EdgeType do Understand → aresta da Forja. Desconhecido vira "referencia". PURA. */
export function arestaDeEdgeType(type: string | undefined): TipoAresta {
  switch (String(type || "").toLowerCase()) {
    case "imports": return "importa";
    case "calls": return "chama";
    case "defines": case "declares": return "define";
    case "contains": return "contem";
    case "depends_on": case "depends": return "depende";
    default: return "referencia"; // related, cites, …
  }
}

/** complexity do Understand → temperatura da Forja. PURA. */
export function temperaturaDeComplexidade(complexity: string | undefined): Temperatura {
  switch (String(complexity || "").toLowerCase()) {
    case "complex": return "avancado";
    case "moderate": return "medio";
    default: return "basico"; // simple / ausente
  }
}

/** Normaliza o knowledge-graph.json para o GrafoConhecimento da Forja. PURA. */
export function understandParaGrafo(json: UnderstandJson): GrafoConhecimento {
  const nosRaw = Array.isArray(json?.nodes) ? json.nodes : [];
  const arestasRaw = Array.isArray(json?.edges) ? json.edges : [];

  const grau = new Map<string, number>();
  const arestas: Aresta[] = [];
  for (const e of arestasRaw) {
    if (!e || typeof e.source !== "string" || typeof e.target !== "string") continue;
    arestas.push({ de: e.source, para: e.target, tipo: arestaDeEdgeType(e.type) });
    grau.set(e.source, (grau.get(e.source) || 0) + 1);
    grau.set(e.target, (grau.get(e.target) || 0) + 1);
  }

  const nos: NoCodigo[] = [];
  for (const n of nosRaw) {
    if (!n || typeof n.id !== "string") continue;
    nos.push({
      id: n.id,
      tipo: tipoDoNoUA(n.type),
      nome: n.name || n.id,
      caminho: n.filePath,
      grau: grau.get(n.id) || 0,
      fonte: "understand-anything",
    });
  }

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

/** A temperatura de um passo da tour: a MAIOR complexidade entre os nós que ele cobre; sem nós, "basico". PURA. */
export function temperaturaDoPasso(passo: PassoUA, porId: Map<string, NoUA>): Temperatura {
  let t: Temperatura = "basico";
  for (const id of Array.isArray(passo?.nodeIds) ? passo.nodeIds : []) {
    const c = temperaturaDeComplexidade(porId.get(id)?.complexity);
    if (rankTemperatura(c) > rankTemperatura(t)) t = c;
  }
  return t;
}

/**
 * Monta a ArvoreEntendimento a partir da `tour` guiada: a raiz é o projeto; cada passo (em ordem) é uma lição
 * de leitura, com `desde` = temperatura dos nós que ela cobre e `refs` = os nós do grafo. PURA.
 */
export function understandParaArvore(json: UnderstandJson): ArvoreEntendimento {
  const porId = new Map<string, NoUA>();
  for (const n of Array.isArray(json?.nodes) ? json.nodes : []) if (n && typeof n.id === "string") porId.set(n.id, n);

  const passos = (Array.isArray(json?.tour) ? json.tour : [])
    .slice()
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  const filhos: NoEntendimento[] = passos.map((p, i) => ({
    id: `tour-${p?.order ?? i}`,
    titulo: p?.title || `Passo ${i + 1}`,
    resumo: p?.description || "",
    desde: temperaturaDoPasso(p, porId),
    refs: Array.isArray(p?.nodeIds) ? p.nodeIds.filter((x) => typeof x === "string") : [],
    filhos: [],
  }));

  return {
    raiz: {
      id: "raiz",
      titulo: json?.project?.name || "Projeto",
      resumo: json?.project?.description || "",
      desde: "basico",
      refs: [],
      filhos,
    },
  };
}
