/**
 * /api/admin/vitrine/ajustes — a CURADORIA da vitrine (lib/estudos/curadoria): um ajuste por card, por cima do original.
 * Quem entra: super-admin (o painel) ou o console da orquestra (Bearer ORQUESTRA_CONSOLE_TOKEN).
 *   GET                       → todos os ajustes (inclusive os de cards ocultos).
 *   PUT { itemId, titulo?, subtitulo?, tags?, imagem?, raridade?, ordem?, oculto? } → cria/atualiza o ajuste do card.
 *        Mandar `null` num campo desfaz só aquele campo (volta ao original).
 *   DELETE ?itemId=<id>       → apaga o ajuste: o card volta inteiro ao original.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { autorizar } from "@/lib/orquestra/console";
import { normalizarAjuste } from "@/lib/estudos/curadoria";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });
const SELECT = { itemId: true, titulo: true, subtitulo: true, tags: true, imagem: true, raridade: true, ordem: true, oculto: true, updatedAt: true } as const;

export async function GET(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    return json({ ajustes: await prisma.vitrineAjuste.findMany({ select: SELECT }) });
}

export async function PUT(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    const { itemId, data, erro } = normalizarAjuste(await req.json().catch(() => ({})));
    if (erro || !itemId || !data) return json({ erro: erro ?? "Dados inválidos." }, 400);
    const campos = data as Record<string, never>;
    const ajuste = await prisma.vitrineAjuste.upsert({
        where: { itemId },
        create: { itemId, ...campos },
        update: campos,
        select: SELECT,
    });
    return json({ ajuste });
}

export async function DELETE(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    const itemId = new URL(req.url).searchParams.get("itemId") ?? "";
    if (!itemId) return json({ erro: "itemId obrigatório" }, 400);
    await prisma.vitrineAjuste.deleteMany({ where: { itemId } });
    return json({ ok: true });
}
