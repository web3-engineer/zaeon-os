/**
 * POST /api/auth/codigo { email } → manda o código de 6 números para entrar (#686).
 *   200 { ok: true }                         — mandou (a resposta é a mesma com conta ou sem conta)
 *   429 { ok: false, esperaS }               — pediu cedo demais; tente daqui a `esperaS` segundos
 *   502 { ok: false }                        — o e-mail não saiu (sem chave do Resend ou o Resend recusou)
 * Conta de fundador/admin não entra por e-mail: recebe o mesmo 200, mas nenhum código é mandado.
 */
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { colecaoCodigos, emailValido, limparEmail, prepararCodigo } from "@/lib/auth/codigoLogin";
import { enviarCodigoLogin } from "@/lib/email";
import { entraSoPeloGoogle } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await guard(req, "login-codigo", "ai-light");
  if (!rl.ok) return rl.response;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = limparEmail(body?.email);
  if (!emailValido(email)) return NextResponse.json({ ok: false, error: "e-mail inválido" }, { status: 400 });
  if (await entraSoPeloGoogle(email)) return NextResponse.json({ ok: true });
  try {
    const p = await prepararCodigo(await colecaoCodigos(), email);
    if (!p.ok) return NextResponse.json({ ok: false, esperaS: p.esperaS }, { status: 429 });
    return (await enviarCodigoLogin(email, p.codigo)) ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 502 });
  } catch (e) {
    console.warn("[auth/codigo] falhou:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
