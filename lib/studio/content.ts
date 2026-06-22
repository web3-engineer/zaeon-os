/**
 * Carrega o conteúdo de um estudo (do banco) para alimentar o Studio — equivalente
 * ao `get_context()` do open-notebook. Junta título + texto dos StudyItems num
 * "briefing" único. NÃO baixa PDF externo: usa o que já está no caderno.
 *
 * Acesso por MEMBERSHIP do espaço (dono OU co-autor do Lounge), igual /api/study/items.
 */
import { prisma } from "@/src/lib/prisma";
import { MAX_CONTENT } from "@/lib/studio/transformations";

/** Conjunto de spaceIds que o usuário pode acessar (dono ou membro). */
async function accessibleSpaceIds(ownerId: string, spaceIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(spaceIds.filter(Boolean))];
  if (!unique.length) return new Set();
  const sps = await prisma.studySpace.findMany({
    where: { id: { in: unique }, OR: [{ userId: ownerId }, { members: { has: ownerId } }] },
    select: { id: true },
  });
  return new Set(sps.map((s) => s.id));
}

/** Extrai texto legível de um StudyItem (título + campos de texto do payload + resumo). */
function itemText(it: { title?: string | null; payload?: unknown; summary?: string | null }): string {
  const parts: string[] = [];
  if (it.title) parts.push(String(it.title));
  const p: any = it.payload;
  if (p && typeof p === "object") {
    for (const k of ["text", "content", "body", "summary", "caption", "detail", "note", "url"]) {
      if (typeof p[k] === "string" && p[k].trim()) parts.push(p[k].trim());
    }
  } else if (typeof p === "string" && p.trim()) {
    parts.push(p.trim());
  }
  if (it.summary) parts.push(String(it.summary));
  return parts.join("\n").trim();
}

export interface StudyContext {
  title: string;
  text: string;
  sourceIds: string[];
}

/**
 * Monta o contexto a partir de uma lista de StudyItem ids OU de um spaceId inteiro.
 * Filtra pelos itens que o usuário pode acessar. Trunca em MAX_CONTENT.
 */
export async function loadStudyContext(opts: {
  ownerId: string;
  sourceIds?: string[];
  spaceId?: string;
}): Promise<StudyContext> {
  const { ownerId, sourceIds, spaceId } = opts;
  let items: { id: string; title: string | null; payload: unknown; summary: string | null; spaceId: string }[] = [];

  if (sourceIds?.length) {
    const found = await prisma.studyItem.findMany({ where: { id: { in: sourceIds } } });
    const allowed = await accessibleSpaceIds(ownerId, found.map((i) => i.spaceId));
    items = found.filter((i) => allowed.has(i.spaceId));
  } else if (spaceId) {
    const allowed = await accessibleSpaceIds(ownerId, [spaceId]);
    if (allowed.has(spaceId)) {
      items = await prisma.studyItem.findMany({ where: { spaceId }, orderBy: { createdAt: "asc" } });
    }
  }

  let title = "Estudo";
  if (spaceId) {
    const sp = await prisma.studySpace.findUnique({ where: { id: spaceId }, select: { title: true } });
    if (sp?.title) title = sp.title;
  }

  const text = items.map(itemText).filter(Boolean).join("\n\n").slice(0, MAX_CONTENT);
  return { title, text, sourceIds: items.map((i) => i.id) };
}

/** Compara duas listas de ids como conjuntos (para o cache por sourceIds). */
export function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}
