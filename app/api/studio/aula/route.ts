/**
 * /api/studio/aula — AULA interativa (Papermorph, Opção A; lib/aula-interativa/*). Gatilho: "me dá uma aula
 * sobre X" (ou um PDF anexado + "aula"). Entrada: tema e/ou PDF; saída: roteiro com cenas,
 * perguntas e narração por beat, que o AulaPlayer toca.
 *
 * POST { topic, contexto?, sala?, pdf?: dataURL, pdfNome?, spaceId? } → { id, status } na hora;
 * gera em BACKGROUND (plano → roteiro → validação → TTS, ~1–3 min) e o cliente faz polling em
 * /api/studio/[id]. Áudio em .studio/<id>-<beat>.mp3, servido por /api/studio/[id]/aula/[beat].
 * Cache: mesmo tema + mesma sala (sem PDF), do mesmo aluno, por 7 dias — aula é cara de gerar.
 */
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { gerarAula, type PdfAnexo } from "@/lib/aula-interativa/gerar";
import { sintetizarGemini, gravarEmStudio } from "@/lib/aula-interativa/narracao";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEMANA = 7 * 24 * 60 * 60 * 1000;
/** Teto do PDF inline no Gemini (~20 MB de request): acima disso, peça um capítulo. */
const MAX_PDF_B64 = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-aula", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 300) : "";
  const contexto = typeof body.contexto === "string" ? body.contexto.trim().slice(0, 4000) : "";
  const sala = body.sala === "pesquisa" ? "pesquisa" : "estudos";
  let pdf: PdfAnexo | undefined;
  if (typeof body.pdf === "string" && body.pdf) {
    const m = body.pdf.match(/^data:application\/pdf;base64,(.+)$/);
    if (!m) return NextResponse.json({ error: "O anexo da aula precisa ser um PDF." }, { status: 400 });
    if (m[1].length > MAX_PDF_B64) return NextResponse.json({ error: "PDF grande demais pra uma aula — anexe só o capítulo." }, { status: 413 });
    pdf = { base64: m[1], nome: typeof body.pdfNome === "string" ? body.pdfNome.slice(0, 120) : undefined };
  }
  if (!topic && !pdf) return NextResponse.json({ error: "Diga o tema da aula (ou anexe um PDF)." }, { status: 400 });

  const chave = createHash("sha256").update(`${sala}|${topic.toLowerCase()}|${pdf ? createHash("sha256").update(pdf.base64).digest("hex") : ""}`).digest("hex").slice(0, 32);
  const recentes = await prisma.studioArtifact.findMany({
    where: { ownerId: userId, kind: "aula", status: "done", createdAt: { gte: new Date(Date.now() - SEMANA) } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const pronta = recentes.find((a) => (a.meta as any)?.chave === chave);
  if (pronta) return NextResponse.json({ ...pronta, cached: true });

  const titulo = topic || pdf?.nome || "Aula";
  const art = await prisma.studioArtifact.create({
    data: {
      ownerId: userId,
      sourceIds: typeof body.spaceId === "string" && body.spaceId ? [body.spaceId] : [],
      kind: "aula", skin: skinDaVitrine({ kind: "aula", titulo: titulo }),
      status: "queued",
      title: `Aula — ${titulo.slice(0, 80)}`,
      meta: { chave, topic, sala, ...(pdf ? { pdfNome: pdf.nome ?? "PDF" } : {}) } as any,
    },
  });
  void gerarEmSegundoPlano(art.id, { tema: topic, contexto, sala, pdf, chave });
  return NextResponse.json(art);
}

async function gerarEmSegundoPlano(id: string, o: { tema: string; contexto: string; sala: string; pdf?: PdfAnexo; chave: string }) {
  try {
    await prisma.studioArtifact.update({ where: { id }, data: { status: "running" } }).catch(() => {});
    const r = await gerarAula(
      { tema: o.tema, contexto: o.contexto || undefined, sala: o.sala, pdf: o.pdf },
      { sintetizar: sintetizarGemini, gravarAudio: gravarEmStudio(id) },
    );
    if (!r.ok) throw new Error(r.motivo);
    await prisma.studioArtifact.update({
      where: { id },
      data: {
        status: "done",
        mime: "application/json",
        title: r.aula.titulo,
        meta: { chave: o.chave, topic: o.tema, sala: o.sala, aula: r.aula, tempos: r.tempos, semAudio: r.semAudio, ...(o.pdf ? { pdfNome: o.pdf.nome ?? "PDF" } : {}) } as any,
      },
    });
  } catch (e: any) {
    await prisma.studioArtifact.update({ where: { id }, data: { status: "error", error: String(e?.message || e).slice(0, 500) } }).catch(() => {});
  }
}
