/**
 * GET /api/ai/capabilities — o que a conta pode usar (fonte de verdade do gating).
 * Retorna: { plan, voice, deepThink, deepMode, projects, researchUnlimited }.
 * A UI usa pra liberar/mostrar cartões de upgrade (voz, profundo, projetos, pesquisa).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { effectivePlan, planCapabilities, type PlanState } from "@/lib/plans";
import { isSuperAdmin } from "@/lib/auth/roles";
import { cameraAoVivoLigada } from "@/lib/ai/camera";
import { visaoDisponivel } from "@/lib/ai/descreverImagem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE = { plan: "free", voice: false, deepThink: false, deepMode: "none", projects: false, researchUnlimited: false, camera: false };

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json(FREE);

  const u = await prisma.user.findUnique({
    where: { email },
    select: { plan: true, plusUntil: true, trialGranted: true, role: true, advancedVoiceEnabled: true, deepThinkEnabled: true, projectsEnabled: true },
  });
  if (!u) return NextResponse.json(FREE);

  const state: PlanState = { plan: (u.plan as any) || "free", plusUntil: u.plusUntil ?? null, trialGranted: !!u.trialGranted };
  const plan = effectivePlan(state);
  const caps = planCapabilities(plan);
  const sa = isSuperAdmin({ email, role: u.role });

  // VOZ (beta): controle honesto de consumo → liberada SÓ por super admin ou
  // por liberação explícita do admin (advancedVoiceEnabled). O plano NÃO libera voz
  // sozinho por enquanto (gerenciado na aba "Voz" do admin). Pós-beta dá pra voltar
  // a incluir `caps.voice` aqui.
  const voice = sa || !!u.advancedVoiceEnabled;
  const deepMode = sa ? "unlimited" : (caps.deep !== "none" ? caps.deep : (u.deepThinkEnabled ? "unlimited" : "none"));
  const projects = sa || caps.projects || !!u.projectsEnabled;

  return NextResponse.json({
    plan,
    voice,
    deepThink: deepMode !== "none",
    deepMode,
    projects,
    researchUnlimited: sa || caps.researchUnlimited,
    // câmera ao vivo ("be my eyes"): só quando a flag está ligada E há credencial Vertex. A UI usa
    // isto pra mostrar o botão da câmera — sem isto, o aluno veria um botão que não funciona.
    camera: cameraAoVivoLigada() && visaoDisponivel(),
  });
}
