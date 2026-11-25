/**
 * #873 PR 3 (parte 2) · a correção do #868 no CHAT DA AURA: quando NÃO buscar na base.
 *
 * No teste do resumo (D5), com o PDF anexado, o quadro "Trechos usados por documento" trouxe "Direito profissional —
 * questões de prova (MMLU pt)", "Dengue", "Tuberculose", "Medicina geral": a busca roda com a pergunta inteira, e
 * "resuma o documento" não tem assunto nenhum — a busca devolve o que estiver mais perto, e o mais perto é lixo.
 * O #868 já tinha corrigido isso no Escritório (lib/canal/pedidoVago); aqui é o mesmo critério no chat.
 *
 * - Pedido SEM ASSUNTO ("resume", "me explica isso"): não busca na base.
 * - Com ARQUIVO ANEXADO: "o documento", "o arquivo", "o pdf"… apontam pro anexo — não contam como assunto. E as bases
 *   PÚBLICAS da área (ENEM, MMLU, Wikipédia…) ficam de fora: a pergunta é sobre o arquivo; a base PESSOAL continua
 *   (pode ser o próprio arquivo, já guardado).
 * PURO.
 */
import { lerPedido } from "@/lib/canal/pedidoVago";

/** palavras que, com um anexo, só apontam pra ele ("resuma o documento", "o que diz esse PDF?") */
const APONTA_O_ANEXO = /\b(documentos?|arquivos?|pdfs?|textos?|anexos?|materia(l|is)|apostilas?|pagina|paginas|pag|conteudo|diz|dizem|fala|falam|trata|contem)\b/gi;

export type BuscaDoTurno = {
  /** buscar na base (pessoal + áreas)? */
  buscar: boolean;
  /** incluir as bases públicas da área? */
  areasPublicas: boolean;
  /** pediu uma ação sem dizer o assunto e SEM anexo ("resume") — a Aura usa a conversa ou pergunta "de quê?" */
  vago: boolean;
};

export function buscaDoTurno(i: { pergunta: string; temAnexo: boolean }): BuscaDoTurno {
  const semAcento = String(i.pergunta ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const pergunta = i.temAnexo ? semAcento.replace(APONTA_O_ANEXO, " ") : semAcento;
  const leitura = lerPedido(pergunta);
  if (leitura.semAssunto) return { buscar: false, areasPublicas: false, vago: leitura.vago && !i.temAnexo };
  return { buscar: true, areasPublicas: !i.temAnexo, vago: false };
}
