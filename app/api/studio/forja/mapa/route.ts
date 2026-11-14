/**
 * /api/studio/forja/mapa — enche o board da Forja com o MAPA REAL do código. A rota /api/studio/forja serve
 * o esqueleto na hora (rápido); ESTA roda o motor (graphify na ponte), que pode demorar, então tem teto de
 * tempo maior e é chamada preguiçosamente pelo ForjaView. Só analisa repos do CATÁLOGO CURADO (allowlist),
 * nunca um repo arbitrário do aluno. Sem a ponte configurada, devolve `engine:false` e o board fica no esqueleto.
 *
 * POST { cursoId } → { grafo: GrafoConhecimento|null, engine: boolean }
 */
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { resolverEsqueleto } from "@/lib/forja/esqueletoResolver";
import { engineDisponivel, grafoDoRepo } from "@/lib/forja/engineClient";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-forja-mapa", "ai-heavy");
  if (!rl.ok) return rl.response;

  if (!engineDisponivel()) return NextResponse.json({ grafo: null, engine: false });

  const body = (await req.json().catch(() => ({}))) as { cursoId?: unknown };
  const esq = resolverEsqueleto(typeof body.cursoId === "string" ? body.cursoId : "");
  // allowlist: só os repos curados; nunca um repo qualquer que o cliente mandar
  if (!esq || !esq.repo.includes("/") || esq.repo === "owner/exemplo") {
    return NextResponse.json({ grafo: null, engine: true });
  }

  const grafo = await grafoDoRepo(esq.repo).catch(() => null);
  return NextResponse.json({ grafo, engine: true });
}
