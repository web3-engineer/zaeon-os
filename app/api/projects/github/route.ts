/**
 * GitHub integration endpoint for the Projetos IDE.
 *
 *   GET  /api/projects/github   → action catalog + required scopes + connected flag.
 *   POST /api/projects/github   → validates a requested action against the catalog
 *                                  and least-privilege rules, then EXECUTES it via
 *                                  Octokit when the GitHub App is configured.
 *
 * Auth model: GitHub *App* installation token (server-to-server). See
 * lib/projects/github-client.ts. When the env/SDK are not present, the route
 * preserves the original contract behavior (connected:false, wouldExecute) so
 * the UI flow stays testable end-to-end without secrets.
 *
 * Gate order (unchanged — never trust the model/client):
 *   auth → eligibility → autonomy gate → approval gate → execute.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { assertEligibleOrThrow, ProjectsAccessError } from "@/lib/projects/access";
import {
  GITHUB_ACTIONS,
  GITHUB_ACTION_MAP,
  DEFAULT_OAUTH_SCOPES,
  requiresApproval,
} from "@/lib/projects/github-actions";
import { isGitHubConfigured, getAppSlug, buildInstallUrl, getInstallationOctokit } from "@/lib/projects/github-client";
import { executeAction, GitHubNotConfiguredError, type ExecuteParams } from "@/lib/projects/github-service";
import { getUserOctokit, getUserConnection, isUserOAuthConfigured } from "@/lib/projects/github-user";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_BRANCHES = new Set(["main", "master"]);

async function getEligibleUser(email: string) {
  // NOTE: once `githubInstallationId` is migrated + the Prisma client regenerated,
  // add it to `select` and pass it to executeAction() for per-user installations.
  const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true, course: true, role: true } });
  if (!dbUser) return null;
  assertEligibleOrThrow(dbUser.course, { email, role: dbUser.role }); // super admin sempre passa
  return dbUser;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await getEligibleUser(session.user.email);
  } catch (err: any) {
    if (err instanceof ProjectsAccessError) return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await getUserConnection(session.user.email);     // conta pessoal do aluno (OAuth)
  const connected = conn.connected || isGitHubConfigured();
  const installUrl = buildInstallUrl(await getAppSlug());
  return NextResponse.json({
    actions: GITHUB_ACTIONS,
    scopes: DEFAULT_OAUTH_SCOPES,
    connected,
    userConnected: conn.connected,
    userLogin: conn.login,
    connectUrl: isUserOAuthConfigured() ? "/api/projects/github/connect" : null,
    installUrl, // (modelo org/instalação) URL pública para instalar o App
    note: conn.connected
      ? `Conectado como ${conn.login} (sua conta GitHub). Repos criados/commitados na SUA conta.`
      : connected
        ? "GitHub App (installation) configurado."
        : "Conecte sua conta GitHub para criar e publicar projetos no seu próprio GitHub.",
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await getEligibleUser(session.user.email);

    const body = await req.json().catch(() => ({} as any));
    const actionId = String(body.actionId ?? "");
    const approved = body.approved === true;
    const fromAutonomousLoop = body.autonomous === true;
    const params: ExecuteParams = (body.params ?? {}) as ExecuteParams;

    const action = GITHUB_ACTION_MAP[actionId];
    if (!action) {
      return NextResponse.json({ error: `Ação desconhecida: ${actionId || "(vazia)"}` }, { status: 400 });
    }

    // Autonomy gate: irreversible/approval-required actions can never be driven
    // by the autonomous loop.
    if (fromAutonomousLoop && !action.autonomyAllowed) {
      return NextResponse.json(
        { error: `Ação "${action.label}" não é permitida em loop autônomo. Requer aprovação humana.`, action },
        { status: 409 },
      );
    }

    // Approval gate.
    if (requiresApproval(actionId) && !approved) {
      return NextResponse.json(
        { needsApproval: true, action, message: `A ação "${action.label}" exige aprovação humana explícita.` },
        { status: 202 },
      );
    }

    // Safety guard: content-mutating actions must target a working branch, never
    // main/master. Pushing to the default branch is the separate, approval-gated
    // `push_default`.
    if (["commit", "delete_file", "rename_file"].includes(actionId) && params.branch && DEFAULT_BRANCHES.has(params.branch.toLowerCase())) {
      return NextResponse.json(
        { error: `"${actionId}" em "${params.branch}" toca o branch padrão. Use um branch de trabalho (ou "push_default" com aprovação).` },
        { status: 409 },
      );
    }

    // Resolve o cliente: PREFERE o token do usuário (age na conta dele); senão
    // cai no installation token (modelo org/instalação).
    const userOcto = await getUserOctokit(session.user.email);
    const octokit = userOcto || (isGitHubConfigured() ? await getInstallationOctokit() : null);

    // Sem nenhum dos dois: preserva o contrato (sem chamada real).
    if (!octokit) {
      return NextResponse.json({
        executed: false,
        wouldExecute: { actionId, scope: action.scope, risk: action.risk },
        message: "Conecte sua conta GitHub (ou configure o GitHub App) para executar de verdade.",
      });
    }

    const { result } = await executeAction(octokit, actionId, params);
    return NextResponse.json({
      executed: true,
      action: { id: actionId, scope: action.scope, risk: action.risk },
      result,
    });
  } catch (err: any) {
    if (err instanceof ProjectsAccessError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: 403 });
    }
    if (err instanceof GitHubNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: err?.message ?? "Falha na ação GitHub." }, { status: 500 });
  }
}
