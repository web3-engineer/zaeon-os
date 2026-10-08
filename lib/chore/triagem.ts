/**
 * lib/chore/triagem.ts — a "terceira saída" da triagem do canal (Fatia 7, G5b), aditiva.
 * A triagem completa (lib/canal/triagem.ts) é da Fatia 3 e ainda não existe; isto é só o ramo chore,
 * PURO, e conservador: EM DÚVIDA, TURNO (regra §3.4).
 *
 *   URL http(s) + verbo curto (resume, o que diz, lê, abre, confere, checa) e SEM substantivo de
 *   entregável (relatório, dossiê, artigo, TCC…) → { tipo: "resumir_link", url }.
 *   "https://x" sozinho, ou pedido de entregável → null (vira turno / tarefa).
 */
const URL_RE = /\bhttps?:\/\/[^\s<>()"']+/i;
const VERBO_CURTO = /\b(resum\w*|o que (?:diz|fala)|l[eê]\b|leia|abre|abra|confer\w*|cheq\w*|checa\w*|d[aá] uma olhada)\b/i;
const ENTREGAVEL = /\b(relat[oó]rio|dossi[eê]|artigo|tcc|monografia|apresenta[cç][aã]o|slides?|trabalho|resenha|an[aá]lise completa|revis[aã]o sistem[aá]tica|plano de|projeto|ensaio|fichamento)\b/i;

const norm = (s: string) => (s || "").normalize("NFC");

export type PedidoChore = { tipo: "resumir_link"; url: string };

export function pedidoDeChore(texto: string): PedidoChore | null {
  const t = norm(texto);
  const m = URL_RE.exec(t);
  if (!m) return null;
  const url = m[0].replace(/[.,;:!?]+$/, "");
  const resto = t.replace(m[0], " ");
  if (ENTREGAVEL.test(resto)) return null;
  if (!VERBO_CURTO.test(resto)) return null;
  return { tipo: "resumir_link", url };
}
