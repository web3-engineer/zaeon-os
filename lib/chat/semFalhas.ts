/**
 * #873 PR 3 · o "não consegui ler" NÃO CONTAMINA as próximas respostas.
 *
 * No teste dos PDFs, uma resposta de falha ("Não consegui ler o arquivo…", "Não consegui responder agora") ficava no
 * histórico, e nas perguntas seguintes a IA lia a própria falha e a repetia — mesmo quando o arquivo já estava legível.
 * O aviso de falha é para a TELA, não é conversa: sai do histórico que vai para o modelo. (A pergunta do aluno fica.)
 */

/** frases de falha (as do site e as que a própria IA escreve). Só valem em mensagem CURTA: uma resposta longa que
 *  começa assim e segue explicando é conteúdo, não aviso. */
const FALHA_RE = /^\s*(\*\*)?(n[aã]o consegui (ler|abrir|responder|acessar|processar)|sem conex[aã]o com a aura|desculpe,? (houve|ocorreu) um erro)/i;
const MAX_AVISO = 400;

export function ehAvisoDeFalha(texto: string): boolean {
  const t = String(texto ?? "");
  return t.length <= MAX_AVISO && FALHA_RE.test(t);
}

type Entrada = { role: string; parts: { text: string }[] };

/** tira do histórico as respostas da IA que são só aviso de falha. PURO. */
export function semFalhasNoHistorico<T extends Entrada>(history: readonly T[]): T[] {
  return history.filter((h) => h.role !== "model" || !ehAvisoDeFalha(h.parts?.[0]?.text ?? ""));
}
