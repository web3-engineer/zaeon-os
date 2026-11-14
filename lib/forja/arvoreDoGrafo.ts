/**
 * lib/forja/arvoreDoGrafo.ts — deriva uma BASE DE CONHECIMENTO (ArvoreEntendimento) a partir do GRAFO REAL
 * do graphify, SEM LLM. Enquanto o understand-anything (marcha 2) não roda, esta é a base: os ARQUIVOS/módulos
 * mais centrais do repo viram ramos; os SÍMBOLOS mais ligados de cada um viram folhas. Determinístico e puro.
 *
 * É melhor que uma raiz solitária: o aluno vê a estrutura real do código organizada por módulo. Quando o
 * understand entrar, ele substitui esta derivação por uma árvore conceitual de verdade.
 */
import type { ArvoreEntendimento, GrafoConhecimento, NoCodigo, NoEntendimento, Temperatura } from "./tipos";

const baseno = (caminho: string): string => (caminho || "").split("/").pop() || caminho || "módulo";
const grauDe = (n: NoCodigo): number => n.grau ?? 0;

/** Árvore de entendimento derivada do grafo: raiz → módulos (arquivos) centrais → símbolos centrais. PURA. */
export function arvoreDoGrafo(grafo: GrafoConhecimento, titulo: string, resumo = "", maxModulos = 6, maxSimbolos = 3): ArvoreEntendimento {
  const nos = grafo?.nos ?? [];
  // agrupa por arquivo (caminho); nós sem caminho caem num balde "símbolos"
  const porArquivo = new Map<string, NoCodigo[]>();
  for (const n of nos) {
    const chave = (n.caminho || n.nome || n.id).trim();
    (porArquivo.get(chave) ?? porArquivo.set(chave, []).get(chave)!).push(n);
  }
  // ordena os módulos pela soma de centralidade (grau) dos seus nós, desc
  const modulos = [...porArquivo.entries()]
    .map(([arquivo, ns]) => ({ arquivo, ns, peso: ns.reduce((s, n) => s + grauDe(n), 0) + ns.length }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, maxModulos);

  const niveis: Temperatura[] = ["basico", "basico", "medio", "medio", "avancado", "avancado"];
  const filhos: NoEntendimento[] = modulos.map((m, i) => {
    const simbolos = [...m.ns].sort((a, b) => grauDe(b) - grauDe(a)).slice(0, maxSimbolos);
    return {
      id: `mod:${m.arquivo}`,
      titulo: baseno(m.arquivo),
      resumo: `${m.ns.length} elemento(s) mapeado(s)`,
      desde: niveis[i] ?? "avancado",
      refs: m.ns.map((n) => n.id),
      filhos: simbolos
        .filter((s) => s.nome && s.nome !== baseno(m.arquivo))
        .map((s) => ({ id: s.id, titulo: s.nome, resumo: "", desde: "avancado" as Temperatura, refs: [s.id], filhos: [] })),
    };
  });

  return { raiz: { id: "raiz", titulo, resumo, desde: "basico", refs: [], filhos } };
}

/** Enche o arvore do curso a partir do grafo, se a árvore vier vazia (sem understand). PURA. */
export function comBaseDoGrafo(curso: { arvore: ArvoreEntendimento; grafo: GrafoConhecimento }, titulo: string): ArvoreEntendimento {
  const temArvore = (curso.arvore?.raiz?.filhos?.length ?? 0) > 0;
  if (temArvore || !(curso.grafo?.nos?.length)) return curso.arvore;
  return arvoreDoGrafo(curso.grafo, titulo || curso.arvore?.raiz?.titulo || "Curso", curso.arvore?.raiz?.resumo || "");
}
