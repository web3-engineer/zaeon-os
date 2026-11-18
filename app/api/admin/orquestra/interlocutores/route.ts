import { json, negado } from "../_comum";
import { interlocutores } from "@/lib/orquestra/conversa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — com quem o console pode conversar: agentes da casa, mentores e motores da orquestra. */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  return json({ interlocutores: await interlocutores() });
}
