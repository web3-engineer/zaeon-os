/**
 * lib/agent/anexos.ts — o arquivo que a pessoa ANEXOU, dentro do harness (F3 de
 * docs/PLANO_HARNESS_AGENTICO.md). PURO (a extração mora em anexos-server.ts).
 *
 * O PROBLEMA (§4.1): `app/api/ai/chat/route.ts` gateia o harness em `!fileData` — com um arquivo
 * anexado o turno cai no streaming legado: sem trajectory, sem tools, sem RAG, sem memória e sem a
 * rede de honestidade da F0. Um documento anexado é o caso ACADÊMICO por excelência, e era o que
 * desligava justamente a camada que serve pra ele. (Com VÁRIOS arquivos o harness já ficava ligado,
 * porque o lote não manda `fileData` — ou seja: 1 arquivo = modo burro, 2 = modo esperto. Invertido.)
 *
 * A ARMADILHA, e por que não basta apagar o `!fileData`: as chamadas do harness vão pelo envelope,
 * que é TEXTO (é o que nos dá Vertex + pool + reserva HF). Deixar o anexo passar sem mais nada faria
 * o harness IGNORAR o arquivo — pior que hoje. Então o texto é extraído ANTES (o mesmo pdf-loader
 * que a rota já usa pro PDF grande) e entra como evidência, por uma tool.
 *
 * E O LIMITE HONESTO: imagem e PDF ESCANEADO não têm texto pra extrair, e só o caminho multimodal
 * os lê. Esses continuam no legado — a troca só acontece quando o harness é melhor, nunca por
 * simetria.
 */

/** Um anexo do turno, já com o texto extraído (atravessa a fila do CHAT_BG como JSON). */
export type AnexoDoTurno = {
  /** estável dentro do turno (`a1`, `a2`…): é o que o modelo usa pra pedir um específico */
  id: string;
  nome: string;
  tipo: string;
  texto: string;
  paginas?: number;
};

/**
 * Abaixo disto a extração não deu texto aproveitável (PDF escaneado, só imagem) — e aí o caminho
 * legado multimodal é o ÚNICO que lê o arquivo. 400 caracteres é menos de meia página: é piso de
 * "veio algo", não de qualidade.
 */
export const MIN_CHARS_UTIL = 400;

/** Teto por anexo. O mesmo 120k que a rota já aplica ao PDF grande (route.ts) — não invento outro. */
export const MAX_CHARS_ANEXO = 120_000;

/**
 * Quanto `ler_anexo` devolve por chamada. 24k é a mesma ordem do `ORCAMENTO_HISTORICO` do harness —
 * o teto que esta casa já considera aceitável pra "muito texto no prompt". Cobre um artigo típico
 * inteiro; documento maior que isso precisa de uma segunda chamada (com `de`), que é onde a F2 entra.
 */
export const MAX_CHARS_TRECHO = 24_000;

/** Quantos anexos o plano determinístico lê sozinho. Mesmo teto do `MAX_URLS`. */
export const MAX_ANEXOS_NO_PLANO = 3;

/** O anexo tem texto que valha a pena? (o que decide harness × caminho legado) */
export function anexoUtil(a: Pick<AnexoDoTurno, "texto">): boolean {
  return String(a?.texto ?? "").trim().length >= MIN_CHARS_UTIL;
}

/** Corta o texto no teto, sem partir no meio de uma palavra quando der. */
export function cortarTexto(texto: string, max = MAX_CHARS_ANEXO): string {
  const t = String(texto ?? "");
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const espaco = corte.lastIndexOf(" ");
  return espaco > max * 0.9 ? corte.slice(0, espaco) : corte;
}

/** Monta o anexo a partir do texto cru já extraído. */
export function anexoDe(i: { id: string; nome: string; tipo: string; texto: string; paginas?: number }): AnexoDoTurno {
  return {
    id: i.id,
    nome: String(i.nome ?? "arquivo").slice(0, 160),
    tipo: String(i.tipo ?? ""),
    texto: cortarTexto(String(i.texto ?? "").trim()),
    ...(i.paginas ? { paginas: i.paginas } : {}),
  };
}

// ───────────────────────────── o inventário (contexto e `listar_anexos`) ─────────────────────────────

const mil = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));

/** Uma linha por anexo: id, nome, tamanho. NUNCA o conteúdo — ele vem pela tool, uma vez só. */
export function inventarioDosAnexos(anexos: readonly AnexoDoTurno[]): string {
  if (!anexos.length) return "";
  return anexos
    .map((a) => `- ${a.id}: "${a.nome}"${a.paginas ? `, ${a.paginas} ${a.paginas === 1 ? "página" : "páginas"}` : ""} (${mil(a.texto.length)} caracteres)`)
    .join("\n");
}

/**
 * O bloco que vai no `systemContext`. Diz o que ESTÁ anexado e que o conteúdo chega pela ferramenta —
 * o texto inteiro NÃO entra aqui de propósito: duplicaria 120 mil caracteres no prompt e tiraria a
 * única fonte da verdade do lugar certo (a evidência).
 */
export function blocoDosAnexos(anexos: readonly AnexoDoTurno[]): string {
  if (!anexos.length) return "";
  return [
    `A pessoa anexou ${anexos.length} ${anexos.length === 1 ? "arquivo" : "arquivos"} a esta conversa:`,
    inventarioDosAnexos(anexos),
    "O conteúdo chega pela ferramenta de leitura do anexo. Se a pergunta for sobre o arquivo e nada " +
    "vier da leitura, diga isso — não invente o que ele diz.",
  ].join("\n");
}

// ───────────────────────────── o recorte (`ler_anexo`) ─────────────────────────────

export type Trecho = {
  texto: string;
  de: number;
  ate: number;
  total: number;
  /** chegou ao fim do documento? (se não, há mais a pedir com `de: ate`) */
  fim: boolean;
};

/**
 * Um pedaço do anexo, a partir de `de`. `de` fora da faixa é PRESO na faixa em vez de devolver vazio:
 * modelo erra o número, e um trecho vazio seria lido como "o documento acabou".
 */
export function trechoDoAnexo(a: AnexoDoTurno, opts: { de?: number; chars?: number } = {}): Trecho {
  const total = a.texto.length;
  // `Math.max(0, NaN)` é NaN — número inválido tem de virar o padrão ANTES da conta, senão o NaN
  // atravessa e o `slice` devolve string vazia, que o modelo leria como "o documento acabou".
  const num = (v: unknown, padrao: number) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : padrao);
  const chars = Math.min(Math.max(1, num(opts.chars, MAX_CHARS_TRECHO)), MAX_CHARS_TRECHO);
  const de = Math.min(Math.max(0, num(opts.de, 0)), Math.max(0, total - 1));
  const ate = Math.min(total, de + chars);
  return { texto: a.texto.slice(de, ate), de, ate, total, fim: ate >= total };
}

/** O `claim` que vira evidência. Diz de que arquivo é e se SOBROU documento — senão o modelo trata
 *  um recorte como o todo e afirma que "o artigo não menciona X" tendo lido um terço dele. */
export function claimDoTrecho(a: AnexoDoTurno, t: Trecho): string {
  const faixa = t.de === 0 && t.fim
    ? "documento completo"
    : `caracteres ${t.de}–${t.ate} de ${t.total}${t.fim ? ", até o fim" : " — HÁ MAIS DEPOIS DISTO"}`;
  return `Anexo ${a.id} "${a.nome}" (${faixa}):\n${t.texto}`;
}

/** Acha o anexo por id ou por nome (o modelo às vezes manda o nome). */
export function acharAnexo(anexos: readonly AnexoDoTurno[], ref: string): AnexoDoTurno | undefined {
  const r = String(ref ?? "").trim().toLowerCase();
  if (!r) return anexos[0];
  return (
    anexos.find((a) => a.id.toLowerCase() === r) ??
    anexos.find((a) => a.nome.toLowerCase() === r) ??
    anexos.find((a) => a.nome.toLowerCase().includes(r))
  );
}

// ───────────────────────────── a flag ─────────────────────────────

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/**
 * `HARNESS_ANEXO=1`: PDF anexado com texto aproveitável entra no HARNESS (laço, tools, RAG, memória
 * e a rede da F0). OFF (padrão) = o arquivo segue no caminho legado multimodal, byte a byte o de hoje.
 *
 * Imagem e PDF escaneado seguem no legado COM A FLAG LIGADA — não é limitação da flag, é que só o
 * caminho multimodal os lê.
 */
/**
 * LIGADO POR PADRÃO (decisão do dono, 2026-11-03: "queremos tudo ON"). `HARNESS_ANEXO=0` é o kill-switch.
 * Antes era o inverso — OFF até alguém pôr a Variable. O caminho antigo continua a um `0` de
 * distância, e é runtime: não precisa rebuild, só recriar o web.
 */
export function anexoNoHarnessLigado(env: Record<string, string | undefined> = process.env): boolean {
  return !DESLIGADO.test(env.HARNESS_ANEXO?.trim() ?? "");
}
