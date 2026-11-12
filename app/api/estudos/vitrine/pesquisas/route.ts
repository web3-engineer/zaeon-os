/**
 * /api/estudos/vitrine/pesquisas — o lado do USUÁRIO das pesquisas da vitrine (lib/estudos/pesquisas).
 *   GET              → as pesquisas PUBLICADAS, como cards-pasta (sem o texto das partes).
 *   GET ?minhas=1    → (logado) o que eu mandei, com o status: pendente / publicada / recusada (+ motivo).
 *   POST { workId, resumo?, nicho?, tags? } → (logado) publica uma CÓPIA de um trabalho MEU da Sala de Pesquisa.
 *        Entra "pendente" e só aparece na vitrine quando o admin aprovar. Mandar de novo o mesmo trabalho atualiza a
 *        cópia e volta pra fila (o texto pode ter mudado).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { LIMITES, normalizarEnvio, partesDoTrabalho, pesquisaParaUI } from "@/lib/estudos/pesquisas";
import { comContas, slugLivre } from "@/lib/estudos/pesquisasDb";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

async function eu(): Promise<{ id: string; name: string | null } | null> {
    const s = await getServerSession(authOptions).catch(() => null);
    const email = s?.user?.email;
    if (!email) return null;
    return prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
}

export async function GET(req: Request) {
    if (new URL(req.url).searchParams.get("minhas")) {
        const me = await eu();
        if (!me) return json({ erro: "Unauthorized" }, 401);
        const minhas = await prisma.pesquisaVitrine.findMany({
            where: { contaId: me.id },
            orderBy: { updatedAt: "desc" },
            select: { id: true, slug: true, titulo: true, workId: true, status: true, motivo: true, updatedAt: true },
        });
        return json({ minhas });
    }
    try {
        const linhas = await prisma.pesquisaVitrine.findMany({ where: { status: "publicada" }, orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }], take: 200 });
        return json({ itens: (await comContas(linhas)).map(pesquisaParaUI) });
    } catch {
        return json({ itens: [] });
    }
}

export async function POST(req: Request) {
    const me = await eu();
    if (!me) return json({ erro: "Entre na sua conta pra publicar." }, 401);
    const env = normalizarEnvio(await req.json().catch(() => ({})));
    if (env.erro || !env.workId) return json({ erro: env.erro }, 400);

    // só o DONO publica o trabalho (sem IDOR): busca pelo id E pelo userId
    const work = await prisma.researchWork.findFirst({ where: { id: env.workId, userId: me.id }, select: { id: true, title: true, content: true, workType: true } });
    if (!work) return json({ erro: "Trabalho não encontrado." }, 404);
    const { partes, erro } = partesDoTrabalho(work);
    if (erro || !partes) return json({ erro }, 400);
    const titulo = String(work.title ?? "").trim().slice(0, LIMITES.titulo) || "Pesquisa sem título";
    const campos = { titulo, resumo: env.resumo, nicho: env.nicho, tags: env.tags, autor: me.name ?? "", partes, status: "pendente", motivo: null };

    const jaExiste = await prisma.pesquisaVitrine.findFirst({ where: { workId: work.id, contaId: me.id }, select: { id: true } });
    if (jaExiste) {
        const pesquisa = await prisma.pesquisaVitrine.update({ where: { id: jaExiste.id }, data: campos, select: { id: true, slug: true, status: true } });
        return json({ pesquisa });
    }
    const pendentes = await prisma.pesquisaVitrine.count({ where: { contaId: me.id, status: "pendente" } });
    if (pendentes >= LIMITES.pendentesPorConta) return json({ erro: `Você já tem ${pendentes} pesquisas esperando aprovação. Espere a fila andar.` }, 429);
    const pesquisa = await prisma.pesquisaVitrine.create({
        data: { ...campos, slug: await slugLivre(titulo), contaId: me.id, workId: work.id, origem: "usuario" },
        select: { id: true, slug: true, status: true },
    });
    return json({ pesquisa }, 201);
}
