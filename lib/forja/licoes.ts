/**
 * lib/forja/licoes.ts — monta as LIÇÕES de um estudo de repositório, por temperatura. PURO.
 *
 * Cada temperatura cobra formatos diferentes (lib/forja/temperatura.cobrancaDaTemperatura): básico só
 * pergunta; quanto mais quente, mais formatos e, no topo, o CODEBOX — a "boa e velha digitação" (cola
 * bloqueada) que o dono pediu. As refs de cada lição apontam pros nós mais centrais do grafo (ou, antes
 * do engine rodar, pras lições da tour), nunca cópia de código.
 */
import type { CursoRepo, Licao, TipoLicao, Temperatura } from "./tipos";
import { cobrancaDaTemperatura } from "./temperatura";

const TITULO_LICAO: Record<TipoLicao, string> = {
  leetcode: "Desafio de código",
  review: "Revisão de código (code review)",
  perguntas: "Perguntas de compreensão",
  teste: "Escreva um teste",
  entrevista: "Simulação de entrevista",
  codebox: "Digite você mesmo (sem colar)",
};

/** Os ids dos nós mais centrais do curso (maior grau); vazio antes do engine rodar. PURA. */
export function refsPrincipais(curso: CursoRepo, n = 3): string[] {
  return [...curso.grafo.nos]
    .sort((a, b) => (b.grau ?? 0) - (a.grau ?? 0))
    .slice(0, n)
    .map((x) => x.id);
}

/** As lições de uma temperatura, já tituladas e com semColar no codebox. PURA e determinística. */
export function licoesDaTemperatura(curso: CursoRepo, temp: Temperatura): Licao[] {
  const { licoes } = cobrancaDaTemperatura(temp);
  const refs = refsPrincipais(curso);
  return licoes.map((tipo) => ({
    id: `${temp}:${tipo}`,
    tipo,
    titulo: TITULO_LICAO[tipo],
    temperatura: temp,
    refs,
    ...(tipo === "codebox" ? { semColar: true } : {}),
  }));
}

/** Tem alguma lição de digitação (codebox) nesta temperatura? PURA. */
export function exigeCodebox(temp: Temperatura): boolean {
  return cobrancaDaTemperatura(temp).licoes.includes("codebox");
}
