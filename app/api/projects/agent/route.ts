/**
 * POST /api/projects/agent
 *
 * The brain of the Projetos agentic IDE. Given the current IDE level, a task
 * kind, and project context, it routes to the right model (lib/ai/router.ts)
 * and returns a structured result the UI can render.
 *
 * Enforcement:
 *   - Auth required (NextAuth).
 *   - Course eligibility gate (lib/projects/access.ts) — fail closed.
 *
 * Output shape (stable contract, see docs/PROJECTS_AGENTIC_IDE_SPEC.md §3):
 *   {
 *     routing: { model, provider, reason, fallbackFrom? },
 *     kind: "diagram" | "doc" | "edit" | "plan" | "message",
 *     content: string,          // markdown / mermaid / file content
 *     plan?: AgentStep[],        // autonomy mode: proposed steps with approval flags
 *     proposedActions?: string[] // github action ids the step wants to run
 *   }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { assertEligibleOrThrow, ProjectsAccessError } from "@/lib/projects/access";
import { generate, type IdeLevel, type TaskKind, type ModelId } from "@/lib/ai/router";
import { requiresApproval } from "@/lib/projects/github-actions";

export const runtime = "nodejs";
// Vercel Hobby corta funções em 10s — mantemos explícito para não criar falsa expectativa.
export const maxDuration = 10;

const VALID_LEVELS: IdeLevel[] = ["prototype", "implementation", "autonomy"];
const VALID_TASKS: TaskKind[] = [
  "chat", "diagram", "doc", "edit", "scaffold", "filelist", "genfile",
  "architecture", "debug", "refactor", "plan",
];

function systemPromptFor(level: IdeLevel, task: TaskKind): string {
  const base =
    "Você é o agente de engenharia da IDE Projetos do Zaeon OS, no estilo do Claude Code: " +
    "preciso, conciso, orientado a evidência, e sempre priorizando segurança e reversibilidade. " +
    "Responda em português.";
  if (task === "diagram") {
    return base +
      " Gere SOMENTE um diagrama Mermaid válido (sem cercas de markdown extras quando possível), " +
      "escolhendo o tipo adequado (flowchart, erDiagram, sequenceDiagram, classDiagram, ou C4 quando aplicável).";
  }
  if (task === "doc") {
    return base +
      " Produza um resumo documental do projeto em markdown com seções: Escopo, Requisitos, " +
      "Decisões técnicas, Riscos, Roadmap.";
  }
  if (task === "scaffold") {
    return base +
      " Você é um agente que CRIA e CORRIGE projetos que rodam direto no navegador" +
      " (Python via Pyodide — só stdlib, sem pip; ou JavaScript puro; ou HTML). " +
      "Gere a estrutura de arquivos do projeto pedido, com código AUTOCONTIDO e EXECUTÁVEL. " +
      "Inclua SEMPRE um arquivo de entrada rodável (preferência: main.py; senão index.js ou index.html). " +
      "Evite dependências externas que exijam instalação. Se vier um ERRO de execução no contexto, " +
      "CORRIJA os arquivos para o código rodar sem erros. " +
      "Retorne SOMENTE JSON: {\"summary\": string, \"entry\": string, \"files\": [{\"path\": string, \"content\": string}]}. " +
      "\"summary\" é uma fala curta e amigável (estilo Claude Code) explicando o que você fez; " +
      "\"entry\" é o caminho do arquivo de entrada a rodar; cada arquivo COMPLETO e pronto para salvar; " +
      "caminhos relativos à raiz (ex.: \"src/main.py\"); não inclua nada fora do JSON.";
  }
  if (task === "filelist") {
    return base +
      " PLANEJE apenas a LISTA de arquivos do projeto pedido. NÃO escreva código agora. " +
      "HONRE a linguagem/stack que o usuário pedir (qualquer linguagem: JS, Python, Go, etc.). " +
      "Se o usuário NÃO especificar, prefira uma stack que rode JÁ no navegador para o usuário ver o " +
      "resultado na hora: app/site → HTML+CSS+JS; script/algoritmo/CLI → Python (stdlib). " +
      "Mantenha enxuto (no máximo 6 arquivos). Retorne SOMENTE JSON: " +
      "{\"summary\": string, \"entry\": string, \"files\": [{\"path\": string, \"purpose\": string}]}. " +
      "\"summary\" é uma fala curta e amigável (estilo Claude Code) do que você vai construir, citando a stack escolhida; " +
      "\"entry\" é o arquivo de entrada (ex.: index.html, main.py).";
  }
  if (task === "genfile") {
    return base +
      " Gere o conteúdo COMPLETO de UM ÚNICO arquivo do projeto, coerente com o objetivo e com os outros " +
      "arquivos já listados, na LINGUAGEM do projeto. Quando a stack roda no navegador (HTML/CSS/JS ou " +
      "Python stdlib), evite dependências externas para o preview funcionar de imediato; para imagens/áudio " +
      "prefira data URI ou CDNs públicas. Se for uma linguagem que normalmente exige build/servidor, ainda " +
      "assim gere código idiomático e correto. Se vier um ERRO no contexto, corrija o arquivo. " +
      "Retorne SOMENTE JSON: {\"content\": string}. Nada além do JSON.";
  }
  if (task === "architecture") {
    return base +
      " Analise o objetivo do usuário e proponha, em texto curto e conversacional (estilo Claude Code, " +
      "falando com o usuário), a melhor stack para rodar NO NAVEGADOR (Python/Pyodide, JS puro ou HTML), " +
      "as linguagens candidatas, e a lista de arquivos que você vai criar. Sem JSON, sem código — só a análise.";
  }
  if (level === "autonomy" || task === "plan") {
    return base +
      " Planeje em passos pequenos e reversíveis (planejar → editar → rodar → verificar → corrigir). " +
      "Use githubAction com os ids do catálogo quando o passo tocar o repositório " +
      "(create_branch, commit, open_pr, comment_pr, create_issue). " +
      "Retorne JSON: {\"summary\": string, \"steps\": [{\"title\": string, \"action\": string, " +
      "\"githubAction\": string|null, \"needsApproval\": boolean}]}.";
  }
  return base;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, course: true, role: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Hard access gate — super admin (allowlist/role) sempre passa.
    assertEligibleOrThrow(dbUser.course, { email: session.user.email, role: dbUser.role });

    const body = await req.json().catch(() => ({} as any));
    const level: IdeLevel = VALID_LEVELS.includes(body.level) ? body.level : "implementation";
    const task: TaskKind = VALID_TASKS.includes(body.task) ? body.task : "chat";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const context = typeof body.context === "string" ? body.context.slice(0, 12000) : "";
    const forceModel: ModelId | undefined =
      ["sonnet", "opus", "gemini"].includes(body.forceModel) ? body.forceModel : undefined;

    if (prompt.length < 2) {
      return NextResponse.json({ error: "Prompt inválido." }, { status: 400 });
    }

    const wantsScaffold = task === "scaffold";
    const wantsFilelist = task === "filelist";
    const wantsGenfile = task === "genfile";
    const targetPath = typeof body.targetPath === "string" ? body.targetPath.replace(/^\/+/, "") : "";
    const wantsJson = wantsScaffold || wantsFilelist || wantsGenfile || level === "autonomy" || task === "plan";
    const userMsg = context ? `CONTEXTO DO PROJETO:\n${context}\n\nPEDIDO:\n${prompt}` : prompt;

    const { text, decision } = await generate(
      {
        level,
        task,
        forceModel,
        contextTokens: Math.ceil((context.length + prompt.length) / 4),
        allowAnthropic: body.allowAnthropic !== false,
      },
      {
        system: systemPromptFor(level, task),
        prompt: userMsg,
        json: wantsJson,
        temperature: task === "architecture" || task === "debug" ? 0.2 : 0.4,
        // Thinking is disabled (router); these caps keep each call well under 10s.
        maxOutputTokens: wantsFilelist ? 768 : wantsGenfile ? 2048 : wantsScaffold ? 2048 : wantsJson ? 2048 : 1200,
      },
    );

    const routing = {
      model: decision.model,
      provider: decision.provider,
      reason: decision.reason,
      ...(decision.fallbackFrom ? { fallbackFrom: decision.fallbackFrom } : {}),
    };

    if (wantsJson) {
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* fall through to raw */ }
      if (wantsFilelist && Array.isArray(parsed?.files)) {
        const files = parsed.files
          .filter((f: any) => f && typeof f.path === "string")
          .map((f: any) => ({ path: f.path.replace(/^\/+/, ""), purpose: typeof f.purpose === "string" ? f.purpose : "" }))
          .slice(0, 6);
        const entry = typeof parsed.entry === "string" ? parsed.entry.replace(/^\/+/, "") : undefined;
        return NextResponse.json({ routing, kind: "filelist", content: parsed.summary ?? "", files, entry });
      }
      if (wantsGenfile) {
        const content = typeof parsed?.content === "string" ? parsed.content
          : typeof parsed?.file?.content === "string" ? parsed.file.content : null;
        if (content !== null) {
          return NextResponse.json({ routing, kind: "file", file: { path: targetPath, content } });
        }
      }
      if (wantsScaffold && Array.isArray(parsed?.files)) {
        const files = parsed.files
          .filter((f: any) => f && typeof f.path === "string" && typeof f.content === "string")
          .map((f: any) => ({ path: f.path.replace(/^\/+/, ""), content: f.content }));
        const entry = typeof parsed.entry === "string" ? parsed.entry.replace(/^\/+/, "") : undefined;
        return NextResponse.json({ routing, kind: "edits", content: parsed.summary ?? "", files, entry });
      }
      if (parsed?.steps) {
        // Re-stamp approval flags from the server-side catalog (never trust the model).
        parsed.steps = parsed.steps.map((s: any) => ({
          ...s,
          needsApproval: s.githubAction ? requiresApproval(s.githubAction) : !!s.needsApproval,
        }));
        return NextResponse.json({ routing, kind: "plan", content: parsed.summary ?? "", plan: parsed.steps });
      }
    }

    const kind = task === "diagram" ? "diagram" : task === "doc" ? "doc" : task === "edit" ? "edit" : "message";
    return NextResponse.json({ routing, kind, content: text });
  } catch (err: any) {
    if (err instanceof ProjectsAccessError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: 403 });
    }
    return NextResponse.json({ error: err?.message ?? "Falha no agente." }, { status: 500 });
  }
}
