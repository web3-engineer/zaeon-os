/**
 * lib/chat/conviteTexto.ts — O TEXTO DO CONVITE: a mensagem que a pessoa cola pra chamar alguém.
 *
 * Pedido do dono (04/nov/2026): o convite devia ser um LINK COLÁVEL com uma frase ("vem estudar
 * comigo sobre ___ aqui na Zaeon!"), não um endereço cru. O link já existia e nunca houve e-mail
 * neste caminho — o que faltava era o texto em volta dele.
 *
 * PURO de propósito. Decide três coisas que erram fácil e caro:
 *
 *  1. O TEMA. A conversa não tem título próprio (as abas são "Conversa" + os documentos), então o
 *     tema vem do trabalho/documento em jogo. E título GENÉRICO ou PROVISÓRIO não serve: um convite
 *     dizendo "vem estudar comigo sobre Documento em preparação" é pior que um sem tema nenhum.
 *  2. O PAPEL. Chamar alguém de "vem estudar comigo" quando o link só dá LEITURA promete mais do que
 *     entrega — a mesma doutrina da rede de honestidade, agora no convite.
 *  3. O TAMANHO e as QUEBRAS. A mensagem é colada em WhatsApp/Telegram: título de 300 caracteres ou
 *     com `\n` no meio quebra a frase e o link.
 */
import type { PapelConvite } from "@/lib/tcc/client";

/** Teto do tema na frase. Acima disto o convite vira parágrafo e o link se perde no meio. */
export const MAX_TEMA = 70;

/**
 * Títulos que NÃO são tema: o provisório que o próprio gerador põe (`TITULO_PROVISORIO` de
 * lib/tcc/turno) e os rótulos genéricos das abas. Comparados sem acento e sem caixa, porque é
 * assim que eles variam na prática.
 */
const GENERICOS = [
  "documento em preparacao", "documento", "trabalho", "tcc", "artigo", "texto",
  "conversa", "a conversa", "sem titulo", "novo documento", "untitled",
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Limpa o que veio do título: uma linha, sem espaço duplo, sem pontuação pendurada no fim. */
function limpar(bruto: string): string {
  const uma = bruto.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return uma.replace(/[\s.,;:!?–—-]+$/u, "").trim();
}

/**
 * O tema do convite, a partir dos candidatos em ordem de preferência (o que está aberto primeiro).
 * Devolve `undefined` quando nenhum serve — e aí a frase sai SEM "sobre", que é melhor do que sair
 * com um buraco ou com um rótulo de sistema.
 */
export function temaDoConvite(candidatos: readonly (string | null | undefined)[]): string | undefined {
  for (const c of candidatos) {
    if (!c) continue;
    const t = limpar(c);
    if (!t) continue;
    // "artigo: a fotossíntese" → o que interessa é o depois dos dois-pontos (o rótulo do tipo vem antes)
    const semRotulo = limpar(t.includes(":") ? t.slice(t.indexOf(":") + 1) : t);
    const alvo = semRotulo || t;
    if (GENERICOS.includes(semAcento(alvo).toLowerCase())) continue;
    if (alvo.length < 3) continue;   // "X" não é tema, é ruído
    return alvo.length > MAX_TEMA ? `${alvo.slice(0, MAX_TEMA - 1).trimEnd()}…` : alvo;
  }
  return undefined;
}

/**
 * A mensagem colável. O verbo muda com o papel porque o convite não pode prometer o que o link não
 * dá: `editor` escreve junto, `leitor` acompanha.
 */
export function mensagemDeConvite(p: { url: string; tema?: string; papel: PapelConvite }): string {
  const sobre = p.tema ? ` sobre ${p.tema}` : "";
  const frase = p.papel === "editor"
    ? `Vem estudar comigo${sobre} aqui na Zaeon!`
    : `Vem acompanhar meus estudos${sobre} aqui na Zaeon!`;
  return `${frase} ${p.url}`;
}
