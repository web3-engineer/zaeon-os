import { json, listarTarefas, negado } from "../_comum";
import { resumoDe } from "@/lib/orquestra/console";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?motor=&status=&limite= */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const q = new URL(req.url).searchParams;
  try {
    const linhas = await listarTarefas({ motor: q.get("motor"), status: q.get("status"), limite: Number(q.get("limite")) || 50 });
    return json({ tarefas: linhas.map(resumoDe) });
  } catch (e) {
    console.error("[orquestra/console] tarefas:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
