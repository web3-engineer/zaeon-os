/**
 * POST /api/admin/vitrine/pesquisas/exemplos — popula a vitrine com as pesquisas de EXEMPLO (lib/estudos/pesquisasExemplos),
 * abertas a apoio em SOL. Super-admin ou o console (Bearer). Idempotente: não recria uma que já existe (mesmo título).
 * Entram publicadas, com origem "console".
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { autorizar } from "@/lib/orquestra/console";
import { normalizarPesquisa } from "@/lib/estudos/pesquisas";
import { slugLivre } from "@/lib/estudos/pesquisasDb";
import { PESQUISAS_EXEMPLO } from "@/lib/estudos/pesquisasExemplos";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);

    const existentes = new Set((await prisma.pesquisaVitrine.findMany({ select: { titulo: true } })).map((p) => p.titulo));
    let criadas = 0;
    const jaExistiam: string[] = [];

    for (const ex of PESQUISAS_EXEMPLO) {
        if (existentes.has(ex.titulo)) { jaExistiam.push(ex.titulo); continue; }
        const { data, erro } = normalizarPesquisa(ex, { parcial: false });
        if (erro || !data) continue; // um exemplo malformado não derruba os outros
        const { titulo, partes, ...resto } = data as { titulo: string; partes: object } & Record<string, unknown>;
        await prisma.pesquisaVitrine.create({
            data: {
                ...(resto as Record<string, never>),
                titulo, partes,
                slug: await slugLivre(titulo),
                origem: "console",
                status: "publicada",
            },
        });
        criadas++;
    }

    return json({ criadas, jaExistiam, total: PESQUISAS_EXEMPLO.length }, 201);
}
