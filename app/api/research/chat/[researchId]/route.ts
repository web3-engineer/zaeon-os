import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getGeminiChatModel } from "@/lib/scholar/gemini";
import { buildPastResearchSystemPrompt, type ChatContext } from "@/lib/scholar/omega";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function resolveUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  // session.user não carrega id — lookup por email (mesmo padrão das outras rotas).
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return dbUser?.id ?? null;
}

// GET → carrega o chat existente (ou { exists: false }).
export async function GET(_req: Request, { params }: { params: { researchId: string } }) {
  const userId = await resolveUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const chat = await prisma.pastResearchChat.findFirst({ where: { userId, researchId: params.researchId } });
  if (!chat) return json({ exists: false });
  return json({
    exists: true,
    id: chat.id,
    title: chat.title,
    contextJson: chat.contextJson,
    messages: chat.messages ?? [],
    pinned: chat.pinned,
  });
}

// POST → envia mensagem; cria o chat na primeira vez; responde via Omega Scholar (stream NDJSON).
export async function POST(req: Request, { params }: { params: { researchId: string } }) {
  const userId = await resolveUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "message é obrigatório" }, 400);

  const incomingContext: ChatContext =
    body.context && typeof body.context === "object" ? body.context : { title: body.title ?? "Pesquisa" };
  const title = String(body.title ?? incomingContext.title ?? "Pesquisa").slice(0, 300);

  let chat = await prisma.pastResearchChat.findFirst({ where: { userId, researchId: params.researchId } });
  if (!chat) {
    chat = await prisma.pastResearchChat.create({
      data: { userId, researchId: params.researchId, title, contextJson: incomingContext as any, messages: [] as any },
    });
  }
  const chatId = chat.id;
  const prior: ChatMessage[] = Array.isArray(chat.messages) ? (chat.messages as any) : [];
  const context = (chat.contextJson as ChatContext) ?? incomingContext;

  const userMsg: ChatMessage = { id: randomUUID(), role: "user", content: message, createdAt: new Date().toISOString() };
  const systemPrompt = buildPastResearchSystemPrompt(context);
  const contents = [
    ...prior.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      let full = "";
      try {
        const model = getGeminiChatModel(systemPrompt, { temperature: 0.4 });
        const result = await model.generateContentStream({ contents });
        for await (const item of result.stream) {
          const t = item.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (t) {
            full += t;
            send({ type: "token", text: t });
          }
        }
        const assistantMsg: ChatMessage = {
          id: randomUUID(),
          role: "assistant",
          content: full || "(sem resposta)",
          createdAt: new Date().toISOString(),
        };
        await prisma.pastResearchChat.update({
          where: { id: chatId },
          data: { messages: [...prior, userMsg, assistantMsg] as any },
        });
        send({ type: "done", message: assistantMsg });
      } catch (err: any) {
        send({ type: "error", message: err?.message ?? "Erro no chat" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
