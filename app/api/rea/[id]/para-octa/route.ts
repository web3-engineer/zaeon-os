/**
 * POST /api/rea/[id]/para-octa → { projetoId, slug, nome, arquivos } — cria um projeto na Octa com o
 * SCAFFOLD do blueprint REA (site estático que apresenta a engenharia reversa). O cliente guarda o
 * projetoId e abre a IDE, onde o botão "Publicar" que já existe leva ao GitHub do aluno.
 *
 * Gateada por REA_BLUEPRINT (a origem) E NEXT_PUBLIC_OCTA_CODE (o destino: sem a IDE não há onde
 * abrir nem publicar). Dono sempre da sessão. 404 blueprint de outro/ inexistente · 409 vazio.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { reaDoUsuario } from "@/lib/rea-blueprint/server";
import { reaBlueprintOn } from "@/lib/rea-blueprint/tipos";
import { blueprintParaOcta } from "@/lib/rea-blueprint/paraOcta";
import { OCTA_CODE_LIGADO } from "@/lib/octa/flag";
import { criarProjeto, salvarArquivos, type ProjetosDb } from "@/lib/octa/projetos";
import { entrarNoBoard, falhaBoard } from "@/lib/estudos/rota";
import { prisma } from "@/src/lib/prisma";

const db = prisma as unknown as ProjetosDb;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  if (!reaBlueprintOn() || !OCTA_CODE_LIGADO) return falhaBoard("not_found");
  const a = await entrarNoBoard(req, "rea-para-octa", "ai-heavy"); if ("response" in a) return a.response;
  const reaId = String((await ctx.params).id ?? "");

  const r = await blueprintParaOcta(
    {
      lerBlueprint: async (id, userId) => {
        const view = await reaDoUsuario(id, userId);
        return view ? { doc: view.doc } : null;
      },
      criarProjeto: (userId, nome) => criarProjeto(db, userId, nome),
      salvarArquivos: (userId, projetoId, arquivos) => salvarArquivos(db, userId, projetoId, arquivos),
    },
    reaId,
    a.userId,
  );

  if (!r.ok) {
    if (r.motivo === "nao_encontrado") return falhaBoard("not_found");
    if (r.motivo === "vazio") return falhaBoard("conflict");
    return NextResponse.json({ error: "Não consegui criar o projeto" }, { status: 502 });
  }
  return NextResponse.json({ projetoId: r.projetoId, slug: r.slug, nome: r.nome, arquivos: r.arquivos }, { status: 201 });
}
