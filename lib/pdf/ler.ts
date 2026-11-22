/**
 * lib/pdf/ler.ts — a SKILL DE LEITURA DE PDF da Zaeon. Um caminho só, usado pela base do aluno (lib/rag/ingerir), pelo
 * anexo do chat (lib/agent/anexos-server) e, por eles, pelo gerador de trabalhos e pela skill de trechos.
 *
 * Por que existe (nov/2026): a base do aluno lia PDF SÓ pelo pdf-loader. Com o serviço fora do ar, sem PDF_LOADER_URL
 * ou lento, o PDF não entrava ("leitura_falhou") — sem plano B. O anexo do chat tinha reserva própria, a base não.
 *
 *   1. pdf-loader (opendataloader-pdf): ordem de leitura, títulos, tabelas, página de cada parágrafo — o melhor leitor;
 *   2. RESERVA pdf.js: roda no próprio servidor, sem serviço externo; reconstrói linhas e parágrafos pela posição
 *      vertical do texto (o extrator antigo juntava a página inteira num parágrafo só) e mantém a página;
 *   3. PDF ESCANEADO (só imagem): não há texto pra extrair sem OCR — diz isso, em vez de virar documento vazio;
 *   4. PDF PROTEGIDO por senha: idem.
 *
 * Toda leitura diz QUEM leu (`leitor`): é o diagnóstico de produção ("o pdf-loader está mesmo de pé?").
 */
import type { Block, Paragraph } from "@/lib/scholar/types";
import type { StructuredText } from "@/lib/scholar/pdf";

export type Leitor = "pdf-loader" | "pdfjs";
export type LeituraPdf = { ok: true; leitor: Leitor; markdown: string; paragraphs: Paragraph[]; blocks: Block[]; paginas: number; tentativas: string[] };
export type FalhaPdf = { ok: false; motivo: "escaneado" | "protegido" | "leitura_falhou"; tentativas: string[] };

/** Abaixo disto (no documento inteiro) não há texto de verdade — é imagem (escaneado). */
export const MIN_CHARS_TEXTO = 80;

export type DepsLeitura = {
  /** o pdf-loader (default: extractPdfStructured — null sem PDF_LOADER_URL, em erro ou timeout) */
  loader?: (bytes: Uint8Array) => Promise<StructuredText | null>;
  /** o texto por página em linhas, pelo pdf.js (default: linhasDoPdfjs) */
  pdfjs?: (bytes: Uint8Array) => Promise<Array<{ page: number; linhas: Linha[] }>>;
};

/** Uma linha de texto da página com a posição vertical (pra achar quebra de parágrafo). */
export type Linha = { texto: string; y: number; altura: number };

const chars = (ps: readonly { text: string }[]) => ps.reduce((n, p) => n + p.text.replace(/\s+/g, "").length, 0);

/**
 * PURO: linhas da página → parágrafos. Quebra quando o espaço vertical entre duas linhas passa de ~1,6× a altura da
 * linha (o "espaço em branco" de um parágrafo novo) ou quando a linha anterior termina em ponto final e a seguinte é
 * curta demais pra continuar a anterior (título/item). Hifenização no fim da linha é desfeita.
 */
export function paragrafosDasLinhas(page: number, linhas: readonly Linha[]): Paragraph[] {
  const out: Paragraph[] = [];
  let atual: string[] = [];
  let anterior: Linha | null = null;
  const fechar = () => {
    const t = atual.join(" ").replace(/(\p{L})- (\p{Ll})/gu, "$1$2").replace(/\s+/g, " ").trim();
    if (t) out.push({ idx: 0, page, text: t } as Paragraph);
    atual = [];
  };
  for (const l of linhas) {
    const texto = l.texto.replace(/\s+/g, " ").trim();
    if (!texto) continue;
    if (anterior) {
      const gap = Math.abs(anterior.y - l.y);
      const alt = Math.max(anterior.altura, l.altura, 1);
      if (gap > alt * 1.6) fechar();
    }
    atual.push(texto);
    anterior = l;
  }
  fechar();
  return out;
}

/** O pdf.js lendo linha a linha (agrupando os pedaços de texto pela altura em que estão na página). */
export async function linhasDoPdfjs(bytes: Uint8Array): Promise<Array<{ page: number; linhas: Linha[] }>> {
  const pdfjs: any = await (await import("@/lib/pdf/pdfjs")).carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useWorkerFetch: false, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const paginas: Array<{ page: number; linhas: Linha[] }> = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const content = await pg.getTextContent();
    const linhas: Linha[] = [];
    let atual: Linha | null = null;
    for (const it of content.items as any[]) {
      const str = String(it?.str ?? "");
      const y = Number(it?.transform?.[5] ?? 0);
      const altura = Math.abs(Number(it?.height ?? it?.transform?.[3] ?? 10)) || 10;
      if (atual && Math.abs(atual.y - y) <= Math.max(2, altura * 0.3)) {
        atual.texto += (atual.texto.endsWith(" ") || str.startsWith(" ") ? "" : " ") + str;
      } else {
        if (atual) linhas.push(atual);
        atual = { texto: str, y, altura };
      }
      if (it?.hasEOL && atual) { linhas.push(atual); atual = null; }
    }
    if (atual) linhas.push(atual);
    paginas.push({ page: n, linhas });
  }
  return paginas;
}

const blocosDosParagrafos = (ps: readonly Paragraph[]): Block[] => ps.map((p) => ({ type: "paragraph", page: p.page, text: p.text }));

export async function lerPdf(bytes: Uint8Array, d: DepsLeitura = {}): Promise<LeituraPdf | FalhaPdf> {
  const tentativas: string[] = [];
  // 1 · pdf-loader
  const loader = d.loader ?? (async (b: Uint8Array) => (await import("@/lib/scholar/pdf")).extractPdfStructured(b));
  const doLoader = await loader(bytes).catch(() => null);
  if (doLoader && chars(doLoader.paragraphs) >= MIN_CHARS_TEXTO) {
    const blocks = doLoader.blocks?.length ? doLoader.blocks : blocosDosParagrafos(doLoader.paragraphs);
    const paginas = Math.max(0, ...blocks.map((b) => b.page ?? 0), ...doLoader.paragraphs.map((p) => p.page ?? 0));
    return { ok: true, leitor: "pdf-loader", markdown: doLoader.markdown ?? blocks.map((b) => b.text).join("\n\n"), paragraphs: doLoader.paragraphs, blocks, paginas, tentativas: ["pdf-loader:ok"] };
  }
  tentativas.push(doLoader ? "pdf-loader:sem_texto" : "pdf-loader:indisponivel");

  // 2 · pdf.js (reserva local)
  let porPagina: Array<{ page: number; linhas: Linha[] }>;
  try {
    porPagina = await (d.pdfjs ?? linhasDoPdfjs)(bytes);
  } catch (e) {
    const msg = String((e as Error)?.name ?? "") + String((e as Error)?.message ?? e);
    // a mensagem curta entra no diagnóstico ("pdfjs:erro:Cannot find module 'canvas'") — sem ela o log não diz nada
    tentativas.push(`pdfjs:erro:${msg.replace(/\s+/g, " ").slice(0, 120)}`);
    return { ok: false, motivo: /password/i.test(msg) ? "protegido" : "leitura_falhou", tentativas };
  }
  const paragraphs = porPagina.flatMap((p) => paragrafosDasLinhas(p.page, p.linhas)).map((p, idx) => ({ ...p, idx }));
  if (chars(paragraphs) < MIN_CHARS_TEXTO) {
    tentativas.push("pdfjs:sem_texto");
    // o loader também não achou texto (ou nem respondeu) e o pdf.js abriu o arquivo sem achar nada: é imagem
    return { ok: false, motivo: "escaneado", tentativas };
  }
  tentativas.push("pdfjs:ok");
  const blocks = blocosDosParagrafos(paragraphs);
  return { ok: true, leitor: "pdfjs", markdown: paragraphs.map((p) => p.text).join("\n\n"), paragraphs, blocks, paginas: porPagina.length, tentativas };
}

/**
 * O adaptador pra quem espera o formato do pdf-loader (`deps.extrair` da ingestão da base): leitura boa vira
 * StructuredText; PDF escaneado vira estrutura VAZIA (a ingestão marca "sem_texto"); falha de leitura vira null
 * ("leitura_falhou"). Loga o leitor — é o diagnóstico de produção.
 */
export async function estruturaDoPdf(bytes: Uint8Array, d: DepsLeitura = {}): Promise<StructuredText | null> {
  const r = await lerPdf(bytes, d);
  console.info("[pdf] leitura:", JSON.stringify(r.ok ? { leitor: r.leitor, paginas: r.paginas, paragrafos: r.paragraphs.length, tentativas: r.tentativas } : { motivo: r.motivo, tentativas: r.tentativas }));
  if (r.ok) return { paragraphs: r.paragraphs, markdown: r.markdown, blocks: r.blocks };
  return r.motivo === "escaneado" ? { paragraphs: [], blocks: [], markdown: "" } : null;
}
