import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { generateSuggestion } from "@/lib/scholar/suggest";
import { isLevel } from "@/lib/scholar/levels";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { guard } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  // session.user não carrega id — checa existência por email (mesmo padrão das outras rotas).
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const rl = await guard(req, "ai-research-suggest", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const level = isLevel(body.level) ? body.level : "grad";
  const excludeTitles = Array.isArray(body.exclude_titles)
    ? body.exclude_titles.filter((t: unknown): t is string => typeof t === "string")
    : [];

  if (topic.length < 2) {
    return new Response(JSON.stringify({ error: "Tópico inválido (mínimo 2 caracteres)." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // só cacheia a 1ª página (sem exclusões): "ver mais" sempre gera novidades.
    const produce = () => generateSuggestion({ topic, level, excludeTitles });
    const result = excludeTitles.length
      ? await produce()
      : await cacheJson(hashKey("suggest", { topic, level }), 60 * 60 * 24 * 7, produce);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Falha ao gerar sugestão." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
