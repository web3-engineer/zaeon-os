import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { generatePrereqs } from "@/lib/scholar/prereqs";
import type { Paper } from "@/lib/scholar/types";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { guard } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  // session.user não carrega id — lookup por email (mesmo padrão das outras rotas).
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const rl = await guard(req, "ai-prereqs", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < 2) return json({ error: "Tópico inválido (mínimo 2 caracteres)." }, 400);

  const references: Paper[] = Array.isArray(body.references) ? body.references : [];
  const insights = body.insights && typeof body.insights === "object" ? body.insights : null;

  try {
    // mesmo (tópico + conjunto de referências) → mesmos prereqs (7d).
    const refKey = references.map((r: any) => r?.doi || r?.title || "").filter(Boolean).sort();
    const result = await cacheJson(hashKey("prereq", { topic, refKey, hasInsights: !!insights }), 60 * 60 * 24 * 7,
      () => generatePrereqs({ topic, references, insights }));
    return json(result, 200);
  } catch (err: any) {
    return json({ error: err?.message ?? "Falha ao gerar conhecimentos prévios." }, 500);
  }
}
