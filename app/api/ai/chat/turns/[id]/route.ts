/**
 * GET /api/ai/chat/turns/:id → { turn: { id, status, partial, wire, erro } }
 *
 * Só do DONO (getTurnForUser amarra id+userId; de outra pessoa = 404, indistinguível de
 * "não existe"). Devolve o texto de protocolo pronto (`wire`) em vez do answer cru: o
 * cliente passa pelo MESMO parser do stream ao vivo. Erro sai como mensagem AMIGÁVEL —
 * o erro cru (que pode ter detalhe interno) fica só no banco.
 */
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { resolveUserId } from "@/lib/agent/transcript";
import { getTurnForUser } from "@/lib/agent/chat-turn-store";
import { outputToWire, isHarnessOutput } from "@/lib/agent/chat-turn-wire";
import { messageForError } from "@/lib/agent/errors";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const rl = await guard(req, "chat-turn", "ai-light");
  if (!rl.ok) return rl.response;
  const userId = await resolveUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await getTurnForUser(params.id, userId);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pronto = t.status === "done" && isHarnessOutput(t.answer);
  return NextResponse.json({
    turn: {
      id: t.id,
      status: t.status === "done" && !pronto ? "error" : t.status, // answer corrompido = erro, nunca "pronto vazio"
      partial: t.partial ?? "",
      wire: pronto ? outputToWire(t.answer as any) : null,
      erro: t.status === "error" || (t.status === "done" && !pronto) ? messageForError(t.error ?? "invalid_output") : null,
      createdAt: t.createdAt,
    },
  });
}
