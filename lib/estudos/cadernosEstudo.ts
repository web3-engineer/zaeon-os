import type { Desenho } from "@/lib/harness/caderno/compile";
import { CADERNOS_EXTRA } from "./cadernos";

/** a natureza de uma fonte real (o caderno nunca afirma sem lastro) */
export type FonteTipo = "artigo" | "norma" | "video" | "dataset" | "livro" | "site";
export type Fonte = { titulo: string; url: string; tipo: FonteTipo; nota?: string };

export type BlocoEstudo =
  | { tipo: "texto"; texto: string }
  | { tipo: "prancha"; titulo: string; desenho: Desenho }
  | { tipo: "diagrama"; titulo: string; codigo: string }
  | { tipo: "tarefas"; itens: readonly { id: string; titulo: string; entrega: string }[] }
  | { tipo: "compilado" }
  | { tipo: "video"; titulo: string; youtube: string }
  | { tipo: "licao"; pergunta: string; alternativas: readonly string[]; correta: number; explicacao: string }
  // AS FONTES reais que sustentam a página (regra do dono: tudo já foi feito/pesquisado por alguém).
  | { tipo: "fontes"; titulo?: string; itens: readonly Fonte[] }
  // MOBILIZAÇÃO: a etapa exige um profissional. Explícito + campo interativo que abre vaga no Escritório
  // (canal humano+agente) e a Zaeon gerencia até o estado "feito".
  | { tipo: "mobilizacao"; papel: string; porque: string; entregaEsperada: string; gerenciadoPor?: "zaeon" };

export type CadernoEstudo = {
  id: string;
  titulo: string;
  resumo: string;
  paginas: readonly { id: string; titulo: string; blocos: readonly BlocoEstudo[] }[];
};

const cadernos: readonly CadernoEstudo[] = [...CADERNOS_EXTRA];

export function cadernoEstudo(id: string) {
  return cadernos.find((caderno) => caderno.id === id);
}

/** o card da vitrine tem caderno de campo? (liga cadernoEstudoId em vitrineExemplos) */
export const temCaderno = (id: string): boolean => cadernos.some((c) => c.id === id);
/** os ids com caderno — pros testes e pra UI */
export const idsComCaderno = (): string[] => cadernos.map((c) => c.id);
