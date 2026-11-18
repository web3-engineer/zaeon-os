/**
 * /api/studio/diagram — diagrama INTERATIVO de um assunto (archify; lib/studio/diagram.ts).
 *
 * POST { topic, contexto?, formato?: "auto"|"mapa", sala?, spaceId? } → { id, status } na hora;
 * a geração (Gemini escreve o IR → archify valida/renderiza) roda em BACKGROUND, como o texto e
 * o podcast do Studio, e o cliente faz polling em /api/studio/[id]. O HTML standalone vai pra
 * .studio/<id>.html e é servido por /api/studio/[id]/file (com CSP sandbox — ver lá).
 *
 * Cache: o mesmo assunto + a mesma explicação, do mesmo aluno, nas últimas 24 h → devolve o
 * pronto (perguntar de novo não queima outra geração).
 */
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext } from "@/lib/studio/content";
import { writeStudioFile } from "@/lib/studio/storage";
import { gerarDiagrama, type FormatoDiagrama } from "@/lib/studio/diagram";

export const runtime = "nodejs";
export const maxDuration = 60;

const DIA = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-diagram", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const spaceId = typeof body.spaceId === "string" && body.spaceId ? body.spaceId : undefined;
  let topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 300) : "";
  const contexto = typeof body.contexto === "string" ? body.contexto.trim().slice(0, 4000) : "";
  const formato: FormatoDiagrama = body.formato === "mapa" ? "mapa" : "auto";
  const sala = body.sala === "pesquisa" ? "pesquisa" : "estudos";

  if (!topic && spaceId) topic = ((await loadStudyContext({ ownerId: userId, spaceId })).title || "").trim();
  if (!topic) return NextResponse.json({ error: "Diga o assunto do diagrama." }, { status: 400 });

  const chave = createHash("sha256").update(`${formato}|${sala}|${topic.toLowerCase()}|${contexto}`).digest("hex").slice(0, 32);
  const recentes = await prisma.studioArtifact.findMany({
    where: { ownerId: userId, kind: "diagram", status: "done", createdAt: { gte: new Date(Date.now() - DIA) } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const pronto = recentes.find((a) => (a.meta as any)?.chave === chave);
  if (pronto) return NextResponse.json({ ...pronto, cached: true });

  const art = await prisma.studioArtifact.create({
    data: {
      ownerId: userId,
      sourceIds: spaceId ? [spaceId] : [],
      kind: "diagram", skin: skinDaVitrine({ kind: "diagram", titulo: topic }),
      status: "queued",
      title: `Diagrama — ${topic.slice(0, 80)}`,
      meta: { chave, topic, formato } as any,
    },
  });
  void gerarEmSegundoPlano(art.id, { topic, contexto, formato, sala, chave });
  return NextResponse.json(art);
}

async function gerarEmSegundoPlano(
  id: string,
  o: { topic: string; contexto: string; formato: FormatoDiagrama; sala: string; chave: string },
): Promise<void> {
  try {
    await prisma.studioArtifact.update({ where: { id }, data: { status: "running" } }).catch(() => {});
    const r = await gerarDiagrama({ topic: o.topic, contexto: o.contexto || undefined, formato: o.formato, sala: o.sala });
    if (!r.ok) throw new Error(r.motivo);
    await writeStudioFile(id, "html", Buffer.from(r.html, "utf8"));
    // O IR fica guardado (sem o catálogo de tradução, que é fixo) — dá pra re-renderizar/editar depois.
    const { translations: _t, ...meta } = r.ir.meta ?? {};
    await prisma.studioArtifact.update({
      where: { id },
      data: {
        status: "done",
        mime: "text/html",
        storageRef: "html",
        title: r.titulo,
        meta: { chave: o.chave, topic: o.topic, formato: o.formato, tipo: r.tipo, tentativas: r.tentativas, ir: { ...r.ir, meta } } as any,
      },
    });
  } catch (e: any) {
    await prisma.studioArtifact.update({
      where: { id },
      data: { status: "error", error: String(e?.message || e).slice(0, 500) },
    }).catch(() => {});
  }
}
