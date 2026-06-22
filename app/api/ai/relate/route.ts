// Relação entre DOIS trabalhos (arrastar uma pesquisa sobre a outra).
// Dois níveis (ver lib/runtime/mode):
//   - mode "vercel"  → SIMPLES: relação a partir dos metadados (título+abstract) via Groq. Sem PDF, sem 502.
//   - mode "gemini"  → SOFISTICADO: agente Gemini (Vertex) com acesso aos DOIS PDFs inteiros.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { VertexAI } from "@google-cloud/vertexai";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { geminiText } from "@/lib/ai/gemini-text";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { guard } from "@/src/lib/ratelimit";
import { extractDocText, buildRelateTextContext } from "@/lib/ai/docContext";

export const runtime = "nodejs";
export const maxDuration = 60;

interface DocRef { pdfUrl?: string; title?: string; abstract?: string; authors?: string[]; fileData?: string; text?: string; content?: string }

const SYSTEM = `Você é a Aura, parceira de pesquisa da Zaeon — conversa como uma colega esperta e gente boa,
não como um robô. Recebe dois trabalhos e explica, em português do Brasil e em TEXTO CORRIDO (sem listas
numeradas frias), como eles conversam entre si: o que cada um traz, onde se encontram, onde divergem ou se
completam, e como dá pra usá-los juntos numa pesquisa. Vá direto ao ponto, com calor e clareza. Use **negrito**
só no que realmente merece destaque — nada de encher de marcadores.`;

async function resolveMeta(userId: string, d: DocRef): Promise<DocRef> {
    if (d.abstract && d.title) return d;
    // limita p/ não carregar todas as sessões (causava 504): só as 40 mais recentes.
    const sessions = await prisma.scholarSession.findMany({
        where: { userId }, select: { references: true },
        orderBy: { createdAt: "desc" }, take: 40,
    });
    for (const s of sessions) {
        const refs = Array.isArray(s.references) ? (s.references as any[]) : [];
        const hit = refs.find((p) => (d.pdfUrl && p?.pdfUrl === d.pdfUrl) || (d.title && p?.title === d.title));
        if (hit) return { ...d, title: d.title || hit.title, abstract: d.abstract || hit.abstract, authors: d.authors || hit.authors };
    }
    return d;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await guard(req, "ai-relate", "ai-heavy");
    if (!rl.ok) return rl.response;

    const body = await req.json().catch(() => ({}));
    const mode: "vercel" | "gemini" = body.mode === "gemini" ? "gemini" : "vercel";
    const a: DocRef = body.a || {};
    const b: DocRef = body.b || {};

    // ───────── NÍVEL TEXTO (docs INTERNOS gerados): corpo dos dois → Gemini ─────────
    // Estudos/pesquisas do usuário já têm o texto no app/banco — não há PDF p/ baixar
    // (era a causa do 403). Se ambos trazem texto, relaciona direto, sem proxy de PDF.
    const aText = extractDocText({ text: a.text ?? a.content });
    const bText = extractDocText({ text: b.text ?? b.content });
    if (aText && bText) {
        try {
            const ctx = buildRelateTextContext({ title: a.title, text: aText }, { title: b.title, text: bText });
            const text = await geminiText({ system: SYSTEM, prompt: ctx, temperature: 0.5 });
            return NextResponse.json({ text, mode: "text" });
        } catch {
            return NextResponse.json({ error: "ai_error", text: "Falha ao relacionar os documentos." }, { status: 502 });
        }
    }

    // ───────── NÍVEL SIMPLES (Vercel): metadados → Groq ─────────
    if (mode === "vercel") {
        const [ma, mb] = await Promise.all([resolveMeta(dbUser.id, a), resolveMeta(dbUser.id, b)]);
        if (!ma.title && !ma.abstract && !mb.title && !mb.abstract) {
            return NextResponse.json({ error: "no_metadata", text: "Sem metadados pra relacionar. Use o nível Gemini (com os PDFs)." }, { status: 404 });
        }
        const ctx = `TRABALHO A:\nTítulo: ${ma.title || "(sem título)"}\n${ma.authors?.length ? `Autores: ${ma.authors.join(", ")}\n` : ""}Abstract: ${ma.abstract || "(sem abstract)"}\n\n` +
                    `TRABALHO B:\nTítulo: ${mb.title || "(sem título)"}\n${mb.authors?.length ? `Autores: ${mb.authors.join(", ")}\n` : ""}Abstract: ${mb.abstract || "(sem abstract)"}`;
        try {
            // mesma dupla de metadados → mesma relação (7d).
            const text = await cacheJson(hashKey("relate", { a: { t: ma.title, ab: ma.abstract }, b: { t: mb.title, ab: mb.abstract } }), 60 * 60 * 24 * 7,
              () => geminiText({ system: SYSTEM, prompt: ctx, temperature: 0.5 }));
            return NextResponse.json({ text, mode: "vercel" });
        } catch (e: any) {
            return NextResponse.json({ error: "ai_error", text: "Falha ao gerar a relação (leve)." }, { status: 502 });
        }
    }

    // ───────── NÍVEL SOFISTICADO (Gemini): os 2 PDFs inteiros ─────────
    if (!a.fileData || !b.fileData) {
        return NextResponse.json({ error: "missing_pdf", text: "O nível Gemini precisa dos dois PDFs (fileData A e B)." }, { status: 400 });
    }
    try {
        const { project, client_email, private_key, location } = vertexCredentials();
        const vertexAI = new VertexAI({
            project,
            location,
            googleAuthOptions: { credentials: { client_email, private_key } },
        });
        const model = vertexAI.getGenerativeModel({
            model: process.env.SCHOLAR_GEMINI_MODEL || "gemini-2.5-flash",
            generationConfig: { temperature: 0.4 },
        });
        const parts: any[] = [
            { text: "TRABALHO A (PDF a seguir):" },
            { inlineData: { data: a.fileData, mimeType: "application/pdf" } },
            { text: "TRABALHO B (PDF a seguir):" },
            { inlineData: { data: b.fileData, mimeType: "application/pdf" } },
            { text: "Analise a RELAÇÃO entre os dois trabalhos conforme as instruções do sistema." },
        ];
        const chat = model.startChat({ systemInstruction: { role: "system", parts: [{ text: SYSTEM }] } });
        const result = await chat.sendMessage(parts);
        const text = result.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
        return NextResponse.json({ text, mode: "gemini" });
    } catch (e: any) {
        console.error("relate gemini error:", e?.message);
        return NextResponse.json({ error: "gemini_error", text: "Falha no agente Gemini (checar credenciais Vertex)." }, { status: 502 });
    }
}
