/**
 * /api/ai/transcript — endpoint da camada L1 (transcrição durável).
 * docs/MEMORY_AND_PERSISTENCE.md §2/§7 (PR-M1). Mantém a rota de geração
 * (/api/ai/chat) pura: os chats chamam ISTO fire-and-forget para gravar,
 * e no mount fazem GET para hidratar "entrar na sala e a conversa está lá".
 *
 *   GET  /api/ai/transcript?surface=estudos&scopeId=<id>&limit=60
 *        → { conversationId, messages: [{id,role,text,meta,at}] }
 *   POST { surface, scopeId?, agentId?, title?, messages:[{role,text,meta?}] }
 *        → { conversationId }
 */
import { NextResponse } from "next/server";
import {
  resolveUserId, ensureConversation, guardarConversa, appendMessages, getRecent, isSurface, type TurnMsg,
} from "@/lib/agent/transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await resolveUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const surface = url.searchParams.get("surface");
  if (!isSurface(surface)) return NextResponse.json({ error: "surface inválida" }, { status: 400 });
  const scopeId = url.searchParams.get("scopeId");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 60));

  try {
    const data = await getRecent(userId, surface, scopeId, limit);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ conversationId: null, messages: [] });
  }
}

export async function POST(req: Request) {
  const userId = await resolveUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  if (!isSurface(body.surface)) return NextResponse.json({ error: "surface inválida" }, { status: 400 });

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: TurnMsg[] = raw
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .map((m: any) => ({ role: m.role, text: String(m.text).slice(0, 32000), meta: m.meta, at: Number(m.at) > 0 ? Number(m.at) : undefined }));
  if (!messages.length) return NextResponse.json({ error: "sem mensagens válidas" }, { status: 400 });

  try {
    const conversationId = await ensureConversation(userId, body.surface, body.scopeId, {
      agentId: body.agentId, title: body.title,
    });
    // #663: a conversa da lista chega com o título e o elo da sub-conversa
    const c = body.conversa;
    if (c && typeof body.scopeId === "string") {
      await guardarConversa(userId, body.surface, body.scopeId, {
        titulo: typeof c.titulo === "string" ? c.titulo.slice(0, 200) : undefined,
        parentId: typeof c.parentId === "string" ? c.parentId.slice(0, 200) : undefined,
        contexto: typeof c.contexto === "string" ? c.contexto.slice(0, 4000) : undefined,
      });
    }
    await appendMessages(conversationId, messages);
    return NextResponse.json({ conversationId });
  } catch {
    // best-effort: nunca derruba o fluxo do chat por causa da persistência.
    return NextResponse.json({ conversationId: null }, { status: 200 });
  }
}
