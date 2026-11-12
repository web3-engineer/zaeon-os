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

/**
 * O PORTÃO DO ARTEFATO DE ANATOMIA: só viaja a peça que o atlas consegue mostrar ISOLADA.
 *
 * O artefato de anatomia nasce de três lugares — o pedido (acima), o campo `estruturas` que o modelo
 * extrai da própria resposta, e um `artifacts` explícito do modelo — e nos dois últimos o título é
 * texto de modelo: pode ser uma classe ("osso"), o corpo ("human body"), ou algo que o atlas não
 * tem. Antes, isso só era descoberto no cliente, com um cartão que falhava ou abria errado.
 *
 * `resolver` é `cenaDoConceito` (injetado, para este módulo seguir puro): ele já recusa classe
 * genérica, corpo inteiro e cena não isolada (lib/anatomia/isolamento). O que ele recusa NÃO VIAJA —
 * carregar o que não é a parte pedida é erro, e erro não vira cartão. O que ele aceita viaja com o
 * NOME CANÔNICO do atlas, que é o que a rota do cartão resolve de volta para a mesma peça.
 * E uma só: resposta não é galeria de órgãos.
 */
export function validarArtefatosDeAnatomia(
  artefatos: readonly StudioRef[],
  resolver: (titulo: string) => { ok: true; nome: string } | { ok: false },
): StudioRef[] {
  const out: StudioRef[] = [];
  let jaTemPeca = false;
  for (const a of artefatos) {
    if (String(a.studioKind) !== "anatomia") { out.push(a); continue; }
    if (jaTemPeca) continue;
    const r = resolver(String(a.title ?? ""));
    if (!r.ok) continue;
    out.push({ ...a, title: r.nome });
    jaTemPeca = true;
  }
  return out;
}
