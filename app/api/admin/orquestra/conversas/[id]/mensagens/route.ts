import { json, negado } from "../../../_comum";
import { enviarMensagem, idValido, lerTexto } from "@/lib/orquestra/conversa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { texto } — manda uma mensagem. O turno roda em SEGUNDO PLANO no servidor (motor profundo/enxame leva
 * minutos); a resposta é 202 com o id da tarefa e o app acompanha por GET /conversas/{id}.
 * 409: já tem um turno rodando nesta conversa.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const n = await negado(req);
  if (n) return n;
  if (!idValido(params.id)) return json({ erro: "conversa_nao_encontrada" }, 404);
  const texto = lerTexto(await req.json().catch(() => ({})));
  if (typeof texto !== "string") return json({ erro: texto.erro }, 400);
  try {
    const r = await enviarMensagem(params.id, texto);
    return r.ok ? json({ tarefaId: r.tarefaId }, 202) : json({ erro: r.erro }, r.status);
  } catch (e) {
    console.error("[orquestra/console] mensagem:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
