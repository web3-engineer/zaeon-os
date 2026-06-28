// Leitura ESTRUTURADA de um PDF já aberto pelo usuário (pdf-loader → markdown + blocks).
// Mesma proteção do proxy /api/ai/scholar/pdf: auth + dono do pdfUrl + SSRF por hop.
// Usado pela "voz no PDF" (lê o markdown) e pela citação clicável (bbox+página).
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isSafePublicHttpUrl } from "@/lib/scholar/ssrf";
import { extractPdfStructured } from "@/lib/scholar/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  const userId = dbUser.id;

  const target = new URL(req.url).searchParams.get("url") ?? "";
  if (!isSafePublicHttpUrl(target)) return new Response("Bad URL", { status: 400 });

  // O URL precisa já existir como pdfUrl em uma das sessões DESTE usuário (mesma regra do proxy).
  const sessions = await prisma.scholarSession.findMany({
    where: { userId },
    select: { references: true },
  });
  const allowed = sessions.some(
    (s) =>
      Array.isArray(s.references) &&
      (s.references as any[]).some((p) => p?.pdfUrl === target),
  );
  if (!allowed) return new Response("Forbidden", { status: 403 });

  // Segue redirects manualmente, validando cada hop contra o guard de SSRF.
  let current = target;
  let upstream: Response | null = null;
  for (let hop = 0; hop < 5; hop++) {
    if (!isSafePublicHttpUrl(current)) {
      return new Response("Blocked redirect to private host", { status: 403 });
    }
    upstream = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/pdf,application/octet-stream,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    const loc = upstream.headers.get("location");
    if (upstream.status >= 300 && upstream.status < 400 && loc) {
      current = new URL(loc, current).toString();
      continue;
    }
    break;
  }
  if (!upstream || !upstream.ok) return new Response("Upstream error", { status: 502 });

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const structured = await extractPdfStructured(bytes); // null se o pdf-loader estiver fora
  if (!structured?.markdown && !(structured?.blocks?.length)) {
    return new Response("pdf-loader indisponível", { status: 503 });
  }

  return new Response(
    JSON.stringify({ markdown: structured.markdown ?? "", blocks: structured.blocks ?? [] }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=3600" } },
  );
}
