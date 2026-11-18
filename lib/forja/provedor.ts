/**
 * lib/forja/provedor.ts — a COSTURA MODULAR da Forja: cada engine de análise (Graphify,
 * Understand-Anything, e futuros) é um PROVEDOR que entrega a forma unificada (lib/forja/tipos). PURO
 * no núcleo; o IO de cada provedor mora na ponte do engine (infra/forja-engine, self-hosted).
 *
 * É isto que torna o motor "expansível e adaptável": uma base de conhecimento nova entra
 * implementando `ProvedorConhecimento` e se registrando — nada mais no motor muda. Vários provedores
 * podem rodar no MESMO repo; `fundirGrafos` junta as saídas (dedup por id), porque dois engines veem
 * o mesmo código por ângulos diferentes.
 */
import type { ArvoreEntendimento, Aresta, GrafoConhecimento, Licenca, NoCodigo, PapelModulo } from "./tipos";

/** O que analisar: o repo (owner/name ou URL), um subcaminho, e a ref fixa (o Understand-Anything é FIEL a ela). */
export type AlvoAnalise = { repo: string; caminho?: string; ref?: string };

export type ResultadoProvedor = { grafo: GrafoConhecimento; arvore?: ArvoreEntendimento; licenca?: Licenca };

/** Um engine de conhecimento plugado. `analisar` roda no engine self-hosted e devolve a forma unificada. */
export type ProvedorConhecimento = {
  nome: string;        // "graphify" | "understand-anything" | …
  papel: PapelModulo;  // "espelho" (mutável) | "entender" (fiel ao ref)
  analisar(alvo: AlvoAnalise): Promise<ResultadoProvedor>;
};

const REGISTRO = new Map<string, ProvedorConhecimento>();

/** Registra (ou substitui) um provedor pelo nome. */
export function registrarProvedor(p: ProvedorConhecimento): void {
  REGISTRO.set(p.nome, p);
}
export function provedor(nome: string): ProvedorConhecimento | null {
  return REGISTRO.get(nome) ?? null;
}
export function provedores(): ProvedorConhecimento[] {
  return [...REGISTRO.values()];
}
/** só pra teste: esvazia o registro. */
export function _limparProvedores(): void {
  REGISTRO.clear();
}

/**
 * Funde vários grafos num só. PURO. Nós com o mesmo id viram um (mantém o MAIOR grau, acumula as
 * fontes); arestas iguais (de+para+tipo) não duplicam. Assim Graphify e Understand-Anything, vendo o
 * mesmo repo, somam cobertura em vez de brigar.
 */
export function fundirGrafos(grafos: GrafoConhecimento[]): GrafoConhecimento {
  const nos = new Map<string, NoCodigo>();
  for (const g of grafos) {
    for (const n of g.nos) {
      const existente = nos.get(n.id);
      if (!existente) { nos.set(n.id, { ...n, fonte: n.fonte }); continue; }
      nos.set(n.id, {
        ...existente,
        grau: Math.max(existente.grau ?? 0, n.grau ?? 0),
        fonte: [existente.fonte, n.fonte].filter(Boolean).join("+") || undefined,
        caminho: existente.caminho ?? n.caminho,
      });
    }
  }
  const vistas = new Set<string>();
  const arestas: Aresta[] = [];
  for (const g of grafos) {
    for (const a of g.arestas) {
      const chave = `${a.de}\u0000${a.para}\u0000${a.tipo}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      arestas.push(a);
    }
  }
  const raiz = grafos.find((g) => g.raiz)?.raiz;
  return { nos: [...nos.values()], arestas, ...(raiz ? { raiz } : {}) };
}
