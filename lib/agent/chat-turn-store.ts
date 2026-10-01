/**
 * lib/agent/chat-turn-store.ts — toda escrita/leitura do ChatTurn mora aqui.
 *
 * Um lugar só pra: (1) o runChatTurn e o worker não falarem Prisma direto (testáveis com
 * este módulo mockado); (2) toda leitura por id já vir amarrada ao DONO — não existe
 * `getTurn(id)` sem `userId`, então um endpoint novo não tem como esquecer o filtro e
 * abrir um IDOR.
 */
import { prisma } from "@/src/lib/prisma";
import type { HarnessOutput } from "@/lib/agent/aura-harness";

export type ChatTurnStatus = "queued" | "running" | "done" | "error";
export const CHAT_SURFACES = ["estudos", "pesquisa"] as const;
export type ChatSurface = (typeof CHAT_SURFACES)[number];
export const isChatSurface = (v: unknown): v is ChatSurface =>
  typeof v === "string" && (CHAT_SURFACES as readonly string[]).includes(v);

/** scopeId vem do cliente: aceita só um id curto e sem espaço (threadId/spaceId/ObjectId). */
export function sanitizeScopeId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^[\w:.-]{1,128}$/.test(s) ? s : null;
}

/** O que a superfície do route ("sala-de-estudos", "pesquisa", undefined…) vira no turno. */
export function toChatSurface(surface: unknown): ChatSurface {
  return surface === "pesquisa" ? "pesquisa" : "estudos";
}

export async function createTurn(input: {
  userId: string;
  surface: ChatSurface;
  scopeId: string | null;
  prompt: string;
}): Promise<{ id: string }> {
  return prisma.chatTurn.create({
    data: { ...input, status: "queued", partial: "" },
    select: { id: true },
  });
}

/** Zera o parcial: numa retentativa o turno recomeça do zero, sem progresso velho. */
export async function markRunning(turnId: string): Promise<void> {
  await prisma.chatTurn.update({ where: { id: turnId }, data: { status: "running", partial: "", error: null } });
}

export async function savePartial(turnId: string, partial: string): Promise<void> {
  await prisma.chatTurn.update({ where: { id: turnId }, data: { partial } });
}

export async function saveDone(turnId: string, answer: HarnessOutput, partial: string): Promise<void> {
  await prisma.chatTurn.update({
    where: { id: turnId },
    data: { status: "done", answer: answer as any, partial, error: null },
  });
}

export async function saveError(turnId: string, error: string): Promise<void> {
  await prisma.chatTurn.update({ where: { id: turnId }, data: { status: "error", error: error.slice(0, 2000) } });
}

const TURN_FIELDS = {
  id: true, surface: true, scopeId: true, prompt: true, status: true,
  answer: true, partial: true, error: true, createdAt: true, updatedAt: true,
} as const;

/** Um turno, SÓ se for do dono. null = não existe OU é de outra pessoa (indistinguível de fora). */
export async function getTurnForUser(id: string, userId: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null; // ObjectId inválido faria o Prisma lançar
  return prisma.chatTurn.findFirst({ where: { id, userId }, select: TURN_FIELDS });
}

/** Últimos turnos do dono numa conversa (sem o payload pesado). */
export async function listTurnsForUser(userId: string, surface: ChatSurface, scopeId: string | null, take = 20) {
  return prisma.chatTurn.findMany({
    where: { userId, surface, scopeId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, status: true, prompt: true, createdAt: true, updatedAt: true },
  });
}
