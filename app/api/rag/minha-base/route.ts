/**
 * /api/rag/minha-base (usuário logado) — a base PESSOAL do RAG, alimentada pelo chat (F3).
 *  GET                        ⇒ { documentos, enviados, limite } (os da pessoa, sem markdown)
 *  POST   multipart arquivos  ⇒ { resultados } (até 10 PDFs por chamada; o chat manda 1 por vez, 2 em paralelo)
 *  DELETE ?documentoId=       ⇒ { resultado: "removida" | "documento_apagado" } (tira só a permissão DELA)
 *
 * O dono vem SÓ da sessão: PDF do aluno vai pra base pessoal dele (`donoId`), nunca pra turma.
 * Teto: LIMITE_PESSOAL documentos enviados (os gerados pelo chat não contam); no teto recusa e avisa, nada é apagado sozinho.
 * Postgres da base fora do ar ⇒ 503 { error: "banco_indisponivel" } (o chat mostra "tente de novo").
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/agent/transcript";
import { ingerirPdf, ingerirTexto } from "@/lib/rag/ingerir";
import { blocosDeTexto, ehArquivoTexto, textoDeBytes, tituloDeTexto } from "@/lib/rag/textoArquivo";
import { ehBancoIndisponivel, ragPg } from "@/lib/rag/pg";
import { buscarPorId, contarEnviadosPessoais, listarDocumentos, removerPermissao } from "@/lib/rag/store";
import { extractPdfStructured } from "@/lib/scholar/pdf";
import { enfileirarIndexacao } from "@/lib/queue/rag";
import { LIMITE_PESSOAL } from "@/lib/rag/minhaBase";

const MAX_ARQUIVOS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const naoLogado = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const indisponivel = (extra: Record<string, unknown> = {}) => NextResponse.json({ error: "banco_indisponivel", ...extra }, { status: 503 });
const ehPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const usuario = () => resolveUserId().catch(() => null);

export async function GET() {
  const userId = await usuario();
  if (!userId) return naoLogado();
  try {
    const db = ragPg();
    const [documentos, enviados] = await Promise.all([listarDocumentos(db, { donoId: userId }), contarEnviadosPessoais(db, userId)]);
    return NextResponse.json({
      documentos: documentos.map((d) => ({
        id: d.id, titulo: d.titulo, nomeArquivo: d.nomeArquivo, paginas: d.paginas, status: d.status, erro: d.erro, createdAt: d.createdAt,
      })),
      enviados,
      limite: LIMITE_PESSOAL,
    });
  } catch (e) {
    if (!ehBancoIndisponivel(e)) throw e;
    console.error("[rag/minha-base] listar: banco indisponível:", (e as Error)?.message);
    return indisponivel();
  }
}

/**
 * Arquivo de texto (.txt/.md) pelo MESMO caminho do PDF — dedupe por hash, corte em trechos, fila
 * de vetores. A diferença é que os blocos vêm da ESTRUTURA do próprio arquivo (`textoArquivo` lê os
 * `#` como heading com nível), pro caminho do trecho ("título › capítulo › seção") sobreviver — é
 * ele que faz a citação ser rastreável até o pedaço certo.
 */
function ingerirArquivoDeTexto(db: ReturnType<typeof ragPg>, bytes: Uint8Array, nomeArquivo: string, userId: string) {
  const conteudo = textoDeBytes(bytes);
  const titulo = tituloDeTexto(nomeArquivo, conteudo);
  return ingerirTexto(
    { db, enfileirar: enfileirarIndexacao },
    {
      titulo, texto: conteudo, chave: nomeArquivo, blocos: blocosDeTexto(conteudo, titulo),
      origem: "chat", criadoPor: userId, permissao: { donoId: userId },
    },
  );
}

export async function POST(req: Request) {
  const userId = await usuario();
  if (!userId) return naoLogado();
  let fd: FormData;
  try { fd = await req.formData(); } catch { return NextResponse.json({ error: "form_invalido" }, { status: 400 }); }
  const arquivos = fd.getAll("arquivos").filter((x): x is File => typeof x !== "string");
  if (arquivos.length === 0) return NextResponse.json({ error: "sem_arquivos" }, { status: 400 });
  if (arquivos.length > MAX_ARQUIVOS) return NextResponse.json({ error: "max_10_arquivos" }, { status: 400 });

  const out: Array<Record<string, unknown>> = [];
  for (const f of arquivos) {
    const texto = ehArquivoTexto(f);
    if (!ehPdf(f) && !texto) { out.push({ nomeArquivo: f.name, documentoId: "", status: "erro", erro: "nao_suportado", trechos: 0, paginas: 0 }); continue; }
    try {
      const db = ragPg();
      // Conta a cada arquivo: o lote (ou outra aba) pode ter enchido a base no meio do caminho.
      if ((await contarEnviadosPessoais(db, userId)) >= LIMITE_PESSOAL) {
        out.push({ nomeArquivo: f.name, documentoId: "", status: "erro", erro: "limite_base", trechos: 0, paginas: 0 });
        continue;
      }
      const bytes = new Uint8Array(await f.arrayBuffer());
      const r = texto
        ? await ingerirArquivoDeTexto(db, bytes, f.name, userId)
        : await ingerirPdf(
            { db, extrair: extractPdfStructured, enfileirar: enfileirarIndexacao },
            { bytes, nomeArquivo: f.name, origem: "chat", criadoPor: userId, permissao: { donoId: userId } },
          );
      if (r.erro === "banco_indisponivel") return indisponivel({ resultados: out }); // sem banco, o resto do lote também falharia
      out.push({ nomeArquivo: f.name, ...r });
    } catch (e) {
      if (ehBancoIndisponivel(e)) {
        console.error("[rag/minha-base] ingestão: banco indisponível:", (e as Error)?.message);
        return indisponivel({ resultados: out });
      }
      console.error("[rag/minha-base] ingestão falhou:", (e as Error)?.message); // sem nome do arquivo: é do aluno
      out.push({ nomeArquivo: f.name, documentoId: "", status: "erro", erro: "leitura_falhou", trechos: 0, paginas: 0 });
    }
  }
  return NextResponse.json({ resultados: out });
}

export async function DELETE(req: Request) {
  const userId = await usuario();
  if (!userId) return naoLogado();
  const documentoId = new URL(req.url).searchParams.get("documentoId") ?? "";
  if (!documentoId) return NextResponse.json({ error: "documentoId_obrigatorio" }, { status: 400 });
  if (!UUID.test(documentoId)) return NextResponse.json({ error: "documento_inexistente" }, { status: 404 });
  try {
    const db = ragPg();
    const doc = await buscarPorId(db, documentoId);
    // Documento alheio responde igual a inexistente: não confirma que o id existe.
    if (!doc || !(doc.donoIds ?? []).includes(userId)) return NextResponse.json({ error: "documento_inexistente" }, { status: 404 });
    const resultado = await removerPermissao(db, documentoId, { donoId: userId });
    return NextResponse.json({ resultado });
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    if (ehBancoIndisponivel(e)) {
      console.error("[rag/minha-base] remover: banco indisponível:", msg);
      return indisponivel();
    }
    if (/^documento .+ não existe$/.test(msg)) return NextResponse.json({ error: "documento_inexistente" }, { status: 404 });
    console.error("[rag/minha-base] remover falhou:", msg);
    return NextResponse.json({ error: "falha_ao_remover" }, { status: 500 });
  }
}
