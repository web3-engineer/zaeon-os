// Resumo LEVE (modo Vercel) — sem baixar o PDF. Resume do título + abstract + autores
// que já estão nas sessões de pesquisa do usuário. Usa Gemini Flash (Vertex, via geminiText
// → fatura no crédito GenAI). O resumo PROFUNDO (baixa o PDF inteiro) fica pro modo
// container — ver lib/runtime/mode.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { geminiText } from "@/lib/ai/gemini-text";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { guard } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `Você é a Aura, parceira de pesquisa da Zaeon — fala como uma colega esperta e acolhedora,
não como um manual. A partir dos metadados de um artigo (título, autores, abstract), escreva um resumo claro
e gostoso de ler em português do Brasil, em TEXTO CORRIDO: o que o trabalho é, como ele aborda o problema,
o que descobre e por que isso importa pra quem pesquisa. Direto, sem listona numerada. Use **negrito** só nos
pontos que merecem destaque. Se só tiver o título, dê uma visão preliminar do provável tema e avise que é só
uma prévia, sem o texto completo.`;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email }, select: { id: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await guard(req, "summarize-lite", "ai-light");
    if (!rl.ok) return rl.response;

    const body = await req.json().catch(() => ({}));
    let { pdfUrl, title, abstract, authors } =
        body as { pdfUrl?: string; title?: string; abstract?: string; authors?: string[] };

    // Resolve metadados a partir das sessões do usuário (mesma autorização do proxy de PDF)
    if ((!abstract || !title) && (pdfUrl || title)) {
        const sessions = await prisma.scholarSession.findMany({
            where: { userId: dbUser.id }, select: { references: true },
            orderBy: { createdAt: "desc" }, take: 40, // limita p/ não estourar o tempo (504)
        });
        for (const s of sessions) {
            const refs = Array.isArray(s.references) ? (s.references as any[]) : [];
            const hit = refs.find((p) => (pdfUrl && p?.pdfUrl === pdfUrl) || (title && p?.title === title));
            if (hit) {
                title = title || hit.title;
                abstract = abstract || hit.abstract;
                authors = authors || hit.authors;
                break;
            }
        }
    }

    if (!title && !abstract) {
        return NextResponse.json(
            { error: "no_metadata", text: "Não achei metadados desse documento pra resumir sem baixar o arquivo. Tente o resumo profundo (modo container)." },
            { status: 404 },
        );
    }

    const ctx = [
        title ? `Título: ${title}` : "",
        authors?.length ? `Autores: ${authors.join(", ")}` : "",
        abstract ? `Abstract:\n${abstract}` : "(sem abstract disponível — só o título)",
    ].filter(Boolean).join("\n");

    try {
        // mesmo (título+abstract) → mesmo resumo, cacheado 7d (evita repagar e reduz 504).
        const text = await cacheJson(hashKey("sumlite", ctx), 60 * 60 * 24 * 7,
            () => geminiText({ system: SYSTEM, prompt: ctx, temperature: 0.5 }));
        return NextResponse.json({ text, mode: "lite", basis: abstract ? "abstract" : "title", context: ctx });
    } catch (e: any) {
        console.error("summarize-lite error:", e?.message);
        return NextResponse.json({ error: "ai_error", text: "Falha ao gerar o resumo leve." }, { status: 502 });
    }
}
