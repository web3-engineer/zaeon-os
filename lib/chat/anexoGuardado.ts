/**
 * #873 PR 4 · O ANEXO SOBREVIVE AO RECARREGAR. O anexo de cada conversa (#875) vivia só na memória da aba: no teste de
 * 25/11 a Zaeon reiniciou (deploy), a página recarregou e as duas conversas voltaram sem o PDF.
 *
 * O PDF em si já fica no aparelho (a Biblioteca guarda o arquivo no IndexedDB pelo mesmo id — lib/pdfStore). Aqui fica
 * só o PONTEIRO de cada conversa ({ id, nome }), no localStorage: pequeno, e o arquivo grande nunca vai pra lá.
 * Imagem (`img-…`) e lote não entram: a imagem não está na Biblioteca, e o lote segue pela base. PURO + localStorage.
 */
export type AnexoGuardado = { id: string; nome: string };

const CHAVE = (sala: string) => `zaeon.anexoPorConversa.v1:${sala}`;
/** as conversas mais recentes bastam: o mapa não cresce sem fim */
export const MAX_CONVERSAS_GUARDADAS = 50;

type Mapa = Record<string, AnexoGuardado & { em: number }>;

function ler(sala: string): Mapa {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE(sala)) || "null");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Mapa) : {};
  } catch {
    return {};
  }
}

export function lerAnexoGuardado(sala: string, conversa: string | null | undefined): AnexoGuardado | null {
  if (!conversa) return null;
  const g = ler(sala)[conversa];
  return g && typeof g.id === "string" && typeof g.nome === "string" ? { id: g.id, nome: g.nome } : null;
}

/** `anexo` null (o ×, ou virou lote) apaga o da conversa. */
export function gravarAnexoGuardado(sala: string, conversa: string | null | undefined, anexo: AnexoGuardado | null, agora = Date.now()): void {
  if (!conversa) return;
  const m = ler(sala);
  if (!anexo || anexo.id.startsWith("img-")) delete m[conversa];
  else m[conversa] = { id: anexo.id, nome: anexo.nome, em: agora };
  const ficam = Object.entries(m).sort((a, b) => b[1].em - a[1].em).slice(0, MAX_CONVERSAS_GUARDADAS);
  try {
    localStorage.setItem(CHAVE(sala), JSON.stringify(Object.fromEntries(ficam)));
  } catch { /* sem armazenamento (aba anônima cheia): fica só na memória, como antes */ }
}
