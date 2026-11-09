import { json, negado } from "../_comum";
import { manifestoAtual } from "@/lib/orquestra/hermesApp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — a última versão publicada do app Zaeon Hermes (o app compara com o próprio build). 404 = nada publicado. */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const m = await manifestoAtual();
  return m ? json(m) : json({ erro: "sem_build" }, 404);
}
