/**
 * lib/forja/cursoRepo.ts — o ESQUELETO CURADO de um estudo de repositório (o "nós curamos" do modelo
 * híbrido, como o cadernoRitmo das Jornadas). O board (cards-módulo conectados + temperatura) já nasce
 * pronto aqui; o grafo/árvore vêm do engine (Graphify/Understand) depois, pela A2. PURO e determinístico.
 */
import type { CursoRepo, EsqueletoRepo, Licenca, GrafoConhecimento, ArvoreEntendimento } from "./tipos";
import { modulosPadrao } from "./curso";
import { INICIANTES } from "./catalogoIniciantes";

export type { EsqueletoRepo } from "./tipos";

/** As licenças dos engines que alimentam a Forja — atribuição preservada e exibida no board. */
export const LICENCAS_ENGINES: Licenca[] = [
  { spdx: "Apache-2.0 OR MIT", titular: "Graphify-Labs", url: "https://github.com/Graphify-Labs/graphify" },
  { spdx: "MIT", titular: "Yuxiang Lin; Infinite Universe, Inc.", url: "https://github.com/Egonex-AI/Understand-Anything" },
];

/** Catálogo curado de esqueletos: o genérico "exemplo" + os 10 projetos OSS para iniciantes (Fase C). */
export const ESQUELETOS: EsqueletoRepo[] = [
  {
    id: "exemplo",
    repo: "owner/exemplo",
    titulo: "Estudo de repositório",
    resumo: "Entenda o código de verdade: a Zaeon lê o repo, monta o mapa e te conduz do básico ao avançado.",
    modo: "curso",
  },
  ...INICIANTES,
];

/** Acha um esqueleto pelo id; sem id casa, cai no primeiro (há sempre ao menos um). PURA. */
export function esqueletoPorId(id: string | undefined | null): EsqueletoRepo | undefined {
  const chave = String(id || "").trim().toLowerCase();
  return ESQUELETOS.find((e) => e.id === chave) ?? (chave ? undefined : ESQUELETOS[0]);
}

const GRAFO_VAZIO: GrafoConhecimento = { nos: [], arestas: [] };

/** Monta o CursoRepo-esqueleto: board e temperatura prontos; grafo/árvore vazios até o engine preencher. PURA. */
export function montarCursoEsqueleto(esq: EsqueletoRepo): CursoRepo {
  const arvore: ArvoreEntendimento = {
    raiz: { id: "raiz", titulo: esq.titulo, resumo: esq.resumo, desde: "basico", refs: [], filhos: [] },
  };
  return {
    repo: esq.repo,
    modo: esq.modo,
    grafo: GRAFO_VAZIO,
    arvore,
    modulos: modulosPadrao(esq.modo),
    licoes: [],
    licencas: [...(esq.licenca ? [esq.licenca] : []), ...LICENCAS_ENGINES],
  };
}

/** Atalho: do id do esqueleto ao CursoRepo pronto (o que a rota serve). PURA. */
export function cursoEsqueletoPorId(id: string | undefined | null): CursoRepo | undefined {
  const esq = esqueletoPorId(id);
  return esq ? montarCursoEsqueleto(esq) : undefined;
}
