/**
 * PATCH /api/admin/canais/posts/[id] { acao: "aprovar"|"recusar"|"devolver", motivo? } — a DECISÃO
 * HUMANA da fila (F2). Founder-only.
 *
 * Toda mudança de estado passa por `podeTransicionar()` (lib/canais/fila): o que não é transição
 * legal devolve 409, não 500. E a escrita é CONDICIONAL ao estado que o cliente viu — se alguém
 * mexeu no post nesse meio tempo, a chamada falha em vez de sobrescrever a decisão do outro.
 *
 * `aprovar` grava QUEM aprovou. Não é decoração: é a trilha de quem respondeu por um conteúdo que
 * foi pro mundo. E aprovar NÃO publica — publicar é POST /api/admin/canais/publicar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { ehEstadoPost, podeTransicionar, type EstadoPost } from "@/lib/canais/fila";
import { gate } from "../route";

const ACOES: Record<string, EstadoPost> = {
  aprovar: "aprovado",
  recusar: "recusado",
  devolver: "rascunho", // tira a aprovação e volta pro rascunho (só antes de sair)
  // Destrava um post preso em `publicando`: o claim foi dado e o processo morreu antes de gravar o
  // desfecho. Com o adapter de ensaio a janela é de milissegundos, mas "irrecuperável pela tela"
  // não é um estado que a gente deixa existir — e a transição já era legal em TRANSICOES.
  reenfileirar: "aprovado",
};

export const MOTIVO_MAX = 400;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await gate(); if (g) return g;
  const a = await assertAdmin();
  const id = String(params.id || "");
  const b = await req.json().catch(() => ({}));

  const destino = ACOES[String(b?.acao ?? "")];
  if (!destino) return NextResponse.json({ error: `acao deve ser uma de: ${Object.keys(ACOES).join(", ")}` }, { status: 400 });

  const atual = await (prisma as any).agentPost?.findUnique({ where: { id } }).catch(() => null);
  if (!atual) return NextResponse.json({ error: "post não encontrado" }, { status: 404 });
  if (!ehEstadoPost(atual.estado)) return NextResponse.json({ error: `estado inválido no banco: "${atual.estado}"` }, { status: 409 });
  if (!podeTransicionar(atual.estado, destino)) {
    return NextResponse.json({ error: `não dá pra ir de "${atual.estado}" para "${destino}"`, estado: atual.estado }, { status: 409 });
  }

  const motivo = String(b?.motivo ?? "").trim().slice(0, MOTIVO_MAX) || null;
  const quem = a.ok ? a.email : null;
  const agora = new Date();

  const data: Record<string, unknown> =
    destino === "aprovado"
      ? { estado: destino, aprovadoPor: quem, aprovadoEm: agora, recusadoPor: null, recusaMotivo: null, ultimoErro: null, classeErro: null }
      : destino === "recusado"
        ? { estado: destino, recusadoPor: quem, recusaMotivo: motivo }
        : { estado: destino, aprovadoPor: null, aprovadoEm: null };

  // Condicional no estado que o cliente viu: duas abas abertas não se atropelam em silêncio.
  const r = await (prisma as any).agentPost.updateMany({ where: { id, estado: atual.estado }, data });
  if (r.count !== 1) return NextResponse.json({ error: "o post mudou de estado nesse meio tempo", estado: atual.estado }, { status: 409 });

  return NextResponse.json({ ok: true, id, estado: destino });
}
