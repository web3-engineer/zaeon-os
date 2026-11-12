/**
 * /api/estudos/vitrine (público) — os cards da vitrine cadastrados no admin (só ativo=true) e as PESQUISAS publicadas
 * (cards-pasta, lib/estudos/pesquisas), no formato ItemVitrine.
 * A UI (components/estudos/VitrineEstudos) junta estes com o catálogo embutido (lib/estudos/vitrine). Sem banco → [].
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { paraUI } from "@/lib/estudos/vitrineAdmin";
import { itensDasSkillsDoDisco } from "@/lib/estudos/vitrineSkills";
import { pesquisaParaUI } from "@/lib/estudos/pesquisas";
import { comContas } from "@/lib/estudos/pesquisasDb";

/** a CURADORIA do dono (lib/estudos/curadoria): os ajustes por card — a tela aplica por cima de tudo, inclusive do
 *  catálogo embutido que só ela conhece. Falha aqui = vitrine sem curadoria, não vitrine fora do ar. */
async function ajustesDaCuradoria() {
    try {
        return await prisma.vitrineAjuste.findMany({ select: { itemId: true, titulo: true, subtitulo: true, tags: true, imagem: true, raridade: true, ordem: true, oculto: true } });
    } catch {
        return [];
    }
}

/** as PESQUISAS publicadas, como cards-pasta (lib/estudos/pesquisas). Falha aqui não derruba o resto da vitrine. */
async function pesquisasPublicadas() {
    try {
        const linhas = await prisma.pesquisaVitrine.findMany({ where: { status: "publicada" }, orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }], take: 200 });
        return (await comContas(linhas)).map(pesquisaParaUI);
    } catch {
        return [];
    }
}

export async function GET() {
    // As SKILLS DA CASA vêm do diretório `.claude/skills`, não do banco: o catálogo é o diretório
    // (ver lib/agent/skills-dir). Fora do try do Prisma de propósito — vitrine sem banco ainda
    // mostra as skills, e banco fora não some com elas.
    const skills = itensDasSkillsDoDisco();
    try {
        const [rows, pesquisas, ajustes] = await Promise.all([
            prisma.itemVitrine.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }] }),
            pesquisasPublicadas(),
            ajustesDaCuradoria(),
        ]);
        return NextResponse.json({ itens: [...skills, ...rows.map(paraUI), ...pesquisas], ajustes });
    } catch {
        return NextResponse.json({ itens: skills, ajustes: [] });
    }
}
