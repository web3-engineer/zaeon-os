/**
 * lib/chat/figuras.ts — qual FIGURA um JSON do modelo é. PURO.
 *
 * As skills agentic da casa respondem "apenas o JSON" (é o contrato delas, o mesmo nos três
 * modelos). Três têm desenho na página:
 *
 *   geometria-jsxgraph → construção dinâmica   (lib/chat/geometria)
 *   formulas-katex     → passos tipografados   (lib/chat/passos)
 *   diagrama-mermaid   → diagrama              (lib/chat/diagrama)
 *
 * O JSON chega num bloco com a linguagem da figura (```geometria, ```passos, ```diagrama,
 * ```mermaid), num bloco ```json / sem linguagem, ou como a resposta inteira. No primeiro caso a
 * intenção é explícita e a figura assume o bloco (inválido vira aviso). Nos outros dois ele só vira
 * figura se validar DE PONTA A PONTA — JSON de qualquer outra coisa continua código.
 */
import { ehGeometria } from "@/lib/chat/geometria";
import { ehPassos } from "@/lib/chat/passos";
import { ehDiagrama } from "@/lib/chat/diagrama";
import { ehPartitura } from "@/lib/chat/partitura";

export type Figura = "geometria" | "passos" | "diagrama" | "mermaid" | "partitura";

const POR_LINGUAGEM: Readonly<Record<string, Figura>> = {
  geometria: "geometria", passos: "passos", diagrama: "diagrama", mermaid: "mermaid", partitura: "partitura",
};

/** A figura de um JSON cru, se ele for uma — pela forma, não pelo rótulo. */
export function figuraDoJson(texto: string): Figura | null {
  const t = texto.trim();
  if (t.startsWith("[") && t.endsWith("]")) return ehGeometria(t) ? "geometria" : ehPassos(t) ? "passos" : null;
  // objeto: a partitura tem forma específica (chave `abc`); testada antes do diagrama pra não colidir.
  if (t.startsWith("{") && t.endsWith("}")) return ehPartitura(t) ? "partitura" : ehDiagrama(t) ? "diagrama" : null;
  return null;
}

/** A figura de um bloco de código do chat. */
export function figuraDoBloco(lang: string, conteudo: string): Figura | null {
  const explicita = POR_LINGUAGEM[lang];
  if (explicita) return explicita;
  return lang === "json" || lang === "" ? figuraDoJson(conteudo) : null;
}
