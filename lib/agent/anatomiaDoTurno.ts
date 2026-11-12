/**
 * lib/agent/anatomiaDoTurno.ts — quando o pedido nomeia uma parte do corpo, o artefato é a PEÇA. PURO.
 *
 * A decisão que faltava no harness, para quem tem a habilidade `anatomia` (a Zenita):
 *
 *   | o aluno pede…                               | antes                              | agora            |
 *   | "me mostra o fêmur"                         | guia, ou nada                      | o fêmur, isolado |
 *   | "como funciona o coração?"                  | diagrama automático (+ peça, às vezes) | o coração    |
 *   | "desenhe o pulmão"                          | imagem de modelo generativo        | o pulmão         |
 *   | "faz um DIAGRAMA do coração"                | diagrama                           | diagrama (pediu) |
 *   | "como funciona uma vacina?"                 | diagrama                           | diagrama (não há peça) |
 *
 * A regra: o que o aluno pediu COM O NOME ("diagrama", "mapa mental", "flashcards", "aula"…) é dele
 * e fica. Fora disso, se o atlas tem a estrutura que a frase nomeia, a peça substitui o que o turno
 * teria escolhido sozinho (diagrama, imagem, guia) — porque esses três são o palpite do harness, e
 * o atlas é o dado.
 */
import type { StudioRef } from "@/lib/agent/contracts";

const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O aluno pediu OUTRO tipo de artefato pelo nome — e então é esse que ele recebe. */
const PEDIU_PELO_NOME =
  /\b(diagrama|esquema|fluxograma|mapa mental|mindmap|mapa (?:de estudos?|conceitual)|flashcards?|cartoes|linha do tempo|timeline|cronologia|podcast|audio|aula|faq|perguntas e respostas|quiz|guia de estudo|molecula|estrutura (?:molecular|quimica))\b/;

export const pediuOutroArtefato = (objetivo: string): boolean => PEDIU_PELO_NOME.test(norm(objetivo));

/** Os kinds que são PALPITE do harness para "mostrar algo": a peça do atlas os substitui. */
const PALPITES: ReadonlySet<string> = new Set(["diagram", "mindmap", "image", "guide", "anatomia"]);

/**
 * Os artefatos do turno, com a peça do atlas no lugar do palpite.
 *
 * `estrutura` é o que `lib/anatomia/pedido` reconheceu no PEDIDO (null = o pedido não nomeia peça
 * que o atlas tenha). `explicito` marca a peça como pedida com todas as letras — é o que decide, no
 * cliente, se uma falha vira aviso ou silêncio.
 */
export function artefatosComAnatomia(o: {
  artefatos: readonly StudioRef[];
  objetivo: string;
  estrutura: { nome: string } | null;
  explicito?: boolean;
}): StudioRef[] {
  const atuais = [...o.artefatos];
  if (!o.estrutura || pediuOutroArtefato(o.objetivo)) return atuais;
  const peca = { studioKind: "anatomia", title: o.estrutura.nome, ...(o.explicito ? { explicito: true } : {}) } as StudioRef;
  // fica o que NÃO é palpite (a molécula que a resposta citou, o trabalho da Sala de Pesquisa), até o teto de 2
  const resto = atuais.filter((a) => !PALPITES.has(String(a.studioKind)));
  return [peca, ...resto].slice(0, 2);
}
