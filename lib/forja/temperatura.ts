/**
 * lib/forja/temperatura.ts — o regulador 🌡️ da Forja. PURO.
 *
 * O botão de temperatura do dono controla DUAS coisas ao mesmo tempo: quanto a IA explica, e quanto
 * ela cobra. Básico = fundações; Médio = o que faz funcionar; Avançado = arquitetura inteira, todas
 * as chamadas, scanner 100%. Aqui ficam as três operações puras que isso implica:
 *   - podar a ÁRVORE de entendimento (só o que entra naquela temperatura);
 *   - escolher o subgrafo "quente" (as partes que a lição foca);
 *   - dizer quais LIÇÕES e se exige digitação (a cobrança sobe com a temperatura).
 */
import type { ArvoreEntendimento, GrafoConhecimento, NoEntendimento, Temperatura, TipoLicao } from "./tipos";

const RANK: Record<Temperatura, number> = { basico: 0, medio: 1, avancado: 2 };
export const rankTemperatura = (t: Temperatura): number => RANK[t];

/** Poda a árvore: mantém os nós que entram ATÉ esta temperatura (básico aparece em todas). */
export function arvoreNaTemperatura(arvore: ArvoreEntendimento, temp: Temperatura): ArvoreEntendimento {
  const teto = RANK[temp];
  const podar = (n: NoEntendimento): NoEntendimento | null => {
    if (RANK[n.desde] > teto) return null;
    return { ...n, filhos: n.filhos.map(podar).filter((x): x is NoEntendimento => x !== null) };
  };
  const raiz = podar(arvore.raiz) ?? { ...arvore.raiz, filhos: [] };
  return { raiz };
}

/** Fração do grafo que cada temperatura mostra (básico = só as fundações mais centrais; avançado = tudo). */
const FRACAO: Record<Temperatura, number> = { basico: 0.2, medio: 0.6, avancado: 1 };

/**
 * O subgrafo "quente": no básico, só os nós mais centrais (as fundações — maior grau), mais a raiz;
 * no avançado, o grafo inteiro. As arestas ficam só entre os nós mantidos.
 */
export function grafoNaTemperatura(grafo: GrafoConhecimento, temp: Temperatura): GrafoConhecimento {
  if (temp === "avancado") return grafo;
  const ordenados = [...grafo.nos].sort((a, b) => (b.grau ?? 0) - (a.grau ?? 0));
  const quantos = Math.max(1, Math.ceil(ordenados.length * FRACAO[temp]));
  const mantidos = new Set(ordenados.slice(0, quantos).map((n) => n.id));
  if (grafo.raiz) mantidos.add(grafo.raiz);
  return {
    nos: grafo.nos.filter((n) => mantidos.has(n.id)),
    arestas: grafo.arestas.filter((a) => mantidos.has(a.de) && mantidos.has(a.para)),
    ...(grafo.raiz ? { raiz: grafo.raiz } : {}),
  };
}

export type Cobranca = { licoes: TipoLicao[]; exigeDigitar: boolean };

/** A cobrança de cada temperatura: quais formatos de lição, e se o codebox bloqueia colar (só digitar). */
export function cobrancaDaTemperatura(temp: Temperatura): Cobranca {
  switch (temp) {
    case "basico":
      return { licoes: ["perguntas"], exigeDigitar: false };
    case "medio":
      return { licoes: ["perguntas", "review", "teste"], exigeDigitar: false };
    case "avancado":
      return { licoes: ["leetcode", "review", "perguntas", "teste", "entrevista", "codebox"], exigeDigitar: true };
  }
}
