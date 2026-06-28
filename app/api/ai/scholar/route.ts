import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { retrievePapers, MIN_RESULTS } from "@/lib/scholar/retrieve";
import { resolveFullText } from "@/lib/scholar/fulltext";
import { planQuery, synthesize } from "@/lib/scholar/synthesize";
import { assembleResults } from "@/lib/scholar/assemble";
import { buildReferencesBib } from "@/lib/scholar/bibtex";
import { planTone } from "@/lib/scholar/prompt";
import { mapLimit } from "@/lib/scholar/http";
import type { ScholarEvent } from "@/lib/scholar/types";
import { guard } from "@/src/lib/ratelimit";
import { cacheDel } from "@/src/lib/cache";
import { canDeepThink } from "@/lib/ai/deepThinkAccess";

export const runtime = "nodejs";
// Vercel: Hobby e Pro (padrão) limitam a função a 60s. 300 era rejeitado/cortado em prod
// (a pesquisa "morria" no meio e não carregava). 60s + modo rápido (TOP_N=4) cabe no limite.
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const rl = await guard(req, "ai-scholar", "ai-heavy");
  if (!rl.ok) return rl.response;

  // The session.user does NOT carry an id field — look it up from email.
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  const userId = dbUser.id;
  await cacheDel(`sess:${userId}`); // nova pesquisa → invalida o cache da lista de sessões

  const { prompt, room, deep } = await req.json();
  // Modo RÁPIDO (default) vs PROFUNDO (toggle do usuário). O custo de tempo está em
  // abrir o full-text dos papers + sintetizar; no rápido reduzimos o N pra ser ágil.
  // Modo econômico: só quem o admin liberou pode rodar o PROFUNDO; senão cai no rápido.
  const isDeep = deep === true && (await canDeepThink(session.user.email));
  const TOP_N = isDeep ? 10 : 4;
  const FT_CONCURRENCY = isDeep ? 3 : 4;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ScholarEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const created = await prisma.scholarSession.create({
          data: { userId, room: room ?? null, query: prompt, status: "running" },
        });
        send({ type: "session", sessionId: created.id });

        // PLAN
        console.log("[scholar] ▶ planning:", prompt.slice(0, 80));
        send({ type: "phase", phase: "planning", message: planTone(prompt) });
        const plan = await planQuery(prompt);
        console.log("[scholar] ✓ planned → searching", plan.queries);

        // SEARCH (garante ≥ MIN_RESULTS pesquisas)
        const queries = plan.queries.length ? plan.queries : [prompt];
        const retrieved = await retrievePapers(queries, {
          domain: plan.domain,
          minResults: MIN_RESULTS,
          onSource: (r) =>
            send({
              type: "phase",
              phase: "searching",
              source: r.source,
              count: r.papers.length,
              message:
                r.status === "ok"
                  ? `✓ ${r.source}: ${r.papers.length} papers`
                  : r.status === "rate_limited"
                    ? `⏳ ${r.source}: limite de requisições atingido (tentei reenviar)`
                    : `⚠ ${r.source}: indisponível agora`,
            }),
        });
        // RELEVÂNCIA: só mantém papers que batem com o que o USUÁRIO pediu (título/abstract).
        // Sem isso, busca vaga ("haskell") ancorava em papers de física (arXiv tem muito
        // full-text aberto) → resposta/refs/base fora do tema. Se nada bate, segue vazio
        // (melhor "não achei" do que ruído).
        const STOP = new Set(["sobre", "para", "como", "qual", "quais", "que", "com", "dos", "das", "uma", "the", "and", "for", "with", "what"]);
        const promptTerms = [...new Set((String(prompt).toLowerCase().match(/[a-zà-ú0-9]{4,}/gi) || []))].filter((t) => !STOP.has(t));
        const isRelevant = (p: any) => {
          if (!promptTerms.length) return true;
          const hay = `${p.title ?? ""} ${p.abstract ?? ""} ${(p.keywords ?? []).join(" ")}`.toLowerCase();
          return promptTerms.some((t) => hay.includes(t));
        };
        const filtered = retrieved.papers.filter(isRelevant);
        // só aplica o filtro se sobrar algo; se zerar tudo, mantém o original (evita "sumir" geral)
        const unique = filtered.length ? filtered : retrieved.papers;
        console.log("[scholar] ✓ search:", retrieved.papers.length, "→ relevantes:", unique.length);

        // FULL TEXT (top N — síntese profunda só nos primeiros, por qualidade/velocidade)
        // Rápido: menos papers (mais ágil). Profundo: 10 (mais completo, mais lento).
        const top = unique.slice(0, TOP_N);
        const withText = await mapLimit(top, FT_CONCURRENCY, (p) => resolveFullText(p));
        const ftCount = withText.filter(
          (p) => p.retrievedText && p.retrievedText.kind !== "abstract"
        ).length;
        send({
          type: "phase",
          phase: "dedup",
          unique: unique.length,
          fulltext: ftCount,
          message: `✓ ${unique.length} pesquisas encontradas · full-text aberto de ${ftCount}`,
        });

        // SYNTHESIZE
        send({
          type: "phase",
          phase: "synthesizing",
          message: "🧠 Indo mais fundo e conferindo cada citação…",
        });
        const grounded = withText.filter((p) => p.retrievedText);
        console.log("[scholar] ▶ synthesizing from", grounded.length, "grounded papers");
        const raw = await synthesize(prompt, grounded);
        console.log("[scholar] ✓ synthesized → verifying");

        // VERIFY + ASSEMBLE (deterministic; unit-tested in lib/scholar/assemble.test.ts)
        const r = assembleResults(prompt, grounded, raw);
        send({
          type: "phase",
          phase: "verifying",
          checked: (raw.evidence ?? []).length,
          verified: r.verifiedCount,
          dropped: r.dropped,
          message: `✓ ${r.verifiedCount} citações confirmadas`,
        });

        send({ type: "answer", text: r.answer });

        const bib = await buildReferencesBib(r.references);
        if (bib.trim()) r.files.push({ name: "references.bib", kind: "bibtex", content: bib });

        // Referências exibidas = SÓ as que vieram do pedido do usuário (verificadas na síntese).
        // NÃO completar até um mínimo com papers "descobertos" — isso enchia de ruído fora do
        // tema (ex.: física em busca de "haskell"). Se vier pouco, mostra pouco.
        const displayReferences = r.references;

        // Aba "Resultados": TODOS os artigos descobertos/deduplicados (não só os citados).
        // Remove o texto pesado (retrievedText) pra não inchar payload/banco. Cap em 80.
        const displayResults = unique.slice(0, 80).map((p) => ({
          id: p.id, title: p.title, authors: p.authors, year: p.year, venue: p.venue,
          doi: p.doi, arxivId: p.arxivId, url: p.url, pdfUrl: p.pdfUrl,
          abstract: p.abstract, citationCount: p.citationCount, openAccess: p.openAccess, sources: p.sources,
        }));

        // const separada (não literal inline) → o campo novo `results` não dispara o
        // excess-property check do TS enquanto o client do Prisma não é regenerado.
        // O `prisma generate` (deploy/local) reconhece o campo em runtime.
        const updateData: any = {
          status: "done",
          domain: plan.domain || null,
          references: displayReferences as any,
          results: displayResults as any,
          evidence: r.evidence as any,
          insights: r.insights as any,
          gaps: r.gaps as any,
          files: r.files as any,
          thread: { answer: r.answer } as any,
        };
        const saved = await prisma.scholarSession.update({
          where: { id: created.id },
          data: updateData,
        });
        console.log("[scholar] ✓ DONE:", created.id);
        send({ type: "done", session: saved });
      } catch (err: any) {
        console.error("[scholar] x ERRO:", err?.message, err?.stack?.split("\n")?.[1]?.trim());
        send({ type: "error", message: err?.message ?? "Erro inesperado" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
