/**
 * POST   /api/tcc/:id/share { papel?: "editor"|"leitor" } → { url, token, papel, escopo }   (só o dono)
 * DELETE /api/tcc/:id/share                               → revoga TODOS os links da conversa (só o dono)
 *
 * O convite é da CONVERSA, não deste documento — ver o cabeçalho de lib/tcc/compartilhar.ts. O
 * `escopo` volta no corpo pra UI dizer isso à pessoa antes de ela enviar o link.
 */
import { NextResponse } from "next/server";
import { entrarTcc, respostaDeRecusa } from "@/lib/tcc/route-auth";
import { linkDoTrabalho, revogarDoTrabalho } from "@/lib/tcc/compartilhar";
import { isPapelConvidavel } from "@/lib/cartolina/access";

export const runtime = "nodejs";

/** `sem_conversa` não é 404: o trabalho existe e é seu — só não dá pra compartilhar ASSIM. */
const recusa = (reason: string) =>
  reason === "sem_conversa"
    ? NextResponse.json({ error: "Este trabalho não está ligado a uma conversa, então não há com quem compartilhá-lo por aqui." }, { status: 400 })
    : respostaDeRecusa(reason);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await entrarTcc(req, "tcc-share");
  if ("response" in a) return a.response;
  const body = await req.json().catch(() => null);
  // padrão EDITOR: o pedido do dono é colaborar ("o colaborador pode alterar o documento"); quem
  // quer só mostrar pede leitor explicitamente.
  const papel = body && isPapelConvidavel(body.papel) ? body.papel : "editor";
  const r = await linkDoTrabalho(params.id, a.userId, papel);
  if (!r.ok) return recusa(r.reason);
  return NextResponse.json({ url: r.url, token: r.token, papel: r.papel, escopo: r.escopo });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await entrarTcc(req, "tcc-share");
  if ("response" in a) return a.response;
  const r = await revogarDoTrabalho(params.id, a.userId);
  if (!r.ok) return recusa(r.reason);
  return NextResponse.json({ ok: true });
}
