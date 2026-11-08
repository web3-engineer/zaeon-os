import { NextResponse } from "next/server";
import { estadoNaLoja } from "@/lib/orquestra/loja";
import { todosOsMotores } from "@/lib/orquestra/motores";
import { modoOrquestra } from "@/lib/orquestra/roteador";
import { planoDaConta } from "@/lib/orquestra/plano";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET — os agentes da orquestra como ESTE aluno os vê na Loja: liberado, exige plano, aguardando chave ou pausado.
 * Anônimo = plano free (vê o catálogo, com cadeado). Nunca expõe chave nem nome de variável de ambiente.
 */
export async function GET() {
  let userId: string | null = null;
  try { userId = await (await import("@/lib/agent/transcript")).resolveUserId(); } catch { /* anônimo */ }
  const plano = await planoDaConta(userId);
  return NextResponse.json(
    { plano, agentes: estadoNaLoja(plano, modoOrquestra(), todosOsMotores(), process.env) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
