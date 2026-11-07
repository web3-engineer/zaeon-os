/**
 * lib/agent/tamanho.ts — #728: quando o aluno pede uma resposta CURTA ("em 2 frases", "resumido", "rapidinho").
 * PURO: sem rede, sem modelo, sem DOM. Mesmo molde do lib/agent/tabela.ts: o PEDIDO decide, o prompt avisa e o
 * código garante o que o prompt deixa escapar.
 *
 * O que se viu no ar (07/11): "o que é fotossíntese? responda em 3 frases" voltou com o `nucleo` em 3 frases E um
 * `desenvolvimento` inteiro embaixo — bem mais que 3. E "o que é mitocôndria? responda em 2 frases" ganhou um
 * diagrama interativo que ninguém pediu (a regra do aprender: "o que é X" → diagrama). Pedido de tamanho é o aluno
 * dizendo "só isso": nem parágrafo a mais, nem desenho a mais. Diagrama pedido com todas as letras continua valendo.
 */

const semAcento = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const NUMEROS: Record<string, number> = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5 };

/** "em 2 frases", "em três linhas", "em até 5 frases", "com 3 frases" */
const EM_N = /\b(?:em|com|de)\s+(?:ate\s+|no maximo\s+)?(\d{1,2}|uma|um|duas|dois|tres|quatro|cinco)\s+(frases?|linhas?|paragrafos?)\b/;
/** "numa frase", "numa linha" */
const NUMA = /\bnuma\s+(frase|linha)\b/;
/** pedido de resposta curta sem número */
const CURTO = /\b(resumid[oa]|resumidamente|de forma resumida|bem curt[oa]|resposta curta|de forma curta|curtinh[oa]|rapidinho|em poucas palavras|de forma breve|brevemente|sem enrolar|direto ao ponto|so o basico)\b/;

export type TamanhoPedido = { n?: number; unidade?: "frases" | "linhas" | "paragrafos" };

/** O aluno limitou o tamanho da resposta? `null` = não (o padrão). */
export function tamanhoPedido(objetivo: string): TamanhoPedido | null {
  const t = semAcento(objetivo);
  if (!t.trim()) return null;
  const numa = NUMA.exec(t);
  if (numa) return { n: 1, unidade: numa[1] === "frase" ? "frases" : "linhas" };
  const m = EM_N.exec(t);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
    const u = m[2].startsWith("frase") ? "frases" : m[2].startsWith("linha") ? "linhas" : "paragrafos";
    if (n >= 1 && n <= 20) return { n, unidade: u };
  }
  return CURTO.test(t) ? {} : null;
}

export const pedeRespostaCurta = (objetivo: string): boolean => tamanhoPedido(objetivo) !== null;

const UNIDADE: Record<NonNullable<TamanhoPedido["unidade"]>, [string, string]> = {
  frases: ["frase", "frases"],
  linhas: ["linha", "linhas"],
  paragrafos: ["parágrafo", "parágrafos"],
};

/**
 * A linha do prompt. Sem pedido de tamanho, ela só cobra que o `desenvolvimento` não repita o `nucleo` (no ar, o
 * segundo parágrafo recontava o primeiro com outras palavras).
 */
export function diretrizDeTamanho(objetivo: string): string {
  const p = tamanhoPedido(objetivo);
  if (!p) {
    return "REPETIÇÃO: o `desenvolvimento` continua de onde o `nucleo` parou — traz o que ainda não foi dito. " +
      "Nunca reconte o núcleo com outras palavras.";
  }
  const limite = p.n && p.unidade ? `${p.n} ${UNIDADE[p.unidade][p.n === 1 ? 0 : 1]}` : "poucas frases (no máximo 3)";
  return `TAMANHO: o aluno pediu uma resposta curta — ${limite}. A resposta INTEIRA cabe nisso: escreva tudo no ` +
    "`nucleo` e deixe `desenvolvimento` vazio. Não acrescente parágrafo, exemplo ou resumo além do pedido.";
}

/**
 * O que o prompt deixa escapar: com tamanho pedido, o `desenvolvimento` sai (a resposta é o `nucleo`). Só quando há
 * `nucleo` — nunca deixa o aluno sem resposta.
 */
export function semDesenvolvimentoNaoPedido<T extends { nucleo: string; desenvolvimento?: string }>(answer: T, objetivo: string): T {
  if (!answer.desenvolvimento || !answer.nucleo.trim() || !pedeRespostaCurta(objetivo)) return answer;
  const { desenvolvimento: _fora, ...resto } = answer;
  return resto as T;
}
