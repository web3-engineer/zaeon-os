/**
 * /api/admin/vitrine/pesquisas/[id] — editar, MODERAR e apagar uma pesquisa (super-admin ou console).
 *   PATCH { status: "publicada" | "recusada", motivo? , ...os campos de POST } → aprova, recusa ou edita.
 *   DELETE → apaga.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { autorizar } from "@/lib/orquestra/console";
import { normalizarPesquisa } from "@/lib/estudos/pesquisas";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const idValido = (id: string) => /^[a-f0-9]{24}$/i.test(id);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    if (!idValido(params.id)) return json({ erro: "id inválido" }, 400);
    const b = await req.json().catch(() => ({}));
    const { data, erro } = normalizarPesquisa(b, { parcial: true });
    if (erro || !data) return json({ erro: erro ?? "Dados inválidos." }, 400);
    if (data.status === "publicada") data.motivo = null; // aprovada: o motivo de uma recusa antiga sai
    try {
        const pesquisa = await prisma.pesquisaVitrine.update({ where: { id: params.id }, data: data as Record<string, never> });
        return json({ pesquisa });
    } catch {
        return json({ erro: "Pesquisa não encontrada." }, 404);
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    if (!idValido(params.id)) return json({ erro: "id inválido" }, 400);
    try {
        await prisma.pesquisaVitrine.delete({ where: { id: params.id } });
        return json({ ok: true });
    } catch {
        return json({ erro: "Pesquisa não encontrada." }, 404);
    }
}
