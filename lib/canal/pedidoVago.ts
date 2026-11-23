/**
 * #868 — pedido sem assunto ("me ajude com resumi", "resume", "explica isso").
 *
 * O que aconteceu (21/11): no escritório, "@zaeon me ajude com resumi" virou o resumo de um caso de
 * motorista de caminhão, citando "Direito profissional — questões de prova (MMLU pt)". A busca na base
 * (lib/rag/turno) deixa passar trecho que casa POR TEXTO mesmo com similaridade baixa; com um pedido sem
 * assunto, qualquer trecho que tenha "resumo" ou "ajuda" ganha, e o agente trata esse trecho como o tema.
 *
 * Aqui: se, tirando as palavras de pedido ("resume", "ajuda", "explica"…) e as de ligação, não sobra
 * nenhuma palavra de assunto, o pedido é vago. O turno do canal então:
 *  - não consulta a base (não há assunto pra buscar — só ruído);
 *  - se houve um pedido de ação, recebe a instrução de usar a conversa do canal e, se ela não deixar claro,
 *    perguntar o que a pessoa quer, em vez de inventar um tema.
 */

/** Tira acento: "Resumão" → "Resumao" (a caixa fica — "C" e "R" sozinhos são assunto). */
function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Verbos/substantivos de PEDIDO (o que fazer), sem dizer sobre o quê. Inclui erros de digitação comuns. */
const PEDIDOS = new Set([
  "ajuda", "ajude", "ajudar", "ajudem", "ajudinha", "help",
  "resumo", "resumi", "resume", "resuma", "resumir", "resumao", "resumu", "sintetiza", "sintetize", "summarize", "summary",
  "explica", "explique", "explicar", "explicacao",
  "traduz", "traduza", "traduzir", "traducao",
  "revisa", "revise", "revisar", "revisao", "corrige", "corrija", "corrigir", "correcao",
  "melhora", "melhore", "melhorar", "analisa", "analise", "analisar",
  "faz", "faca", "fazer", "faze", "cria", "crie", "criar", "escreve", "escreva", "escrever",
  "organiza", "organize", "organizar", "continua", "continue", "continuar",
  "ensina", "ensine", "ensinar", "calcula", "calcule", "calcular", "resolve", "resolva", "resolver",
  "responde", "responda", "responder", "mostra", "mostre", "mostrar", "lista", "liste", "listar",
  "compara", "compare", "comparar", "simplifica", "simplifique", "simplificar", "reescreve", "reescreva", "reescrever",
]);

/** Palavras de ligação, cortesia e referência vaga — não dizem o assunto. */
const VAZIAS = new Set([
  "me", "mim", "eu", "meu", "minha", "meus", "minhas", "voce", "vc", "vcs", "tu", "te", "nos", "gente",
  "com", "um", "uma", "uns", "umas", "o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "ou",
  "em", "no", "na", "nos", "nas", "por", "pra", "pro", "para", "sobre", "ai", "ae", "aqui", "la", "agora",
  "isso", "isto", "esse", "essa", "este", "esta", "aquilo", "nisso", "nesse", "nessa", "disso", "desse", "dessa",
  "algo", "coisa", "coisas", "tipo", "so", "rapidinho", "rapido", "favor", "pf", "pfv", "pfvr", "please", "pls",
  "pode", "podes", "poderia", "consegue", "conseguiria", "quero", "queria", "preciso", "precisava", "gostaria",
  "oi", "ola", "opa", "ei", "hey", "ok", "beleza", "blz", "obrigado", "obrigada", "valeu",
  "tudo", "td", "bom", "boa", "bons", "boas", "dia", "tarde", "noite", "certo", "tranquilo", "joia", "salve", "fala",
  "que", "q", "nao", "sim", "ver", "olha", "olhar", "da", "dar", "tem", "como", "mais", "bem",
]);

export type LeituraDoPedido = {
  /** sem nenhuma palavra de assunto — não vale buscar na base */
  semAssunto: boolean;
  /** pediu uma ação (resumir, explicar…) sem dizer sobre o quê */
  vago: boolean;
};

/** Lê o pedido (já sem os @). Texto vazio = sem assunto e não vago (não há pedido). */
export function lerPedido(texto: string): LeituraDoPedido {
  const palavras = semAcento(texto)
    .replace(/@[\w.-]+/g, " ")
    // "me dá uma força", "uma mão", "uma luz" = ajuda (sozinhas, "força" e "luz" podem ser o assunto de física)
    .replace(/\buma (forca|forcinha|mao|maozinha|luz|luzinha)\b/gi, " ajuda ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (!palavras.length) return { semAssunto: true, vago: false };
  let pediu = false;
  let assunto = 0;
  for (const original of palavras) {
    const p = original.toLowerCase();
    if (PEDIDOS.has(p)) { pediu = true; continue; }
    if (VAZIAS.has(p)) continue;
    // número solto ("2") ou letra minúscula sozinha não é assunto; "C", "R" (linguagens), "ENEM", "pH", "DNA" é
    if (/^\d+$/.test(p) || (p.length < 2 && !/^[A-Z]$/.test(original))) continue;
    assunto++;
  }
  return { semAssunto: assunto === 0, vago: assunto === 0 && pediu };
}

/** Instrução extra do turno quando o pedido é vago (vai no contexto do sistema do agente). */
export const INSTRUCAO_PEDIDO_VAGO =
  "O pedido desta vez NÃO diz o assunto (ex.: \"me ajuda com resumo\"). Use a conversa do canal para entender do que se trata. " +
  "Se ela não deixar claro, NÃO escolha um tema por conta própria nem use material de fora: pergunte em UMA frase curta o que a pessoa quer " +
  "(ex.: \"Resumo de quê? Me manda o texto, o arquivo ou o assunto.\").";
