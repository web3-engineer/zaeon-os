import { json, negado } from "../_comum";
import { DATASET_TRAJETORIAS, linhaDoDataset, type LinhaTarefa } from "@/lib/orquestra/console";
import { commitArquivo, datasetsLigados, repoDaOrg } from "@/lib/hf/datasets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { desde? } — as tarefas concluídas viram um JSONL no dataset privado de trajetórias (sem userId) */
export async function POST(req: Request) {
  const n = await negado(req);
  if (n) return n;
  if (!datasetsLigados()) return json({ erro: "datasets_desligados" }, 503);
  const corpo = await req.json().catch(() => ({}));
  const desde = typeof corpo?.desde === "string" && !Number.isNaN(Date.parse(corpo.desde)) ? new Date(corpo.desde) : new Date(Date.now() - 7 * 864e5);
  try {
    const { prisma } = await import("@/src/lib/prisma");
    const linhas = (await prisma.orquestraTarefa.findMany({
      where: { status: "concluida", criadaEm: { gte: desde } }, orderBy: { criadaEm: "asc" }, take: 2_000,
    })) as unknown as LinhaTarefa[];
    if (!linhas.length) return json({ exportadas: 0, repo: repoDaOrg(DATASET_TRAJETORIAS), arquivo: null });
    const agora = new Date().toISOString();
    const arquivo = `data/${agora.slice(0, 10)}/${agora.slice(11, 19).replace(/:/g, "")}.jsonl`;
    const r = await commitArquivo({
      repo: repoDaOrg(DATASET_TRAJETORIAS), caminho: arquivo,
      conteudo: linhas.map((l) => JSON.stringify(linhaDoDataset(l))).join("\n") + "\n",
      mensagem: `trajetórias da orquestra: ${linhas.length} tarefas`,
    });
    if (!r.ok) return json({ erro: "hf_recusou", status: r.status, detalhe: r.erro }, 502);
    return json({ exportadas: linhas.length, repo: repoDaOrg(DATASET_TRAJETORIAS), arquivo });
  } catch (e) {
    console.error("[orquestra/console] exportar:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
