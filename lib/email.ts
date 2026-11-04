// Envio de e-mail. #686: o código de entrar vai pelo Resend (RESEND_API_KEY, remetente EMAIL_FROM).
// O código .edu continua só no log do servidor — PONTO DE PAUSA: ligar também no Resend.

export async function sendEduCode(to: string, code: string): Promise<boolean> {
  // TODO(pausa): integrar provedor real. Ex. Resend:
  //   await resend.emails.send({ from, to, subject, html })
  console.log(`[email] código de verificação .edu para ${to}: ${code}`);
  return true;
}

const REMETENTE = "Zaeon <login@zaeon.com.br>";

/**
 * #686: manda o código de entrar. Sem a chave em produção, não finge que mandou (o login fica de pé só pelo Google);
 * fora de produção, o código aparece no log do servidor para testar sem e-mail.
 */
export async function enviarCodigoLogin(to: string, codigo: string, f: typeof fetch = fetch): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    if (process.env.NODE_ENV !== "production") { console.log(`[email] código de entrada para ${to}: ${codigo}`); return true; }
    console.warn("[email] RESEND_API_KEY ausente: o código de entrada não foi enviado");
    return false;
  }
  const texto = `Seu código para entrar na Zaeon é ${codigo}.\n\nEle vale por 10 minutos. Se não foi você que pediu, ignore este e-mail: sem o código, ninguém entra na sua conta.`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1b2030">
<p>Seu código para entrar na Zaeon:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${codigo}</p>
<p>Ele vale por 10 minutos.</p>
<p style="color:#586079;font-size:13px">Se não foi você que pediu, ignore este e-mail: sem o código, ninguém entra na sua conta.</p></div>`;
  const r = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || REMETENTE, to: [to], subject: `${codigo} é o seu código da Zaeon`, text: texto, html }),
  }).catch(() => null);
  if (!r?.ok) console.warn("[email] o Resend recusou o envio do código:", r?.status ?? "sem resposta");
  return !!r?.ok;
}
