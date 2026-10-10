/**
 * CORRIDAS de moto do cyberespaço (lib/cyber/corrida):
 *  GET  /api/cyber/corrida?pista=<id> → o RANKING da pista (o melhor tempo de cada pessoa, top 10) + o meu melhor e a
 *       minha posição;
 *  POST /api/cyber/corrida { pista, ms, voltas } → grava uma corrida terminada (logado). O tempo é checado: não pode ser
 *       mais rápido que a pista toda no limite do boost (`tempoMinimo`), as voltas têm que bater com a pista e somar o
 *       total. Devolve o ranking atualizado.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { eu } from "@/lib/lounge3d/server";
import { pistaPorId } from "@/lib/cyber/corrida/pistas";
import { tempoMinimo } from "@/lib/cyber/corrida/corrida";
import { PILOTAGEM } from "@/lib/cyber/motoFisica";

type Linha = { userId: string; nome: string; cor: string; ms: number };

async function ranking(pista: string, userId: string | null) {
  // o melhor de cada um: os 400 melhores tempos da pista, o 1º de cada pessoa
  const tempos = await prisma.corridaTempo.findMany({ where: { pista }, orderBy: { ms: "asc" }, take: 400, select: { userId: true, nome: true, cor: true, ms: true } });
  const vistos = new Set<string>(), melhores: Linha[] = [];
  for (const t of tempos) if (!vistos.has(t.userId)) { vistos.add(t.userId); melhores.push(t); }
  const meu = userId ? melhores.findIndex((l) => l.userId === userId) : -1;
  let eu: { ms: number; posicao: number | null } | null = meu >= 0 ? { ms: melhores[meu]!.ms, posicao: meu + 1 } : null;
  if (!eu && userId) { const m = await prisma.corridaTempo.findFirst({ where: { pista, userId }, orderBy: { ms: "asc" }, select: { ms: true } }); if (m) eu = { ms: m.ms, posicao: null }; }
  return { pista, top: melhores.slice(0, 10).map((l, i) => ({ posicao: i + 1, nome: l.nome, cor: l.cor, ms: l.ms, eu: l.userId === userId })), eu };
}

export async function GET(req: Request) {
  const pista = new URL(req.url).searchParams.get("pista") ?? "";
  if (!pistaPorId(pista)) return NextResponse.json({ error: "pista não existe" }, { status: 404 });
  const me = await eu();
  try { return NextResponse.json(await ranking(pista, me?.id ?? null), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ pista, top: [], eu: null }); }
}

export async function POST(req: Request) {
  const me = await eu(); if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "cyber-corrida", "cyber-corrida"); if (!rl.ok) return rl.response;
  const b = (await req.json().catch(() => ({}))) as { pista?: unknown; ms?: unknown; voltas?: unknown };
  const p = typeof b.pista === "string" ? pistaPorId(b.pista) : undefined;
  if (!p) return NextResponse.json({ error: "pista não existe" }, { status: 404 });
  const ms = Math.round(Number(b.ms)), voltas = Array.isArray(b.voltas) ? b.voltas.map((v) => Math.round(Number(v))) : [];
  const minimo = tempoMinimo(p, PILOTAGEM.velBoost) * 1000;
  const ok = Number.isFinite(ms) && ms >= minimo && ms < 60 * 60 * 1000 && voltas.length === p.voltas && voltas.every((v) => Number.isFinite(v) && v > 0)
    && Math.abs(voltas.reduce((a, v) => a + v, 0) - ms) <= 5 * p.voltas;
  if (!ok) return NextResponse.json({ error: "tempo inválido" }, { status: 400 });
  await prisma.corridaTempo.create({ data: { pista: p.id, userId: me.id, nome: me.name, cor: me.color, ms, voltas } });
  return NextResponse.json(await ranking(p.id, me.id));
}
