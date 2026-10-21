/**
 * POST /api/admin/rag/busca { turmaId, pergunta } (só admin) ⇒ { trechos, ms }.
 * "Testar busca" do admin: mesma busca híbrida do chat, no escopo { userId: admin, turmaIds: [turmaId] }.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { buscar } from "@/lib/rag/busca";
import { embedVertex } from "@/lib/rag/embed";
import { ehBancoIndisponivel, ragPg } from "@/lib/rag/pg";
import { contarBase } from "@/lib/rag/store";

export async function POST(req: Request) {
  const a = await assertAdmin();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });
  const corpo = await req.json().catch(() => null);
  const turmaId = typeof corpo?.turmaId === "string" ? corpo.turmaId : "";
  const pergunta = typeof corpo?.pergunta === "string" ? corpo.pergunta.trim() : "";
  if (!turmaId || !pergunta) return NextResponse.json({ error: "turmaId_e_pergunta_obrigatorios" }, { status: 400 });
  const usuario = await (prisma as any).user.findUnique({ where: { email: a.email }, select: { id: true } });
  if (!usuario) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const t0 = Date.now();
  try {
    const trechos = await buscar(
      { db: ragPg(), embed: embedVertex, contar: (e) => contarBase(ragPg(), e) },
      { userId: usuario.id, turmaIds: [turmaId] },
      pergunta,
    );
    return NextResponse.json({ trechos, ms: Date.now() - t0 });
  } catch (e) {
    if (!ehBancoIndisponivel(e)) throw e;
    // Postgres fora do ar (tailnet/env): a UI mostra "banco da base fora do ar — tente de novo", não um 500 genérico.
    console.error("[rag/admin] busca: banco indisponível:", (e as Error)?.message);
    return NextResponse.json({ error: "banco_indisponivel" }, { status: 503 });
  }
}
