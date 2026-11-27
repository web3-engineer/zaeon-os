/**
 * /api/studio/forja/progresso — o progresso do ALUNO LOGADO na árvore de um curso (Árvore Neuronal).
 *
 *   GET  ?cursoId=<id>                         → { userId, cursoId, concluidas: string[] }
 *   POST { cursoId, op: "concluir", nos: [...] } → marca lições como concluídas
 *   POST { cursoId, op: "reiniciar" }           → zera o progresso do curso
 *   POST { cursoId, op: "definir", nos: [...] }  → troca o conjunto (sincroniza o que ficou offline)
 *
 * Sem IDOR: o usuário é SEMPRE o da sessão — a rota não aceita userId do cliente. O cursoId tem que
 * existir no catálogo (resolverEsqueleto), e o progresso é pessoal (não há escopo compartilhado).
 * Persistência: lib/knowledge-tree/progressoServidor (coleção skill_progress, namespace curso:<id>).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { resolverEsqueleto } from "@/lib/forja/esqueletoResolver";
import { concluir, definir, lerConcluidas, reiniciar, sanearIds } from "@/lib/knowledge-tree/progressoServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cursoValido = (v: unknown): string | null => {
  if (typeof v !== "string" || !v.trim() || v.length > 200) return null;
  return resolverEsqueleto(v.trim())?.id ?? null;
};

export async function GET(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cursoId = cursoValido(new URL(req.url).searchParams.get("cursoId"));
  if (!cursoId) return NextResponse.json({ error: "curso_inexistente" }, { status: 404 });
  const concluidas = await lerConcluidas(prisma as never, userId, cursoId);
  return NextResponse.json({ userId, cursoId, concluidas });
}

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-forja-progresso", "ai-light");
  if (!rl.ok) return rl.response;
  const body = (await req.json().catch(() => ({}))) as { cursoId?: unknown; op?: unknown; nos?: unknown };
  const cursoId = cursoValido(body.cursoId);
  if (!cursoId) return NextResponse.json({ error: "curso_inexistente" }, { status: 404 });
  const nos = sanearIds(body.nos);
  if (body.op === "concluir") {
    if (!nos.length) return NextResponse.json({ error: "nos_obrigatorios" }, { status: 400 });
    await concluir(prisma as never, userId, cursoId, nos);
  } else if (body.op === "reiniciar") {
    await reiniciar(prisma as never, userId, cursoId);
  } else if (body.op === "definir") {
    await definir(prisma as never, userId, cursoId, nos);
  } else {
    return NextResponse.json({ error: "op_invalida" }, { status: 400 });
  }
  const concluidas = await lerConcluidas(prisma as never, userId, cursoId);
  return NextResponse.json({ userId, cursoId, concluidas });
}
