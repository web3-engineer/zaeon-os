/**
 * POST   /api/conversa/share { scopeId, papel? } → { url, token, papel, escopo }  (só o dono)
 * DELETE /api/conversa/share { scopeId }         → revoga TODOS os links da conversa (só o dono)
 *
 * A porta de compartilhamento DA CONVERSA. A outra (`/api/tcc/:id/share`) concede exatamente o
 * mesmo papel, mas exige um documento aberto — e conversa sem documento ficava sem porta nenhuma.
 * Ver lib/cartolina/conversa-share.ts.
 */
import { NextResponse } from "next/server";
import { entrar, falha, sanitizeScopeId } from "@/lib/cartolina/route-auth";
import { isPapelConvidavel } from "@/lib/cartolina/access";
import { linkDaConversa, revogarDaConversa } from "@/lib/cartolina/conversa-share";

export const runtime = "nodejs";

const semConversa = () =>
  NextResponse.json({ error: "Esta conversa ainda não pode ser compartilhada." }, { status: 400 });

export async function POST(req: Request) {
  const a = await entrar(req, "conversa-share");
  if ("response" in a) return a.response;
  const body = await req.json().catch(() => null);
  const scopeId = sanitizeScopeId((body as { scopeId?: unknown } | null)?.scopeId);
  if (!scopeId) return semConversa();
  // padrão EDITOR: quem compartilha a conversa quer colaborar; leitor é escolha explícita.
  const papel = body && isPapelConvidavel((body as { papel?: unknown }).papel)
    ? ((body as { papel: "editor" | "leitor" }).papel)
    : "editor";
  const r = await linkDaConversa(scopeId, a.userId, papel);
  if (!r.ok) return r.reason === "sem_conversa" ? semConversa() : falha(r.reason);
  return NextResponse.json({ url: r.url, token: r.token, papel: r.papel, escopo: r.escopo });
}

export async function DELETE(req: Request) {
  const a = await entrar(req, "conversa-share");
  if ("response" in a) return a.response;
  const body = await req.json().catch(() => null);
  const scopeId = sanitizeScopeId((body as { scopeId?: unknown } | null)?.scopeId);
  if (!scopeId) return semConversa();
  const r = await revogarDaConversa(scopeId, a.userId);
  if (!r.ok) return r.reason === "sem_conversa" ? semConversa() : falha(r.reason);
  return NextResponse.json({ ok: true });
}
