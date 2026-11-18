import { json, negado } from "../_comum";
import { interlocutores, mensagensDe } from "@/lib/orquestra/conversa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — as conversas do console, da mais recente (resumo: título, agente, última mensagem). */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  try {
    const { prisma } = await import("@/src/lib/prisma");
    const linhas = await prisma.consoleConversa.findMany({ orderBy: { atualizadaEm: "desc" }, take: 100 });
    return json({
      conversas: linhas.map((c) => {
        const msgs = mensagensDe(c.mensagens);
        const ultima = msgs[msgs.length - 1];
        return {
          id: c.id, titulo: c.titulo, agente: c.agente, atualizadaEm: c.atualizadaEm.toISOString(), mensagens: msgs.length,
          ultima: ultima ? { papel: ultima.papel, texto: ultima.texto.slice(0, 160), status: ultima.status ?? null } : null,
        };
      }),
    });
  } catch (e) {
    console.error("[orquestra/console] conversas:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}

/** POST { agente } — abre uma conversa com um agente da casa, mentor ou motor (disponível). */
export async function POST(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const b = await req.json().catch(() => ({}));
  const agente = typeof b?.agente === "string" ? b.agente.trim() : "";
  const alvo = (await interlocutores()).find((i) => i.id === agente);
  if (!alvo) return json({ erro: "agente_desconhecido" }, 400);
  if (!alvo.disponivel) return json({ erro: "agente_indisponivel" }, 400);
  try {
    const { prisma } = await import("@/src/lib/prisma");
    const c = await prisma.consoleConversa.create({ data: { titulo: "Nova conversa", agente, mensagens: [] } });
    return json({ conversa: { id: c.id, titulo: c.titulo, agente: c.agente, criadaEm: c.criadaEm.toISOString(), atualizadaEm: c.atualizadaEm.toISOString(), mensagens: [] } }, 201);
  } catch (e) {
    console.error("[orquestra/console] criar conversa:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
