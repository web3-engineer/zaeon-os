import { json, negado } from "../_comum";
import { dispararArena, lerPedidoArena } from "@/lib/orquestra/console";
import { todosOsMotores } from "@/lib/orquestra/motores";
import { motoresEmVoo } from "@/lib/orquestra/orquestrador";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { objetivo, intent, kind?, motores[] } → 202 { tarefas: [id…] } — cada motor roda em 2º plano */
export async function POST(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const corpo = await req.json().catch(() => null);
  const validos = todosOsMotores().filter((m) => m.disponivel(process.env)).map((m) => m.id);
  const p = lerPedidoArena(corpo, validos);
  if (typeof p === "string") return json({ erro: "corpo_invalido", detalhe: p }, 400);
  // a arena divide o MESMO teto dos alunos: lotada, recusa em vez de parar o chat
  const teto = Number(process.env.ORQ_MAX_SIMULTANEAS) || 2;
  const longos = p.motores.filter((m) => m !== "aura").length;
  if (motoresEmVoo() + longos > teto) return json({ erro: "orquestra_lotada", emVoo: motoresEmVoo(), teto }, 429);
  return json({ tarefas: dispararArena(p) }, 202);
}
