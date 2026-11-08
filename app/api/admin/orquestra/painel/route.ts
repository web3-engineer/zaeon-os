import { json, listarTarefas, negado } from "../_comum";
import { montarPainel } from "@/lib/orquestra/console";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — tudo que o console mostra numa chamada: motores (o que têm e o que fazem), datasets, ferramentas, tarefas */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  try {
    return json(await montarPainel({ tarefas: () => listarTarefas({ limite: 500 }) }));
  } catch (e) {
    console.error("[orquestra/console] painel:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
