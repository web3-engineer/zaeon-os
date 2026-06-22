/**
 * /api/ai/doc/chat — CONVERSAR com um documento INTERNO (estudo/pesquisa gerado).
 *
 * Por que existe: docs gerados pelo usuário NÃO são referências do Scholar e não têm
 * PDF p/ baixar — o caminho antigo (GET /api/ai/scholar/pdf) dava 403 e o chat morria
 * sem resposta. Aqui usamos o TEXTO que o app já tem: inline (`content`, do editor) ou
 * carregado do banco por `docId` (CollabDoc.content ou StudyItem.payload). Gemini (Vertex)
 * responde com base SÓ nesse texto — fatura no crédito GenAI.
 *
 * Body: { question, content?, title?, docId?, docType?, history? }
 *   - content+title : doc inline (research-lab já tem o markdown no cliente);
 *   - docId(+docType: "collab"|"study") : carrega do banco com checagem de acesso.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { geminiText } from "@/lib/ai/gemini-text";
import { extractDocText, clampDocText } from "@/lib/ai/docContext";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Você é a Aura, parceira de pesquisa da Zaeon — conversa como uma colega esperta e gente boa.
Responda à pergunta do usuário SOMENTE com base no DOCUMENTO fornecido, em português do Brasil e em texto
corrido. Cite trechos do próprio documento quando ajudar a fundamentar. Se a resposta não estiver no documento,
diga com honestidade que aquilo não consta no texto — não invente. Use **negrito** só no que merece destaque.`;

async function me(): Promise<{ id: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
}

/** Carrega o texto de um doc do banco respeitando o acesso do usuário. */
async function loadDocText(
  userId: string,
  docId: string,
  docType?: string,
): Promise<{ title: string; text: string } | null> {
  // CollabDoc: só membros. (default e p/ docType "collab"/"research"/"report")
  if (docType !== "study") {
    const doc = await prisma.collabDoc.findUnique({ where: { id: docId } });
    if (doc) {
      if (!doc.members.includes(userId)) return null;
      return { title: doc.title, text: extractDocText({ content: doc.content }) };
    }
  }
  // StudyItem: só o dono.
  const item = await prisma.studyItem.findUnique({ where: { id: docId } });
  if (item && item.userId === userId) {
    return { title: item.title, text: extractDocText(item) };
  }
  return null;
}

export async function POST(req: Request) {
  const u = await me();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, "ai-doc-chat", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "empty_question" }, { status: 400 });

  // Origem do texto: inline (cliente) tem prioridade; senão carrega do banco.
  let title = typeof body.title === "string" ? body.title : "Documento";
  let text = extractDocText({ content: body.content });
  if (!text && typeof body.docId === "string" && body.docId) {
    const loaded = await loadDocText(u.id, body.docId, body.docType);
    if (!loaded) return NextResponse.json({ error: "doc_not_found" }, { status: 404 });
    title = loaded.title || title;
    text = loaded.text;
  }
  if (!text) {
    return NextResponse.json({ error: "no_content", text: "Sem conteúdo do documento para conversar." }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : undefined;
  const prompt = `DOCUMENTO "${title}":\n${clampDocText(text)}\n\nPERGUNTA: ${question}`;
  try {
    const answer = await geminiText({ system: SYSTEM, prompt, temperature: 0.4, history });
    return NextResponse.json({ text: answer });
  } catch {
    return NextResponse.json({ error: "ai_error", text: "Não consegui responder agora." }, { status: 502 });
  }
}
