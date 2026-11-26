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
import { normalizar, normalizarComMapa } from "@/lib/trechos/literal";

export type AnexoDoTurno = {
  /** estável dentro do turno (`a1`, `a2`…): é o que o modelo usa pra pedir um específico */
  id: string;
  nome: string;
  tipo: string;
  texto: string;
  paginas?: number;
  /**
   * ONDE CADA PÁGINA COMEÇA no `texto`: pares [deslocamento, página], em ordem (só PDF). É o que deixa a skill de
   * trechos (lib/trechos) dizer "p. 12" de uma passagem do anexo. Ausente = sem paginação conhecida (Word, texto).
   */
  marcasDePagina?: Array<[number, number]>;
  /**
   * #873 PR 3: o arquivo passou do teto e só o começo veio. `total` = caracteres do arquivo inteiro; `ateAPagina` =
   * a última página que coube (quando se sabe). Sem isto a IA respondia como se tivesse lido tudo — e, sem achar no
   * começo, pegava a resposta de OUTRO documento da base.
   */
  cortado?: { total: number; ateAPagina?: number };
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
  const inteiro = String(i.texto ?? "").trim();
  const texto = cortarTexto(inteiro);
  return {
    id: i.id,
    nome: String(i.nome ?? "arquivo").slice(0, 160),
    tipo: String(i.tipo ?? ""),
    texto,
    ...(i.paginas ? { paginas: i.paginas } : {}),
    ...(texto.length < inteiro.length ? { cortado: { total: inteiro.length } } : {}),
  };
}

/** a última página que coube no texto cortado (pelas marcas de página), pro aviso dizer "li até a p. N" */
export function ultimaPaginaLida(marcas: readonly [number, number][] | undefined): number | undefined {
  return marcas?.length ? marcas[marcas.length - 1]![1] : undefined;
}

// ───────────────────────────── o inventário (contexto e `listar_anexos`) ─────────────────────────────

const mil = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));

/** Uma linha por anexo: id, nome, tamanho. NUNCA o conteúdo — ele vem pela tool, uma vez só. */
export function inventarioDosAnexos(anexos: readonly AnexoDoTurno[]): string {
  if (!anexos.length) return "";
  return anexos
    .map((a) => `- ${a.id}: "${a.nome}"${a.paginas ? `, ${a.paginas} ${a.paginas === 1 ? "página" : "páginas"}` : ""} (${mil(a.texto.length)} caracteres` +
      (a.cortado ? ` lidos de ${mil(a.cortado.total)}${a.cortado.ateAPagina ? `: só até a página ${a.cortado.ateAPagina}` : ": só o começo"}` : "") + ")")
    .join("\n");
}

/**
 * #873 PR 3 · o aviso de arquivo grande. A IA só tem o começo; sem dizer isso, ela respondia "com confiança" uma coisa
 * que estava depois do corte — e, sem achar no começo, usava um trecho de OUTRO documento. PURO.
 */
export function avisoDeCorte(anexos: readonly AnexoDoTurno[]): string {
  return anexos.filter((a) => a.cortado).map((a) => {
    const ate = a.cortado!.ateAPagina ? `até a página ${a.cortado!.ateAPagina}` : "o começo";
    return `ATENÇÃO: "${a.nome}" é maior que o limite de leitura — você só tem ${ate}` +
      (a.paginas ? ` (de ${a.paginas} páginas)` : "") + ". Se a resposta não estiver nessa parte, diga isso com " +
      `franqueza ("li ${ate}; o resto ainda está sendo preparado na sua base — pergunte de novo em alguns minutos") ` +
      "e NÃO responda como se tivesse lido o arquivo inteiro.";
  }).join("\n");
}

/**
 * #873 PR 3 · NÃO MISTURAR DOCUMENTOS. No teste, a pergunta era sobre o manual anexado, e a Aura respondeu com a
 * palavra-código de OUTRO PDF da base, dizendo que era do manual. A base pode trazer trechos de outros arquivos: eles
 * nunca falam pelo anexo. PURO.
 */
export function regraDeNaoMisturar(anexos: readonly AnexoDoTurno[]): string {
  if (!anexos.length) return "";
  const um = anexos.length === 1;
  return `Pergunta sobre ${um ? "o arquivo" : "os arquivos"} ${anexos.map((a) => `"${a.nome}"`).join(", ")} se responde pelo ` +
    `conteúdo ${um ? "dele" : "deles"}. Trecho da base com OUTRO título é de OUTRO documento: nunca atribua a um anexo ` +
    "algo que veio de outro documento. Se usar um trecho desses, diga de qual documento ele veio " +
    "(\"isso está em outro material seu: …\").";
}

/**
 * #873 PR 4 · APONTAR O OUTRO ARQUIVO. No teste de 25/11, com o manual anexado, a pergunta era sobre o Mandacaru-7
 * (outro PDF guardado). A Aura disse "não está nas páginas lidas, procure no capítulo de orçamento" — certo, mas mandou
 * a pessoa procurar no lugar errado. Com os NOMES dos outros arquivos guardados, ela aponta onde provavelmente está.
 * Só nomes: o conteúdo de um arquivo que não foi lido NUNCA é inventado. PURO.
 */
export const MAX_OUTROS_ARQUIVOS = 30;
export function blocoOutrosArquivos(nomes: readonly string[], anexos: readonly AnexoDoTurno[]): string {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\.(pdf|docx|txt|md)$/i, "").trim();
  const anexados = new Set(anexos.map((a) => norm(a.nome)));
  const vistos = new Set<string>();
  const outros = nomes
    .map((n) => String(n ?? "").trim())
    .filter((n) => n && !anexados.has(norm(n)) && !vistos.has(norm(n)) && vistos.add(norm(n)))
    .slice(0, MAX_OUTROS_ARQUIVOS);
  if (!anexos.length || !outros.length) return "";
  return "OUTROS ARQUIVOS GUARDADOS DO ALUNO (só os nomes; você NÃO leu o conteúdo deles neste turno): " +
    outros.map((n) => `"${n}"`).join(", ") + ". Se a resposta NÃO estiver no arquivo anexado e a pergunta combinar " +
    "com um desses nomes (o nome do projeto, do assunto ou do arquivo), diga isso logo no começo: \"isso não está em " +
    "<anexo>; parece estar no seu outro arquivo <nome> — quer que eu olhe nele?\". Nunca diga o que está dentro " +
    "de um arquivo que você não leu; e não mande a pessoa procurar no anexo uma coisa que é de outro arquivo.";
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
    avisoDeCorte(anexos),
    regraDeNaoMisturar(anexos),
  ].filter(Boolean).join("\n");
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

// ───────────────────────────── paginação (pra citar a página de um trecho do anexo) ─────────────────────────────

/**
 * Os parágrafos do extrator (cada um com a página) → onde cada página começa no texto FINAL do anexo. Procura cada
 * parágrafo pra frente, pelo começo normalizado (o markdown do extrator muda espaço, acento e marcação), e só grava
 * quando a página muda. Parágrafo não achado é pulado: melhor uma página a menos que uma página errada.
 */
export function marcasDePagina(texto: string, paragrafos: readonly { page?: number; text?: string }[]): Array<[number, number]> {
  const { n, mapa } = normalizarComMapa(String(texto ?? ""));
  const out: Array<[number, number]> = [];
  let cursor = 0;
  for (const p of paragrafos) {
    const pag = Number(p?.page ?? 0) || 0;
    const chave = normalizar(String(p?.text ?? "")).slice(0, 40);
    if (pag < 1 || chave.length < 12) continue;
    const i = n.indexOf(chave, cursor);
    if (i < 0) continue;
    cursor = i + 1;
    if (out.length && out[out.length - 1]![1] === pag) continue;
    if (out.length && out[out.length - 1]![1] > pag) continue; // página voltando = achado no lugar errado
    out.push([mapa[i]!, pag]);
  }
  return out;
}

/** A página de um deslocamento do texto (0 = desconhecida). */
export function paginaNoOffset(marcas: readonly [number, number][] | undefined, deslocamento: number): number {
  let pag = 0;
  for (const [ini, p] of marcas ?? []) {
    if (ini > deslocamento) break;
    pag = p;
  }
  return pag;
}
