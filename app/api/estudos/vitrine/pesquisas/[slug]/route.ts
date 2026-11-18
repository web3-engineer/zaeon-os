/**
 * /api/estudos/vitrine/pesquisas/[slug] — os PAPÉIS de uma pasta, com o texto inteiro: é o que a pasta busca quando
 * abre (components/estudos/PastaPesquisa). Só pesquisas PUBLICADAS — pendente e recusada não saem daqui.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { partesDe } from "@/lib/estudos/pesquisas";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    const slug = String(params.slug ?? "").toLowerCase();
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.json({ erro: "slug inválido" }, { status: 400 });
    const p = await prisma.pesquisaVitrine.findFirst({ where: { slug, status: "publicada" }, select: { slug: true, titulo: true, partes: true } }).catch(() => null);
    if (!p) return NextResponse.json({ erro: "Pesquisa não encontrada." }, { status: 404 });
    return NextResponse.json({ slug: p.slug, titulo: p.titulo, partes: partesDe(p.partes) });
}
