/**
 * /api/studio/device — o PAINEL DE DISPOSITIVO de uma skill família "device" na Sala de Estudos:
 * o botão de download (o espelho), o sha256 de integridade, e as instruções (o corpo do SKILL.md)
 * como cards. Como a rota da Forja, NÃO gera com modelo — serve o que a skill já declara, na hora.
 *
 * Por que uma rota (e não mandar tudo no item da vitrine): o CORPO do SKILL.md é server-only (não
 * vai pro navegador no catálogo). Aqui a gente lê o card + corpo do disco e devolve o painel pronto.
 *
 * POST { slug | topic } → { id, status:"done", title, meta } na hora. Reusa o artefato do aluno.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { carregarSkillsDaCasa, fsDeDisco, cardDaSkill } from "@/lib/agent/skills-dir";
import { moduloDaSkill } from "@/lib/estudos/moduloDoItem";
import type { PainelDevice } from "@/lib/estudos/painelDevice";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-device", "ai-light");
  if (!rl.ok) return rl.response;

  const body = (await req.json().catch(() => ({}))) as { slug?: unknown; topic?: unknown };
  const slug = (typeof body.slug === "string" ? body.slug : typeof body.topic === "string" ? body.topic : "").trim();
  if (!slug) return NextResponse.json({ error: "skill_invalida" }, { status: 400 });

  const s = carregarSkillsDaCasa(fsDeDisco()).skills.find((x) => x.manifest.name === slug);
  const card = s ? cardDaSkill(s) : null;
  // só skill de MÓDULO device, com espelho declarado, abre painel; o resto não é device.
  if (!s || !card || moduloDaSkill(card) !== "device" || !card.device) {
    return NextResponse.json({ error: "skill_inexistente" }, { status: 404 });
  }

  const meta: PainelDevice = {
    slug, titulo: card.titulo, subtitulo: card.subtitulo, device: card.device, corpo: s.corpo,
  };

  const chave = `device:${slug}`;
  const existente = await prisma.studioArtifact.findFirst({
    where: { ownerId: userId, kind: "device", sourceIds: { has: chave }, status: "done" },
    orderBy: { createdAt: "desc" },
  });
  const art = existente ?? (await prisma.studioArtifact.create({
    data: { ownerId: userId, sourceIds: [chave], kind: "device", status: "done", title: card.titulo, mime: "application/json", meta: meta as unknown as object },
  }));

  // devolve o meta FRESCO (corpo/espelho podem ter mudado entre deploys), reusando só a linha do aluno.
  return NextResponse.json({ id: art.id, status: "done", title: card.titulo, meta });
}
