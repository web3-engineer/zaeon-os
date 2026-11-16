/**
 * VÍDEO DO DOCUMENTO — o servidor: o TEXTO do documento, a FILA com teto e o `garantirVideo` (um vídeo por documento).
 *
 * - Texto: com DOI, resolvido PELO DOI (Unpaywall/arXiv/scholar — nunca pela URL que a resposta da IA citou: assim o
 *   vídeo público não se envenena); PDF por URL sem DOI, baixado com as travas anti-SSRF e teto de bytes
 *   (lib/estudos/linkVivo `baixarPdfSeguro`); base da pessoa pelo markdown do RAG, SÓ se ela pode ver o documento;
 *   trabalho pelo conteúdo do ResearchWork dela. Sem texto = `error: sem_texto` (o card mostra).
 * - Fila: no máximo 2 gerando ao mesmo tempo (o Vertex já deu 429 aqui) e 6 vídeos novos por pessoa por dia. O deploy
 *   é um processo só (server.js), então as TRAVAS em memória (por pessoa e por documento) fecham a corrida do teto e a
 *   geração em dobro. Um job que sumiu num restart (queued/running parado há 30 min) é refeito.
 * - Um vídeo por documento: a CHAVE (lib/videodoc/documentos) vai em `StudioArtifact.sourceIds`; documento com DOI
 *   reaproveita o vídeo de qualquer pessoa; o resto é só da pessoa. Quem vê: o dono, todo mundo se é público, ou quem
 *   tem papel num blueprint listado em `meta.blueprints`.
 */
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
import type { Documento } from "@/lib/blueprint/tipos";
import { chaveDocumento, documentoPublico, temFonteDeTexto } from "./documentos";
import { depsReais, gerarVideoDoc, type MetaVideoDoc } from "./gerar-server";

export const videoDocOn = (): boolean => process.env.VIDEO_DOC === "1";
export const KIND_VIDEO_DOC = "video-doc";
export const MAX_SIMULTANEOS = 2, MAX_POR_DIA = 6, MIN_TEXTO = 1500, MAX_PDF_BYTES = 25 * 1024 * 1024;
/** queued/running sem mexer há tanto tempo = o processo que gerava morreu (deploy/crash) */
export const PARADO_MS = 30 * 60 * 1000;
const ERRO_RETENTA_MS = 24 * 3600 * 1000;

// ───────────── a fila e as travas (no processo do server.js, como o vídeo do Studio) ─────────────
let rodando = 0; const espera: (() => void)[] = [];
export async function naFila<T>(tarefa: () => Promise<T>): Promise<T> {
  if (rodando >= MAX_SIMULTANEOS) await new Promise<void>((r) => espera.push(r));
  rodando++;
  try { return await tarefa(); } finally { rodando--; espera.shift()?.(); }
}
const travas = new Map<string, Promise<unknown>>();
/** uma coisa por vez por chave (a pessoa: o teto do dia; o documento: não gerar duas vezes) */
async function comTrava<T>(chave: string, fn: () => Promise<T>): Promise<T> {
  const antes = travas.get(chave) ?? Promise.resolve();
  const agora = antes.catch(() => null).then(fn);
  travas.set(chave, agora);
  try { return await agora; } finally { if (travas.get(chave) === agora) travas.delete(chave); }
}

// ───────────── o texto ─────────────
const juntar = (ps: { text: string }[]) => ps.map((p) => p.text).join("\n");
const bastante = (t: string | null | undefined) => (t && t.length >= MIN_TEXTO ? t : null);
export async function textoDoDocumento(d: Documento, userId: string): Promise<string | null> {
  try {
    if (d.tipo === "trabalho" && d.ref) {
      const { prisma } = await import("@/src/lib/prisma");
      const w = /^[a-f0-9]{24}$/i.test(d.ref) ? await prisma.researchWork.findFirst({ where: { id: d.ref, userId }, select: { content: true } }) : null;
      return bastante(w?.content);
    }
    if (d.tipo === "base" && d.ref) {
      const [{ ragPg }, { buscarPorId }, { turmasDaPessoa }, { prisma }] = await Promise.all([import("@/lib/rag/pg"), import("@/lib/rag/store"), import("@/lib/rag/turno"), import("@/src/lib/prisma")]);
      const doc = await buscarPorId(ragPg(), d.ref);
      if (!doc) return null;
      // a mesma regra da busca (lib/rag/permissao): dono, ou de uma turma da pessoa
      const dono = doc.donoIds.includes(userId);
      const minhasTurmas = dono ? [] : await turmasDaPessoa(prisma as never, userId);
      if (!dono && !doc.turmaIds.some((t) => minhasTurmas.includes(t))) return null;
      return bastante(doc.markdown);
    }
    const chave = chaveDocumento(d);
    if (chave.startsWith("doi:")) {
      const { resolveFullText } = await import("@/lib/scholar/fulltext");
      const p = await resolveFullText({ id: chave, title: d.titulo, authors: [], doi: chave.slice(4), openAccess: false, sources: [] });
      const rt = p.retrievedText;
      return rt && rt.kind !== "abstract" ? bastante(rt.markdown || juntar(rt.paragraphs)) : null;
    }
    if (!d.url) return null;
    const [{ baixarPdfSeguro }, { extractPdfStructured, extractPdfParagraphs }] = await Promise.all([import("@/lib/estudos/linkVivo"), import("@/lib/scholar/pdf")]);
    const bytes = await baixarPdfSeguro(d.url, MAX_PDF_BYTES);
    if (!bytes) return null;
    const est = await extractPdfStructured(bytes).catch(() => null);
    return bastante(est?.markdown || (est?.paragraphs.length ? juntar(est.paragraphs) : juntar(await extractPdfParagraphs(bytes).catch(() => []))));
  } catch { return null; }
}

// ───────────── um vídeo por documento ─────────────
type Art = { id: string; ownerId: string; status: string; meta: unknown; createdAt: Date; updatedAt?: Date };
export type VideoDb = {
  studioArtifact: {
    findFirst(a: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }): Promise<Art | null>;
    count(a: { where: Record<string, unknown> }): Promise<number>;
    create(a: { data: Record<string, unknown> }): Promise<Art>;
    update(a: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
};
export type GarantirDeps = { db?: VideoDb; texto?: typeof textoDoDocumento; gerar?: (artId: string, titulo: string, texto: string, meta: MetaVideoDoc, userId: string) => Promise<unknown>; agora?: number };

const inicioDoDia = (agora: number) => { const d = new Date(agora); d.setHours(0, 0, 0, 0); return d; };
/** o artefato está "morto"? (erro antigo, ou parado em queued/running — o processo que gerava sumiu) */
export function artefatoMorto(a: { status: string; createdAt: Date; updatedAt?: Date }, agora: number): boolean {
  if (a.status === "error") return agora - a.createdAt.getTime() > ERRO_RETENTA_MS;
  if (a.status === "queued" || a.status === "running") return agora - (a.updatedAt ?? a.createdAt).getTime() > PARADO_MS;
  return false;
}
/** o estado que a pessoa vê: queued/running parado vira erro (o card não fica girando pra sempre) */
export const estadoVisivel = (a: { status: string; createdAt: Date; updatedAt?: Date }, agora = Date.now()): string =>
  (a.status === "queued" || a.status === "running") && artefatoMorto(a, agora) ? "error" : a.status;

export type ResultadoGarantir = { videoId: string; novo: boolean } | { motivo: "limite_do_dia" | "sem_fonte" };

export async function garantirVideo(i: { userId: string; documento: Documento; blueprintId: string } & GarantirDeps): Promise<ResultadoGarantir> {
  if (!temFonteDeTexto(i.documento)) return { motivo: "sem_fonte" };
  const db = i.db ?? ((await import("@/src/lib/prisma")).prisma as unknown as VideoDb);
  const chave = chaveDocumento(i.documento), publico = documentoPublico(i.documento);
  // trava pelo documento (público: de todo mundo; privado: da pessoa) e, dentro, pela pessoa (o teto do dia)
  return comTrava(`doc:${publico ? "" : i.userId}:${chave}`, () => comTrava(`user:${i.userId}`, async () => {
    const agora = i.agora ?? Date.now();
    const ja = await db.studioArtifact.findFirst({ where: { kind: KIND_VIDEO_DOC, sourceIds: { has: chave }, ...(publico ? {} : { ownerId: i.userId }) }, orderBy: { createdAt: "desc" } });
    if (ja && !artefatoMorto(ja, agora)) {
      const meta = (ja.meta ?? {}) as MetaVideoDoc;
      if (i.blueprintId && !meta.blueprints?.includes(i.blueprintId)) await db.studioArtifact.update({ where: { id: ja.id }, data: { meta: { ...meta, blueprints: [...(meta.blueprints ?? []), i.blueprintId].slice(-50) } } });
      return { videoId: ja.id, novo: false };
    }
    if (ja && (ja.status === "queued" || ja.status === "running")) await db.studioArtifact.update({ where: { id: ja.id }, data: { status: "error", error: "interrompido" } });
    const hoje = await db.studioArtifact.count({ where: { ownerId: i.userId, kind: KIND_VIDEO_DOC, createdAt: { gte: inicioDoDia(agora) } } });
    if (hoje >= MAX_POR_DIA) return { motivo: "limite_do_dia" };
    const blueprints = [...new Set([...(((ja?.meta ?? {}) as Partial<MetaVideoDoc>).blueprints ?? []), ...(i.blueprintId ? [i.blueprintId] : [])])];
    const meta: MetaVideoDoc = { chave, publico, blueprints, documento: { titulo: i.documento.titulo, tipo: i.documento.tipo, ...(i.documento.url ? { url: i.documento.url } : {}) } };
    const art = await db.studioArtifact.create({ data: { ownerId: i.userId, kind: KIND_VIDEO_DOC, skin: skinDaVitrine({ kind: KIND_VIDEO_DOC, titulo: i.documento.titulo }), status: "queued", title: i.documento.titulo.slice(0, 200), sourceIds: [chave], meta } });
    const doc = i.documento, userId = i.userId;
    const gerar = i.gerar ?? (async (artId: string, titulo: string, texto: string, m: MetaVideoDoc, uid: string) => gerarVideoDoc(artId, { titulo, texto, meta: m }, await depsReais(uid)));
    // em segundo plano: o texto (pode demorar — PDF) e a geração, dentro da fila
    void naFila(async () => {
      const texto = await (i.texto ?? textoDoDocumento)(doc, userId);
      if (!texto) { await db.studioArtifact.update({ where: { id: art.id }, data: { status: "error", error: "sem_texto" } }); return; }
      await gerar(art.id, doc.titulo, texto, meta, userId);
    }).catch((e) => console.warn("[videodoc] geração falhou:", e instanceof Error ? e.message : e));
    return { videoId: art.id, novo: true };
  }));
}

/** quem pode ver o vídeo (PURO): o dono, qualquer pessoa logada se é público, ou quem tem papel num dos blueprints */
export function podeVerVideo(art: { ownerId: string; meta: unknown }, userId: string, blueprintsComPapel: readonly string[]): boolean {
  if (art.ownerId === userId) return true;
  const m = (art.meta ?? {}) as Partial<MetaVideoDoc>;
  if (m.publico) return true;
  return (m.blueprints ?? []).some((b) => blueprintsComPapel.includes(b));
}
