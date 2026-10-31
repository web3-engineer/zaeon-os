/**
 * GET /api/admin/canais — estado dos CANAIS DO MUNDO REAL (F1, read-only).
 * Founder-only + flag NEXT_PUBLIC_AGENTS_ADMIN (mesmo portão de /api/admin/agents).
 *
 * SÓ LÊ. Conectar, pausar e publicar são fases seguintes (F2+) — esta rota não tem POST de
 * propósito: a F1 existe pra você VER o terreno antes de qualquer coisa sair pro mundo.
 *
 * Opção A (docs/PLANO_AGENTES_MUNDO_REAL.md §2): Instagram/X/LinkedIn são UMA conta
 * institucional cada (`CanalSocial`); o WhatsApp é por agente (`AgentChannel`, já em produção).
 * O view-model que junta os dois e deriva a tela é puro e testado em lib/canais/painel.
 *
 * NUNCA devolve segredo: de credencial sai só `tokenRef` (o NOME da env), nunca o valor.
 * `chipflowToken` do AgentChannel não entra no select.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { agentsAdmin } from "@/lib/canal/flags";
import { montarPainel, type LinhaCanalAgente, type LinhaCanalSocial, type VozView } from "@/lib/canais/painel";
import { aprovacaoForcada, canaisExternosLigados } from "@/lib/canais/politica";
import { vozes } from "@/lib/canais/vozes";

export const TAKE_MAX = 500;

export async function GET() {
  if (!agentsAdmin()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await assertAdmin();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });

  // `canalSocial` só passa a existir depois do `prisma db push` desta fase — enquanto não rodar,
  // a tela mostra as 3 redes como "não conectadas" (o painel preenche o que falta) em vez de dar 500.
  const sociaisQuery: Promise<LinhaCanalSocial[]> = (prisma as any).canalSocial
    ? (prisma as any).canalSocial
        .findMany({
          select: {
            rede: true, estado: true, capacidades: true, tokenRef: true, tokenExpiraEm: true, contaExterna: true,
            limiteDia: true, enviadosHoje: true, diaContagem: true, pausadoAte: true, autoPublicar: true,
            ultimoEnvioEm: true, ultimoErro: true,
          },
          take: TAKE_MAX,
        })
        .catch(() => [])
    : Promise.resolve([]);

  const [sociais, agentes, elenco] = await Promise.all([
    sociaisQuery,
    prisma.agentChannel.findMany({
      where: { tipo: "whatsapp" },
      select: {
        agentKey: true, tipo: true, estado: true, numero: true, limiteDia: true,
        enviadosHoje: true, diaContagem: true, ultimoEnvioEm: true, ultimoErro: true,
      },
      take: TAKE_MAX,
    }) as Promise<LinhaCanalAgente[]>,
    // As "vozes" que podem assinar um post (Opção A) — mesma fonte da fila da F2, pra o nome que
    // assina na tela ser o mesmo que assina no post. Não promete conexão nenhuma.
    vozes(prisma),
  ]);

  return NextResponse.json(
    montarPainel({
      sociais,
      agentes,
      vozes: elenco.map((v): VozView => ({ agentKey: v.agentKey, nome: v.nome, tipo: v.tipo, area: v.area ?? null })),
      externosLigados: canaisExternosLigados(),
      aprovacaoForcada: aprovacaoForcada(),
    }),
  );
}
