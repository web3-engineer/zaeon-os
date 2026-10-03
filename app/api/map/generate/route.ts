/**
 * POST /api/map/generate { scopeId, topico?, force? } → materializa o cérebro (§2, gatilho = clique
 * na bolinha ou pedido explícito). Enfileira no chain worker; sem fila, roda inline fire-and-forget.
 * Resposta: { enfileirado: boolean, jobId? } — o painel ouve "gerado" no Pusher (ou faz poll).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { entrar, sanitizeScopeId } from "@/lib/map/route-auth";
import { findOwnMapa } from "@/lib/map/store";
import { cerebroJobId, enqueueGenerateMap, processCerebroJob } from "@/lib/map/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const a = await entrar(req, "map-generate", "ai-heavy");
  if ("response" in a) return a.response;
  const body = await req.json().catch(() => ({}));
  const scopeId = sanitizeScopeId(body?.scopeId);
  if (!scopeId) return NextResponse.json({ error: "scopeId inválido" }, { status: 400 });
  const force = body?.force === true;
  const existente = await findOwnMapa(a.userId, "estudos", scopeId);
  if (existente?.backbone.length && !force) return NextResponse.json({ enfileirado: false, pronto: true, mapaId: existente.id });
  // Tópico: o do corpo, senão o título sugerido pelo gatekeeper, senão o título do mapa que os turnos começaram.
  const conv = await prisma.conversation.findFirst({ where: { userId: a.userId, surface: "estudos", scopeId }, select: { tituloSugerido: true, title: true } });
  const topico = (typeof body?.topico === "string" && body.topico.trim().slice(0, 300)) || conv?.tituloSugerido || existente?.titulo || conv?.title || "";
  if (!topico) return NextResponse.json({ error: "Sem tópico pra gerar o cérebro." }, { status: 400 });
  const contexto = typeof body?.contexto === "string" ? body.contexto.slice(0, 1200) : (existente ? existente.nos.slice(0, 12).map((n) => n.label).join("; ") : undefined);
  const data = { userId: a.userId, surface: "estudos" as const, scopeId, topico, contexto, force };
  const enfileirado = await enqueueGenerateMap(data).catch(() => false);
  if (!enfileirado) void processCerebroJob(data).catch((e) => console.warn("[cerebro] geração inline falhou:", e?.message ?? e));
  return NextResponse.json({ enfileirado, jobId: cerebroJobId(a.userId, scopeId) }, { status: 202 });
}
