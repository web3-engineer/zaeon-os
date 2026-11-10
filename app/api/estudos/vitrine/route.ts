/**
 * /api/estudos/vitrine (público) — os cards da vitrine cadastrados no admin (só ativo=true), no formato ItemVitrine.
 * A UI (components/estudos/VitrineEstudos) junta estes com o catálogo embutido (lib/estudos/vitrine). Sem banco → [].
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { paraUI } from "@/lib/estudos/vitrineAdmin";

export async function GET() {
    try {
        const rows = await prisma.itemVitrine.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }] });
        return NextResponse.json({ itens: rows.map(paraUI) });
    } catch {
        return NextResponse.json({ itens: [] });
    }
}
