/**
 * lib/lounge3d/mundo.ts — o MUNDO: a sala ÚNICA do cyberespaço que todo mundo divide (bug de out/2026: cada pessoa
 * entrava na SUA sala mais recente — ou criava uma — e duas pessoas só se viam pelo link de convite; a Giulia e o
 * dono não se viam). O mundo é a sala do FUNDADOR (onde já moram a música do lounge, o ritual e o recado do QG):
 *   1. `CYBER_MUNDO_SALA_ID` (env, opcional) — fixa uma sala específica;
 *   2. senão, a sala 3D de um super admin (lib/auth/roles) com MAIS membros (empate → a mais recente) — estável: mexer
 *      numa sala de teste de outro fundador não muda o mundo de lugar.
 * Quem entra no cyberespaço vira MEMBRO dela (idempotente) — membros só crescem, a ordem decide a base de cada um.
 * A aba "Lounge 3D" do laboratório continua com as salas privadas (convite).
 */
import { prisma } from "@/src/lib/prisma";
import { SUPER_ADMINS, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { COWORK_SUBMERSO, KIND_SALA } from "./tipos";

const ehObjectId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);

/** a sala do mundo (null = não há fundador com sala ainda) */
export async function salaDoMundo(): Promise<{ id: string; members: string[] } | null> {
  const fixa = process.env.CYBER_MUNDO_SALA_ID;
  if (ehObjectId(fixa)) {
    const d = await prisma.collabDoc.findUnique({ where: { id: fixa }, select: { id: true, kind: true, members: true } }).catch(() => null);
    if (d && d.kind === KIND_SALA) return { id: d.id, members: d.members };
  }
  const emails = SUPER_ADMINS.map((e) => e.toLowerCase()).filter(Boolean);
  const donos = await prisma.user.findMany({ where: { OR: [...(emails.length ? [{ email: { in: emails } }] : []), { role: SUPER_ADMIN_ROLE }] }, select: { id: true } }).catch(() => []);
  if (!donos.length) return null;
  const salas = await prisma.collabDoc.findMany({ where: { kind: KIND_SALA, OR: [{ sourceType: { isSet: false } }, { sourceType: null }, { sourceType: { not: COWORK_SUBMERSO } }], ownerId: { in: donos.map((u) => u.id) } }, orderBy: { updatedAt: "desc" }, select: { id: true, members: true }, take: 50 }).catch(() => []);
  // sort estável: com o mesmo nº de membros, fica a ordem do banco (a mais recente primeiro)
  const d = [...salas].sort((a, b) => b.members.length - a.members.length)[0];
  return d ? { id: d.id, members: d.members } : null;
}

/** entra no mundo: vira membro (se ainda não é) e devolve o id da sala */
export async function entrarNoMundo(userId: string): Promise<string | null> {
  const m = await salaDoMundo();
  if (!m) return null;
  if (!m.members.includes(userId)) await prisma.collabDoc.update({ where: { id: m.id }, data: { members: { push: userId } } });
  return m.id;
}
