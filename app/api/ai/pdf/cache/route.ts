/**
 * /api/ai/pdf/cache — cria um cache do PDF no Vertex (token-saving p/ o chat de PDF).
 * Chamado quando o documento abre. Devolve { cacheName, expireTime } ou { cacheName: null }
 * (PDF pequeno demais p/ cachear ou falha → o cliente faz inline, sem quebrar a tela).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { createPdfCache, isCacheableEstimate } from "@/lib/ai/contextCache";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const rl = await guard(req, "ai-pdf-cache", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const fileData = typeof body.fileData === "string" ? body.fileData : "";
  if (!fileData || !isCacheableEstimate(fileData.length)) {
    return json({ cacheName: null }, 200); // pequeno/desligado → cliente faz inline
  }

  const cache = await createPdfCache({ pdfBase64: fileData });
  if (!cache) return json({ cacheName: null }, 200);
  return json({ cacheName: cache.name, expireTime: cache.expireTime }, 200);
}
