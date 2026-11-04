/**
 * GET  /api/tcc?scopeId=           → { tcc: { id, titulo, status } | null }  (o TCC da conversa)
 * GET  /api/tcc?scopeId=&todos=1   → { trabalhos: [{ id, titulo, status, tipo }] }  (chat único: vários por conversa)
 * POST /api/tcc { topic, scopeId } → { workId }  (cria do tópico e escreve em BACKGROUND; poll no GET /:id)
 * TCC cross-sala (Estudos cria/edita · Pesquisa lapida). Docs: docs/HANDOFF_TCC_CROSS_SALA.md. Atrás de TCC_CROSS=1.
 */
import { NextResponse } from "next/server";
import { sanitizeScopeId } from "@/lib/cartolina/route-auth";
import { entrarTcc } from "@/lib/tcc/route-auth";
import { criarTcc, findTccDoEscopo, listarTrabalhosDoEscopo } from "@/lib/tcc/store";
import { ESQUELETO_TCC } from "@/lib/tcc/secoes";
import { gerarTccEmBackground } from "@/lib/tcc/gerar";
import { fixarCardTcc, partidaDoPedido } from "@/lib/tcc/turno";
import { MAX_INSTRUCOES } from "@/lib/tcc/briefing";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const a = await entrarTcc(req, "tcc-get");
  if ("response" in a) return a.response;
  const q = new URL(req.url).searchParams;
  const scopeId = sanitizeScopeId(q.get("scopeId"));
  if (q.get("todos") === "1") {
    if (!scopeId) return NextResponse.json({ trabalhos: [] });
    const lista = await listarTrabalhosDoEscopo(a.userId, scopeId);
    // a pasta mais antiga primeiro (é a ordem em que nasceram na conversa)
    return NextResponse.json({ trabalhos: lista.reverse().map((t) => ({ id: t.id, titulo: t.titulo, status: t.status, tipo: t.workType || "TCC" })) });
  }
  if (!scopeId) return NextResponse.json({ tcc: null });
  const t = await findTccDoEscopo(a.userId, scopeId);
  return NextResponse.json({ tcc: t ? { id: t.id, titulo: t.titulo, status: t.status } : null });
}

export async function POST(req: Request) {
  const a = await entrarTcc(req, "tcc-post", "ai-heavy"); // dispara geração com LLM → balde pesado
  if ("response" in a) return a.response;
  const body = await req.json().catch(() => ({}));
  /**
   * O TETO ERA 300 CARACTERES, e isso repetia aqui o defeito que a D7 consertou no chat: um pedido
   * elaborado chegava cortado, virava o TÍTULO do documento e a consulta da busca de literatura.
   * Esta rota ficou de fora da D7 — o chat passa por `tccDoTurno`, não por aqui — e o buraco só
   * apareceu ao procurar por que um pedido real ainda falhava. Agora o teto é o do briefing, e o
   * que decide título/seções é o mesmo `partidaDoPedido` do chat.
   */
  const topic = typeof body?.topic === "string" ? body.topic.replace(/[ \t]+/g, " ").trim().slice(0, MAX_INSTRUCOES) : "";
  if (!topic) return NextResponse.json({ error: "Informe o tema do TCC." }, { status: 400 });
  const scopeId = sanitizeScopeId(body?.scopeId);

  // Um TCC por conversa: duplo-clique/reload devolve o que já existe (sem gastar modelo).
  if (scopeId) {
    const existente = await findTccDoEscopo(a.userId, scopeId);
    if (existente) return NextResponse.json({ workId: existente.id, status: existente.status });
  }
  // o MESMO caminho do chat: num briefing, título provisório (quem nomeia é o esboço) e as seções
  // do pedido vencendo o esqueleto; num tema simples, tudo igual a antes.
  const { brief, titulo, secoes } = partidaDoPedido(topic, ESQUELETO_TCC);
  const t = await criarTcc({
    userId: a.userId, scopeId, titulo, origem: "estudos", status: "gerando", secoes,
  });
  // Solto (padrão do Studio): responde já; o documento cresce e o cliente vê pelo poll.
  void gerarTccEmBackground(t.id, a.userId, titulo, undefined, brief);
  if (scopeId) void fixarCardTcc(a.userId, scopeId, { workId: t.id, titulo: t.titulo, secoes: t.secoes.length });
  return NextResponse.json({ workId: t.id, status: "gerando" }, { status: 202 });
}
