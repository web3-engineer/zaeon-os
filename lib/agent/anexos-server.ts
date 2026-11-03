/**
 * lib/agent/anexos-server.ts — extrai o TEXTO do anexo pra ele poder entrar no harness (F3).
 * Server-only (fala com o pdf-loader). A parte pura mora em lib/agent/anexos.ts.
 *
 * A rota já faz essa extração pro PDF GRANDE (o ramo `TOO_BIG` de app/api/ai/chat/route.ts, que
 * estoura o limite inline do Gemini). Aqui ela é o caminho normal, e deixei o ramo legado com o
 * código dele de propósito: a promessa da flag é que, desligada, o caminho de hoje vale byte a byte.
 */
import { anexoDe, anexoUtil, type AnexoDoTurno } from "@/lib/agent/anexos";

type Peça = { mime: string; bytes: Uint8Array };

/** "data:<mime>;base64,XXX" ou base64 cru (o fluxo legado manda PDF sem prefixo). */
export function pecaDoFileData(fileData: string): Peça | null {
  const bruto = String(fileData ?? "");
  if (!bruto) return null;
  const m = /^data:([^;]+);base64,(.*)$/s.exec(bruto);
  const mime = m ? m[1]! : "application/pdf";
  try {
    const b = Buffer.from(m ? m[2]! : bruto, "base64");
    return b.length ? { mime, bytes: new Uint8Array(b) } : null;
  } catch {
    return null;
  }
}

export const ehPdf = (mime: string) => mime === "application/pdf";

/**
 * O texto de um PDF: leitura ESTRUTURADA do pdf-loader (ordem de leitura, títulos, tabelas em
 * markdown) e, sem o serviço, o texto cru do pdf.js. "" quando não deu nada — e aí quem chama manda
 * o turno pro caminho legado, porque PDF escaneado só o multimodal lê.
 */
export async function textoDoPdf(bytes: Uint8Array): Promise<{ texto: string; paginas: number }> {
  const { extractPdfParagraphs, extractPdfStructured } = await import("@/lib/scholar/pdf");
  const est = await extractPdfStructured(bytes).catch(() => null);
  const md = est?.markdown?.trim();
  if (md) return { texto: md, paginas: paginasDe(est?.paragraphs) };
  const juntos = est?.paragraphs?.map((p) => p.text).join("\n\n").trim();
  if (juntos) return { texto: juntos, paginas: paginasDe(est?.paragraphs) };
  const paras = await extractPdfParagraphs(bytes).catch(() => [] as { page: number; text: string }[]);
  return { texto: paras.map((p) => p.text).join("\n\n").trim(), paginas: paginasDe(paras) };
}

/** `page` é opcional no `Paragraph` do pdf.js — daí o `?? 0` em vez de confiar no tipo. */
const paginasDe = (ps?: readonly { page?: number }[]): number =>
  ps?.length ? Math.max(0, ...ps.map((p) => Number(p.page ?? 0) || 0)) : 0;

/**
 * O `fileData` do cliente → os anexos do turno. `[]` significa "o harness NÃO deve pegar este
 * turno": imagem (só o multimodal vê), PDF escaneado (nada a extrair), ou lixo.
 */
export async function anexosDoFileData(fileData: string, nome = "documento"): Promise<AnexoDoTurno[]> {
  const peca = pecaDoFileData(fileData);
  if (!peca || !ehPdf(peca.mime)) return [];   // imagem e companhia: caminho legado
  const { texto, paginas } = await textoDoPdf(peca.bytes).catch(() => ({ texto: "", paginas: 0 }));
  const a = anexoDe({ id: "a1", nome, tipo: peca.mime, texto, paginas });
  return anexoUtil(a) ? [a] : [];
}
