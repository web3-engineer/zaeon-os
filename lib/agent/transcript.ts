/**
 * lib/agent/transcript.ts — camada L1 (transcrição durável) do
 * docs/MEMORY_AND_PERSISTENCE.md. Servidor: grava/lê a conversa por
 * (userId, surface, scopeId) no Mongo (models Conversation/ChatMessage).
 *
 * Por que NÃO fica inline no /api/ai/chat: aquela rota é stateless, hot-path
 * (voz, agenda, estudo, pesquisa) e não tem sessão no corpo. Aqui centralizamos
 * a persistência num helper que o endpoint dedicado /api/ai/transcript usa —
 * a rota de geração continua pura. Este é o alicerce de onde o L3 (memory.ts)
 * vai DERIVAR os drawers no futuro.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export type Surface = "estudos" | "pesquisa" | "aula" | "projetos" | "lounge" | "whatsapp";
export type Role = "user" | "assistant";
export type TurnMsg = { role: Role; text: string; meta?: unknown; at?: number };
export type WireMsg = { id: string; role: Role; text: string; meta?: unknown; at: string };

/** Mesmo padrão das outras rotas: sessão → email → id do usuário. */
export async function resolveUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

/** Acha (ou cria) a conversa da sala concreta. scopeId null = conversa geral da superfície. */
export async function ensureConversation(
  userId: string,
  surface: Surface,
  scopeId?: string | null,
  opts?: { agentId?: string | null; title?: string | null },
): Promise<string> {
  const where = { userId, surface, scopeId: scopeId ?? null };
  const existing = await prisma.conversation.findFirst({ where, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.conversation.create({
    data: { userId, surface, scopeId: scopeId ?? null, agentId: opts?.agentId ?? null, title: opts?.title ?? null },
    select: { id: true },
  });
  return created.id;
}

/** Anexa mensagens (normalmente user + assistant de um turno). Best-effort. */
export async function appendMessages(conversationId: string, msgs: TurnMsg[]): Promise<void> {
  if (!msgs.length) return;
  await prisma.chatMessage.createMany({
    data: msgs.map((m) => ({
      conversationId,
      role: m.role,
      text: m.text ?? "",
      meta: (m.meta ?? undefined) as any,
      ...(m.at ? { at: new Date(m.at) } : {}),
    })),
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}

/** Últimas N mensagens da sala, em ordem cronológica, para hidratar o cliente. */
export async function getRecent(
  userId: string,
  surface: Surface,
  scopeId?: string | null,
  limit = 60,
): Promise<{ conversationId: string | null; messages: WireMsg[] }> {
  const conv = await prisma.conversation.findFirst({
    where: { userId, surface, scopeId: scopeId ?? null },
    select: { id: true },
  });
  if (!conv) return { conversationId: null, messages: [] };
  const rows = await prisma.chatMessage.findMany({
    where: { conversationId: conv.id },
    orderBy: { at: "desc" },
    take: limit,
    select: { id: true, role: true, text: true, meta: true, at: true },
  });
  const messages: WireMsg[] = rows
    .reverse()
    .map((r) => ({ id: r.id, role: r.role as Role, text: r.text, meta: r.meta ?? undefined, at: r.at.toISOString() }));
  return { conversationId: conv.id, messages };
}

export type DadosConversa = { titulo?: string; parentId?: string; contexto?: string };
export type ConversaLista = { id: string; titulo: string; parentId?: string; contexto?: string; criadaEm: number; tocadaEm: number };

/** #663: guarda o título e o elo da sub-conversa. Só escreve o que veio, para não apagar o resto. */
export async function guardarConversa(userId: string, surface: Surface, scopeId: string, d: DadosConversa): Promise<string> {
  const id = await ensureConversation(userId, surface, scopeId);
  const data = { ...(d.titulo ? { title: d.titulo } : {}), ...(d.parentId ? { parentScopeId: d.parentId } : {}), ...(d.contexto ? { contextoHerdado: d.contexto } : {}) };
  if (Object.keys(data).length) await prisma.conversation.update({ where: { id }, data });
  return id;
}

/**
 * #663: as conversas da conta. Só as com título e mensagens: as outras são marcas do mapa (gatekeeper), que nascem
 * sem mensagens, e as gravações antigas por estudo em foco, que nunca tiveram título e não são conversas da lista.
 */
export async function listarConversas(userId: string, surface: Surface): Promise<ConversaLista[]> {
  const rows = await prisma.conversation.findMany({
    where: { userId, surface, scopeId: { not: null }, title: { not: null }, messages: { some: {} } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: { scopeId: true, title: true, parentScopeId: true, contextoHerdado: true, createdAt: true, updatedAt: true },
  });
  return rows.map((r) => ({
    id: r.scopeId!, titulo: r.title!,
    ...(r.parentScopeId ? { parentId: r.parentScopeId } : {}),
    ...(r.contextoHerdado ? { contexto: r.contextoHerdado } : {}),
    criadaEm: r.createdAt.getTime(), tocadaEm: r.updatedAt.getTime(),
  }));
}

/** #663: apaga a conversa, as sub-conversas e as mensagens de todas. Só as da própria conta. */
export async function apagarConversa(userId: string, surface: Surface, scopeId: string): Promise<void> {
  const convs = await prisma.conversation.findMany({
    where: { userId, surface, OR: [{ scopeId }, { parentScopeId: scopeId }] },
    select: { id: true },
  });
  const ids = convs.map((c) => c.id);
  if (!ids.length) return;
  await prisma.chatMessage.deleteMany({ where: { conversationId: { in: ids } } });
  await prisma.conversation.deleteMany({ where: { id: { in: ids }, userId } });
}

/** #663: editar/regenerar — apaga as mensagens a partir desse instante, com o relógio de quem gravou. */
export async function cortarMensagens(userId: string, surface: Surface, scopeId: string, desde: number): Promise<void> {
  const conv = await prisma.conversation.findFirst({ where: { userId, surface, scopeId }, select: { id: true } });
  if (conv) await prisma.chatMessage.deleteMany({ where: { conversationId: conv.id, at: { gte: new Date(desde) } } });
}

/**
 * #663: sobe uma conversa antiga do navegador. Enviar de novo não repete: só entra o que é anterior à primeira mensagem
 * do servidor (o resto já foi gravado turno a turno, ou cortado de propósito) e que ainda não esteja lá. O título do
 * servidor vale, porque pode ter sido renomeada em outro aparelho.
 */
export async function importarConversa(userId: string, surface: Surface, scopeId: string, d: DadosConversa, msgs: TurnMsg[]): Promise<number> {
  const id = await ensureConversation(userId, surface, scopeId);
  const conv = await prisma.conversation.findFirst({ where: { id }, select: { title: true } });
  await guardarConversa(userId, surface, scopeId, { ...d, titulo: conv?.title ? undefined : d.titulo });
  const ja = await prisma.chatMessage.findMany({ where: { conversationId: id }, orderBy: { at: "asc" }, select: { role: true, text: true, at: true } });
  const primeira = ja[0]?.at.getTime();
  const conta = new Map<string, number>();
  const chave = (m: { role: string; text: string }) => `${m.role}|${m.text}`;
  for (const m of ja) conta.set(chave(m), (conta.get(chave(m)) ?? 0) + 1);
  const novas = msgs.filter((m) => {
    const n = conta.get(chave(m)) ?? 0;
    if (n) { conta.set(chave(m), n - 1); return false; }
    return !primeira || !!(m.at && m.at < primeira);
  });
  await appendMessages(id, novas);
  return novas.length;
}

const SURFACES: Surface[] = ["estudos", "pesquisa", "aula", "projetos", "lounge", "whatsapp"];
export const isSurface = (v: unknown): v is Surface => typeof v === "string" && SURFACES.includes(v as Surface);
