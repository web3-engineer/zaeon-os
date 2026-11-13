/**
 * GET /api/octa/modelos — quais modelos o aluno pode escolher no agente de código geral do Octa.
 *
 * Sempre devolve 200 (a UI decide o que mostrar). O "octa" (padrão da casa, Gemini via gateway) está
 * SEMPRE na lista; os premium (Claude/Codex, lib/octa/modelosPremium) só entram quando TUDO bate:
 *   · gateway LiteLLM ligado;
 *   · a flag OCTA_MODELOS_PREMIUM lista o modelo (= o dono pôs a chave da org no gateway);
 *   · o usuário pode (plano `max` ou super-admin).
 * Este endpoint é só pra a UI — o portão de verdade é server-side na própria /api/octa/agente.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { effectivePlan, normalizePlan, type PlanState } from "@/lib/plans";
import { isSuperAdmin } from "@/lib/auth/roles";
import { octaGatewayConfigurado } from "@/lib/octa/litellm";
import { premiumHabilitados, podeUsarPremium } from "@/lib/octa/modelosPremium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SO_OCTA = { modelos: [{ id: "octa", nome: "Octa (padrão)" }], premium: false };

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !octaGatewayConfigurado()) return NextResponse.json(SO_OCTA);
  const habilitados = premiumHabilitados();
  if (!habilitados.length) return NextResponse.json(SO_OCTA);

  let plano = "free";
  let superAdmin = false;
  try {
    const u = await prisma.user.findUnique({ where: { email }, select: { plan: true, plusUntil: true, trialGranted: true, role: true } });
    const state: PlanState = { plan: normalizePlan(u?.plan), plusUntil: u?.plusUntil ?? null, trialGranted: !!u?.trialGranted };
    plano = effectivePlan(state);
    superAdmin = isSuperAdmin({ email, role: u?.role ?? null });
  } catch { /* DB fora → trata como free (sem premium) */ }
  if (!podeUsarPremium(plano, superAdmin)) return NextResponse.json(SO_OCTA);

  return NextResponse.json({
    modelos: [SO_OCTA.modelos[0], ...habilitados.map((m) => ({ id: m.id, nome: m.nome }))],
    premium: true,
  });
}
