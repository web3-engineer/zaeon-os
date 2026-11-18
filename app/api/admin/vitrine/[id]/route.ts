/**
 * /api/admin/vitrine/[id] (super-admin) — PATCH edita (só os campos enviados) · DELETE remove o card da vitrine.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { normalizar } from "@/lib/estudos/vitrineAdmin";

async function gate(): Promise<NextResponse | null> {
    const a = await assertAdmin();
    if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });
    return null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const g = await gate(); if (g) return g;
    const b = await req.json().catch(() => ({}));
    const { data, erro } = normalizar(b, { parcial: true });
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });
    if (!data || !Object.keys(data).length) return NextResponse.json({ error: "Nada pra alterar." }, { status: 400 });
    try {
        const item = await prisma.itemVitrine.update({ where: { id: params.id }, data: data as any });
        return NextResponse.json({ item });
    } catch {
        return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const g = await gate(); if (g) return g;
    await prisma.itemVitrine.deleteMany({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
}
