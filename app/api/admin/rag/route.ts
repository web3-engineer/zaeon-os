/**
 * /api/admin/rag (só admin) — base de conhecimento por turma (RAG F1).
 *  GET    ?turmaId=                    ⇒ { turmas, documentos } (documentos da turma, sem markdown)
 *  POST   multipart turmaId + arquivos ⇒ { resultados } (até 10 PDFs por chamada; a UI manda 1 por vez)
 *  DELETE ?documentoId=&turmaId=       ⇒ { resultado: "removida" | "documento_apagado" }
 * Postgres da base fora do ar (tailnet/env) em qualquer método ⇒ 503 { error: "banco_indisponivel" } (a UI mostra "tente de novo").
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { ingerirPdf } from "@/lib/rag/ingerir";
import { ehBancoIndisponivel, ragPg } from "@/lib/rag/pg";
import { listarDocumentos, removerPermissao } from "@/lib/rag/store";
import { extractPdfStructured } from "@/lib/scholar/pdf";
import { enfileirarIndexacao } from "@/lib/queue/rag";

const MAX_ARQUIVOS = 10;

const negado = (status: 401 | 403) => NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });
const indisponivel = (extra: Record<string, unknown> = {}) => NextResponse.json({ error: "banco_indisponivel", ...extra }, { status: 503 });
const ehPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

export async function GET(req: Request) {
  const a = await assertAdmin();
  if (!a.ok) return negado(a.status);
  const turmaId = new URL(req.url).searchParams.get("turmaId") ?? "";
  const turmas = await (prisma as any).turma.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  let documentos: Awaited<ReturnType<typeof listarDocumentos>> = [];
  try {
    if (turmaId) documentos = await listarDocumentos(ragPg(), { turmaId });
  } catch (e) {
    if (!ehBancoIndisponivel(e)) throw e;
    console.error("[rag/admin] listar: banco indisponível:", (e as Error)?.message);
    return indisponivel();
  }
  return NextResponse.json({ turmas, documentos });
}

export async function POST(req: Request) {
  const a = await assertAdmin();
  if (!a.ok) return negado(a.status);
  let fd: FormData;
  try { fd = await req.formData(); } catch { return NextResponse.json({ error: "form_invalido" }, { status: 400 }); }
  const turmaId = String(fd.get("turmaId") ?? "");
  const arquivos = fd.getAll("arquivos").filter((x): x is File => typeof x !== "string");
  if (!turmaId) return NextResponse.json({ error: "turmaId_obrigatorio" }, { status: 400 });
  if (arquivos.length === 0) return NextResponse.json({ error: "sem_arquivos" }, { status: 400 });
  if (arquivos.length > MAX_ARQUIVOS) return NextResponse.json({ error: "max_10_arquivos" }, { status: 400 });

  const usuario = await (prisma as any).user.findUnique({ where: { email: a.email }, select: { id: true } });
  if (!usuario) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const out: Array<Record<string, unknown>> = [];
  for (const f of arquivos) {
    if (!ehPdf(f)) { out.push({ nomeArquivo: f.name, status: "erro", erro: "nao_pdf" }); continue; }
    try {
      const r = await ingerirPdf(
        { db: ragPg(), extrair: extractPdfStructured, enfileirar: enfileirarIndexacao },
        { bytes: new Uint8Array(await f.arrayBuffer()), nomeArquivo: f.name, origem: "admin", criadoPor: usuario.id, permissao: { turmaId } },
      );
      if (r.erro === "banco_indisponivel") return indisponivel({ resultados: out }); // sem banco, o resto do lote também falharia
      out.push({ nomeArquivo: f.name, ...r });
    } catch (e) {
      if (ehBancoIndisponivel(e)) {
        console.error("[rag/admin] ingestão: banco indisponível:", f.name, (e as Error)?.message);
        return indisponivel({ resultados: out });
      }
      console.error("[rag/admin] ingestão falhou", f.name, (e as Error)?.message);
      out.push({ nomeArquivo: f.name, documentoId: "", status: "erro", erro: "leitura_falhou", trechos: 0, paginas: 0 });
    }
  }
  return NextResponse.json({ resultados: out });
}

export async function DELETE(req: Request) {
  const a = await assertAdmin();
  if (!a.ok) return negado(a.status);
  const sp = new URL(req.url).searchParams;
  const documentoId = sp.get("documentoId") ?? "";
  const turmaId = sp.get("turmaId") ?? "";
  if (!documentoId || !turmaId) return NextResponse.json({ error: "documentoId_e_turmaId_obrigatorios" }, { status: 400 });
  // id malformado (não é UUID) nem chega ao store: o Postgres lançaria "invalid input syntax for type uuid" => 500 enganoso.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentoId)) return NextResponse.json({ error: "documento_inexistente" }, { status: 404 });
  try {
    const resultado = await removerPermissao(ragPg(), documentoId, { turmaId });
    return NextResponse.json({ resultado });
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    if (ehBancoIndisponivel(e)) {
      console.error("[rag/admin] remover: banco indisponível:", documentoId, msg);
      return indisponivel();
    }
    // o store lança `documento <id> não existe` quando o documento sumiu (lista velha / outro admin removeu)
    if (/^documento .+ não existe$/.test(msg)) return NextResponse.json({ error: "documento_inexistente" }, { status: 404 });
    console.error("[rag/admin] remover falhou", documentoId, msg);
    return NextResponse.json({ error: "falha_ao_remover" }, { status: 500 });
  }
}
