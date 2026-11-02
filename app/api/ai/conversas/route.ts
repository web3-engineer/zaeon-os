/**
 * /api/ai/conversas — a lista de conversas do chat, da conta logada (#663). Antes ela só existia no navegador.
 *   GET    ?surface=estudos                     → as conversas que têm mensagens
 *   POST   { surface, scopeId, titulo?, parentId?, contexto?, mensagens } → sobe uma conversa antiga do navegador; enviar de novo não repete
 *   PUT    { surface, scopeId, titulo?, parentId?, contexto? } → guarda o título e o elo da sub-conversa
 *   DELETE ?surface=&scopeId=                   → apaga a conversa, as sub-conversas e as mensagens
 *   DELETE ?surface=&scopeId=&desde=<ms>        → editar/regenerar: apaga só as mensagens a partir desse instante
 */
import { NextResponse } from "next/server";
import { apagarConversa, cortarMensagens, guardarConversa, importarConversa, listarConversas, resolveUserId, type Surface, type TurnMsg } from "@/lib/agent/transcript";
import { sanitizeScopeId } from "@/lib/cartolina/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const salaValida = (v: unknown): v is Surface => v === "estudos" || v === "pesquisa";
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

export async function GET(req: Request) {
  const userId = await resolveUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const surface = new URL(req.url).searchParams.get("surface");
  if (!salaValida(surface)) return NextResponse.json({ error: "surface inválida" }, { status: 400 });
  try {
    return NextResponse.json({ conversas: await listarConversas(userId, surface) });
  } catch {
    return NextResponse.json({ error: "falha ao listar" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = await resolveUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const scopeId = sanitizeScopeId(body?.scopeId);
  if (!salaValida(body?.surface) || !scopeId || !Array.isArray(body?.mensagens)) return NextResponse.json({ error: "conversa inválida" }, { status: 400 });
  const mensagens: TurnMsg[] = body.mensagens
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .slice(-60)
    .map((m: any) => ({ role: m.role, text: m.text.slice(0, 32000), meta: m.meta, at: Number(m.at) > 0 ? Number(m.at) : undefined }));
  try {
    const novas = await importarConversa(userId, body.surface, scopeId, {
      titulo: texto(body.titulo, 200),
      parentId: sanitizeScopeId(body.parentId) ?? undefined,
      contexto: texto(body.contexto, 4000),
    }, mensagens);
    return NextResponse.json({ ok: true, novas });
  } catch {
    return NextResponse.json({ error: "falha ao guardar" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const userId = await resolveUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const scopeId = sanitizeScopeId(body?.scopeId);
  if (!salaValida(body?.surface) || !scopeId) return NextResponse.json({ error: "conversa inválida" }, { status: 400 });
  try {
    await guardarConversa(userId, body.surface, scopeId, {
      titulo: texto(body.titulo, 200),
      parentId: sanitizeScopeId(body.parentId) ?? undefined,
      contexto: texto(body.contexto, 4000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "falha ao guardar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const userId = await resolveUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const surface = url.searchParams.get("surface");
  const scopeId = sanitizeScopeId(url.searchParams.get("scopeId"));
  if (!salaValida(surface) || !scopeId) return NextResponse.json({ error: "conversa inválida" }, { status: 400 });
  const desde = url.searchParams.get("desde");
  if (desde !== null && !(Number(desde) > 0)) return NextResponse.json({ error: "instante inválido" }, { status: 400 });
  try {
    if (desde !== null) await cortarMensagens(userId, surface, scopeId, Number(desde));
    else await apagarConversa(userId, surface, scopeId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "falha ao apagar" }, { status: 500 });
  }
}
