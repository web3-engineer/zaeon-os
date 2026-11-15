/**
 * POST /api/studio/forja/publicar — sobe o PROJETO do aluno (os arquivos que ele digitou nos cards) no
 * GitHub DELE (F3). O curso é o repo real; ao praticar, o aluno reconstrói os arquivos digitando, e aqui
 * esse projeto vira um repositório na conta dele — 1 repo por curso.
 *
 * Segurança (invariantes):
 *  - Os arquivos são montados NO SERVIDOR a partir dos cards do curso (conteúdo canônico = o arquivo real,
 *    pela invariante da harmonia). O cliente manda só o `cursoId` — NUNCA conteúdo de arquivo arbitrário.
 *  - Push só na conta do PRÓPRIO aluno (getUserOctokit = token dele). Sem conexão → 409 "conecte seu GitHub".
 *  - Ação disparada pelo aluno (o botão do card só habilita quando o teste passa no navegador — o portão QA
 *    leve, F5-lite). Esta rota não executa código; ela publica o projeto já montado.
 *  - Residual (arquivos que o aluno não digita) é do Octa (F4) e entra depois como `extras`; por ora o push
 *    leva os arquivos digitados + README.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { guard } from "@/src/lib/ratelimit";
import { resolverEsqueleto } from "@/lib/forja/esqueletoResolver";
import { cardsCacheados } from "@/lib/forja/cardsLocal";
import { tutorialDemoDoCurso } from "@/lib/forja/tutoriaisDemo";
import { arquivosDoProjeto, nomeRepoDoCurso } from "@/lib/forja/projetoDoCurso";
import { getUserOctokit, getUserConnection } from "@/lib/projects/github-user";
import { createRepo, repoExiste, commitFiles } from "@/lib/projects/github-service";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-forja-publicar", "ai-light");
  if (!rl.ok) return rl.response;

  const body = (await req.json().catch(() => ({}))) as { cursoId?: unknown };
  const cursoId = typeof body.cursoId === "string" ? body.cursoId : "";
  const esq = resolverEsqueleto(cursoId);
  if (!esq) return NextResponse.json({ error: "curso_inexistente" }, { status: 404 });

  // Cards do curso (fonte dos arquivos) — montados no servidor, nunca vindos do cliente.
  const gerados = await cardsCacheados(esq.repo).catch(() => []);
  const cards = gerados.length ? gerados : tutorialDemoDoCurso(esq.id);
  if (!cards.length) return NextResponse.json({ error: "curso_sem_pratica" }, { status: 400 });

  // Conexão GitHub do aluno (token dele). Sem isso, não há onde publicar.
  const octokit = await getUserOctokit(email);
  if (!octokit) {
    return NextResponse.json(
      { error: "github_nao_conectado", conecte: "/api/projects/github/connect" },
      { status: 409 },
    );
  }
  const { login } = await getUserConnection(email);
  if (!login) {
    return NextResponse.json(
      { error: "github_nao_conectado", conecte: "/api/projects/github/connect" },
      { status: 409 },
    );
  }

  // Monta os arquivos do projeto do aluno a partir dos cards (PURO, server-side).
  const arquivos = arquivosDoProjeto(cards, { titulo: esq.titulo, repo: esq.repo });
  if (!arquivos.length) return NextResponse.json({ error: "projeto_vazio" }, { status: 400 });

  const nome = nomeRepoDoCurso(esq.id);
  const fullName = `${login}/${nome}`;

  try {
    // 1 repo por curso: cria se não existir (auto_init → já tem branch default), senão reusa.
    let branchDefault: string;
    if (await repoExiste(octokit, fullName)) {
      const info = await octokit.request("GET /repos/{owner}/{repo}", { owner: login, repo: nome });
      branchDefault = info.data.default_branch;
    } else {
      const criado = await createRepo(octokit, { name: nome, isPrivate: true });
      branchDefault = criado.defaultBranch;
    }

    const commit = await commitFiles(octokit, {
      repo: fullName,
      branch: branchDefault,
      message: `Zaeon: progresso em ${esq.titulo}`,
      files: arquivos,
    });

    return NextResponse.json({
      ok: true,
      repoUrl: `https://github.com/${fullName}`,
      branch: commit.branch,
      arquivos: arquivos.map((a) => a.path),
    });
  } catch (e: any) {
    // createRepo já traduz 403 (falta permissão) numa mensagem clara; repassamos o status.
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json(
      { error: "falha_ao_publicar", detalhe: typeof e?.message === "string" ? e.message : "Erro ao publicar no GitHub." },
      { status: status === 403 ? 403 : 502 },
    );
  }
}
