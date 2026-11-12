/**
 * /api/estudos/vitrine (público) — os cards da vitrine cadastrados no admin (só ativo=true), no formato ItemVitrine.
 * A UI (components/estudos/VitrineEstudos) junta estes com o catálogo embutido (lib/estudos/vitrine). Sem banco → [].
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { paraUI } from "@/lib/estudos/vitrineAdmin";
import { itensDasSkillsDoDisco } from "@/lib/estudos/vitrineSkills";

export async function GET() {
    // As SKILLS DA CASA vêm do diretório `.claude/skills`, não do banco: o catálogo é o diretório
    // (ver lib/agent/skills-dir). Fora do try do Prisma de propósito — vitrine sem banco ainda
    // mostra as skills, e banco fora não some com elas.
    const skills = itensDasSkillsDoDisco();
    try {
        const rows = await prisma.itemVitrine.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }] });
        return NextResponse.json({ itens: [...skills, ...rows.map(paraUI)] });
    } catch {
        return NextResponse.json({ itens: skills });
    }
}
