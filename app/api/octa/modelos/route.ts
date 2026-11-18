/**
 * GET /api/octa/modelos — quais modelos o aluno pode escolher no agente de código geral do Octa.
 *
 * Sempre devolve 200 (a UI decide o que mostrar). O "octa" (padrão da casa, Gemini via gateway — a menos
 * que o dono tenha ligado OCTA_MODELO_LOCAL globalmente, ver lib/octa/modelo) está SEMPRE na lista. Além dele:
 *   · LOCAIS grátis (qwen3-coder, lib/octa/modelosLocais) — flag OCTA_MODELOS_LOCAIS + plano `plus`;
 *   · PREMIUM pagos (Claude/Codex, lib/octa/modelosPremium) — flag OCTA_MODELOS_PREMIUM + plano `max`.
 * Ambos só entram com o gateway LiteLLM ligado E o usuário podendo (plano/super-admin). Cada item leva um
 * `tipo` ("padrao" | "local" | "premium") pra UI pintar certo. O portão de verdade é server-side na
 * própria /api/octa/agente — aqui é só conveniência de UI.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { effectivePlan, normalizePlan, type PlanState } from "@/lib/plans";
import { isSuperAdmin } from "@/lib/auth/roles";
import { octaGatewayConfigurado } from "@/lib/octa/litellm";
import { premiumHabilitados, podeUsarPremium } from "@/lib/octa/modelosPremium";
import { locaisHabilitados, podeUsarLocal } from "@/lib/octa/modelosLocais";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PADRAO = { id: "octa", nome: "Gemini", tipo: "padrao" as const };
const SO_OCTA = { modelos: [PADRAO], premium: false };

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !octaGatewayConfigurado()) return NextResponse.json(SO_OCTA);
  const premHab = premiumHabilitados();
  const locaisHab = locaisHabilitados();
  if (!premHab.length && !locaisHab.length) return NextResponse.json(SO_OCTA);

  let plano = "free";
  let superAdmin = false;
  try {
    const u = await prisma.user.findUnique({ where: { email }, select: { plan: true, plusUntil: true, trialGranted: true, role: true } });
    const state: PlanState = { plan: normalizePlan(u?.plan), plusUntil: u?.plusUntil ?? null, trialGranted: !!u?.trialGranted };
    plano = effectivePlan(state);
    superAdmin = isSuperAdmin({ email, role: u?.role ?? null });
  } catch { /* DB fora → trata como free (sem local/premium) */ }

  const modelos: { id: string; nome: string; tipo: "padrao" | "local" | "premium" }[] = [PADRAO];
  if (podeUsarLocal(plano, superAdmin)) for (const m of locaisHab) modelos.push({ id: m.id, nome: m.nome, tipo: "local" });
  if (podeUsarPremium(plano, superAdmin)) for (const m of premHab) modelos.push({ id: m.id, nome: m.nome, tipo: "premium" });

  return NextResponse.json({ modelos, premium: modelos.length > 1 });
}
