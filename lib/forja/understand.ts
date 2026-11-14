/**
 * lib/forja/understand.ts — adapta a saída do UNDERSTAND-ANYTHING (`.ua/knowledge-graph.json`, Egonex-AI,
 * MIT) ao modelo da Forja. É a camada SEMÂNTICA: enquanto o graphify dá a estrutura (tree-sitter, sem LLM),
 * o understand-anything dá o SIGNIFICADO e a PEDAGOGIA — camadas conceituais (`layers`), um resumo em
 * linguagem natural por nó (`summary`, que vira o texto da lição) e um TOUR ordenado (a ordem de aprender).
 *
 * `arvoreDoUA` vira esse grafo numa ArvoreEntendimento: raiz = projeto; ramos = camadas (ordenadas pela
 * ordem do tour, pra o "comece por aqui" ser o passo 1); folhas = conceitos de cada camada (resumo = a
 * explicação real). PURO. Nada do código do understand-anything é copiado — só o JSON de saída é normalizado.
 */
import type { ArvoreEntendimento, NoEntendimento, Temperatura } from "./tipos";

// ── formas cruas do knowledge-graph.json (frouxas: a saída traz mais chaves) ──
export type UANode = { id: string; type: string; name: string; filePath?: string; lineRange?: [number, number]; summary?: string; tags?: string[]; complexity?: "simple" | "moderate" | "complex"; languageNotes?: string };
export type UAEdge = { source: string; target: string; type?: string };
export type UALayer = { id: string; name: string; description?: string; nodeIds?: string[] };
export type UATourStep = { order: number; title: string; description?: string; nodeIds?: string[]; languageLesson?: string };
export type UAProject = { name?: string; languages?: string[]; frameworks?: string[]; description?: string };
export type UAGrafo = { version?: string; kind?: string; project?: UAProject; nodes?: UANode[]; edges?: UAEdge[]; layers?: UALayer[]; tour?: UATourStep[] };

const tempDaComplexidade = (c?: string): Temperatura => (c === "complex" ? "avancado" : c === "moderate" ? "medio" : "basico");
const ehSimbolo = (n: UANode): boolean => n.type !== "file";

/** Deriva a base de conhecimento (ArvoreEntendimento) do grafo do understand-anything. PURA.
 *  Ramos = camadas conceituais, ordenadas pelo tour; folhas = conceitos de cada camada (resumo = lição). */
export function arvoreDoUA(ua: UAGrafo, maxConceitos = 5): ArvoreEntendimento {
  const nodes = ua?.nodes ?? [];
  const porId = new Map<string, UANode>(nodes.map((n) => [n.id, n]));
  // ordem pedagógica: cada nó recebe a MENOR ordem de tour em que aparece (resto vai pro fim)
  const ordemTour = new Map<string, number>();
  for (const passo of ua?.tour ?? []) for (const id of passo.nodeIds ?? []) {
    const atual = ordemTour.get(id);
    if (atual === undefined || passo.order < atual) ordemTour.set(id, passo.order);
  }
  const ordemDe = (id: string): number => ordemTour.get(id) ?? 9999;

  const layers = ua?.layers ?? [];
  const ramos: NoEntendimento[] = layers
    .map((layer) => {
      const ids = layer.nodeIds ?? [];
      const conceitos = ids.map((id) => porId.get(id)).filter((n): n is UANode => !!n);
      // folhas: símbolos (não-arquivos) da camada, ordenados pelo tour; se só houver arquivos, usa-os
      const folhasFonte = (conceitos.some(ehSimbolo) ? conceitos.filter(ehSimbolo) : conceitos)
        .sort((a, b) => ordemDe(a.id) - ordemDe(b.id))
        .slice(0, maxConceitos);
      const ordemCamada = Math.min(9999, ...ids.map(ordemDe));
      const filhos: NoEntendimento[] = folhasFonte.map((c) => ({
        id: c.id,
        titulo: c.name,
        resumo: (c.summary || "").trim(),
        desde: tempDaComplexidade(c.complexity),
        refs: [c.id],
        filhos: [],
      }));
      return { layer, ordemCamada, no: { id: layer.id, titulo: layer.name, resumo: (layer.description || "").trim(), desde: "basico" as Temperatura, refs: ids, filhos } };
    })
    .sort((a, b) => a.ordemCamada - b.ordemCamada) // o tour decide qual camada vem primeiro ("comece por aqui")
    .map((x) => x.no);

  const proj = ua?.project ?? {};
  return { raiz: { id: "raiz", titulo: proj.name || "Projeto", resumo: proj.description || "", desde: "basico", refs: [], filhos: ramos } };
}

/** Tem grafo do understand-anything utilizável? (ao menos uma camada com nós). PURA. */
export function temUA(ua: UAGrafo | null | undefined): boolean {
  return !!ua && Array.isArray(ua.layers) && ua.layers.some((l) => (l.nodeIds?.length ?? 0) > 0) && (ua.nodes?.length ?? 0) > 0;
}
