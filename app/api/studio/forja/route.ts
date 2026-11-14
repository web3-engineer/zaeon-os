/**
 * /api/studio/forja — o ESTUDO DE REPOSITÓRIO (motor Forja) na Sala de Estudos: board n8n (cards-módulo
 * conectados) + regulador de temperatura. Como a rota do caderno, NÃO gera com modelo: serve o ESQUELETO
 * CURADO (lib/forja/cursoRepo) pronto. O grafo/árvore vêm do engine (Graphify/Understand) depois.
 *
 * POST { cursoId?|topic? } → { id, status:"done", title, meta } na hora. Reusa o artefato do aluno
 * (curado é determinístico — não duplica a cada abertura).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { montarCursoEsqueleto } from "@/lib/forja/cursoRepo";
import { resolverEsqueleto } from "@/lib/forja/esqueletoResolver";
import { conteudoCuradoDoCurso } from "@/lib/forja/conteudoCurado";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-forja", "ai-light");
  if (!rl.ok) return rl.response;

  const body = (await req.json().catch(() => ({}))) as { cursoId?: unknown; topic?: unknown };
  const pedido = typeof body.cursoId === "string" ? body.cursoId : typeof body.topic === "string" ? body.topic : "exemplo";
  const esq = resolverEsqueleto(pedido); // catálogo curado OU skill-curso de código (astropy, pandas…)
  if (!esq) return NextResponse.json({ error: "curso_inexistente" }, { status: 404 });
  const curso = montarCursoEsqueleto(esq);

  // Camada 0 (base curada): o curso.json/SKILL.md é o que ENSINA, sem depender do motor. Preenche a
  // árvore (que nasceria só com a raiz) e as lições reais (prova/sandbox) por nó. Determinístico, então
  // recalcula a cada abertura — não depende do que ficou no artefato cacheado.
  const curado = conteudoCuradoDoCurso(esq);
  if (curado) curso.arvore = curado.arvore;
  const licoesPorNo = curado?.licoesPorNo ?? {};

  const chave = `forja:${esq.id}`;
  const existente = await prisma.studioArtifact.findFirst({
    where: { ownerId: userId, kind: "forja", sourceIds: { has: chave }, status: "done" },
    orderBy: { createdAt: "desc" },
  });
  const art = existente ?? (await prisma.studioArtifact.create({
    data: { ownerId: userId, sourceIds: [chave], kind: "forja", status: "done", title: esq.titulo, mime: "application/json", meta: curso as unknown as object },
  }));

  return NextResponse.json({ id: art.id, status: "done", title: esq.titulo, meta: { ...curso, licoesPorNo } });
}
