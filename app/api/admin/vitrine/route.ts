/**
 * /api/admin/vitrine (super-admin) — gestão dos cards da vitrine (Marketplace).
 *   GET: lista TODOS os itens (ativos e inativos), por ordem.
 *   POST { titulo, subtitulo?, tipo?, execucao?, modelo?, autor?, raridade?, profundidade?, preco?, fracoesTotal?,
 *          fracoesVendidas?, selos (supervisionado/linksOk/codigoPrivado)?, entrega?, tags?, ironia?, ativo?, ordem?,
 *          slug? }: cria um card.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { normalizar, slugify } from "@/lib/estudos/vitrineAdmin";

async function gate(): Promise<NextResponse | null> {
    const a = await assertAdmin();
    if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });
    return null;
}

export async function GET() {
    const g = await gate(); if (g) return g;
    const itens = await prisma.itemVitrine.findMany({ orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }] });
    return NextResponse.json({ itens });
}

export async function POST(req: Request) {
    const g = await gate(); if (g) return g;
    const b = await req.json().catch(() => ({}));
    const { data, erro } = normalizar(b, { parcial: false });
    if (erro || !data) return NextResponse.json({ error: erro ?? "Dados inválidos." }, { status: 400 });
    let slug = String(b?.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || slugify(String(data.titulo));
    if (await prisma.itemVitrine.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await prisma.itemVitrine.create({ data: { slug, ...data } as any });
    return NextResponse.json({ item }, { status: 201 });
}
