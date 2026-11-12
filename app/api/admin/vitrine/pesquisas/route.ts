/**
 * /api/admin/vitrine/pesquisas — a seção da API que recebe SÓ pesquisas (lib/estudos/pesquisas). Quem entra: sessão de
 * super-admin (o painel) ou o console da orquestra (Bearer ORQUESTRA_CONSOLE_TOKEN, o mesmo do app de Mac).
 *   GET  ?status=pendente|publicada|recusada → as pesquisas (com as partes inteiras), as mais novas primeiro.
 *   POST { titulo, partes: [{ tipo, titulo?, conteudo? | url? }], resumo?, nicho?, tags?, raridade?, validadores?,
 *          autor?, contaId? | contaEmail?, status? } → publica (status padrão "publicada").
 * O que o USUÁRIO manda pela Sala de Pesquisa chega por /api/estudos/vitrine/pesquisas e aparece aqui como "pendente".
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { autorizar, tokenValido } from "@/lib/orquestra/console";
import { normalizarPesquisa, STATUS, type StatusPesquisa } from "@/lib/estudos/pesquisas";
import { comContas, contaPor, slugLivre } from "@/lib/estudos/pesquisasDb";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    const s = new URL(req.url).searchParams.get("status");
    const where = s && STATUS.includes(s as StatusPesquisa) ? { status: s } : {};
    const linhas = await prisma.pesquisaVitrine.findMany({ where, orderBy: [{ criadoEm: "desc" }], take: 300 });
    return json({ pesquisas: await comContas(linhas) });
}

export async function POST(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    const b = await req.json().catch(() => ({}));
    const { data, erro } = normalizarPesquisa(b, { parcial: false });
    if (erro || !data) return json({ erro: erro ?? "Dados inválidos." }, 400);

    let contaId: string | null = null;
    if (b?.contaId != null || b?.contaEmail != null) {
        const conta = await contaPor(b);
        if (!conta) return json({ erro: "Conta não encontrada (contaId ou contaEmail)." }, 400);
        contaId = conta.id;
        if (!data.autor && conta.name) data.autor = conta.name;
    }
    const origem = tokenValido(req.headers.get("authorization")) ? "console" : "admin";
    const { titulo, partes, status, ...resto } = data as { titulo: string; partes: object; status?: string } & Record<string, unknown>;
    const pesquisa = await prisma.pesquisaVitrine.create({
        data: {
            ...(resto as Record<string, never>),
            titulo, partes,
            slug: await slugLivre(titulo),
            contaId, origem,
            status: status ?? "publicada",
        },
    });
    return json({ pesquisa }, 201);
}
