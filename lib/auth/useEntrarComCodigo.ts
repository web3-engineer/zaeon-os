"use client";
/**
 * #686: entrar por e-mail em duas etapas — o e-mail (manda o código) e o código (entra). A tela de /login e o painel
 * do menu usam o mesmo fluxo: só muda a aparência.
 */
import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { emailValido, limparEmail } from "./emailLogin";

export type Etapa = "email" | "codigo";

export function useEntrarComCodigo(aoEntrar: () => void, inicial = "") {
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState(inicial);
  const [codigo, setCodigoCru] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);   // segundos até poder pedir outro código

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  /** manda (ou reenvia) o código. Devolve se mandou */
  const mandar = useCallback(async (): Promise<boolean> => {
    const alvo = limparEmail(email);
    if (!emailValido(alvo)) { setErro("Esse e-mail não parece completo. Exemplo: nome@dominio.com"); return false; }
    setErro(null); setOcupado(true);
    const r = await fetch("/api/auth/codigo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: alvo }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { ok?: boolean; esperaS?: number } | null;
    setOcupado(false);
    if (r?.ok && d?.ok) { setEmail(alvo); setEtapa("codigo"); setCodigoCru(""); setEspera(60); return true; }
    if (r?.status === 429 && d?.esperaS) {
      setEspera(d.esperaS);
      setErro(d.esperaS > 90 ? "Você pediu muitos códigos. Tente de novo mais tarde." : `Espere ${d.esperaS} s para pedir outro código.`);
      // já tem um código a caminho: a pessoa pode digitar o que chegou
      if (etapa === "email") { setEmail(alvo); setEtapa("codigo"); }
      return false;
    }
    setErro(r ? "Não consegui mandar o código agora. Tente de novo, ou entre pelo Google." : "Sem conexão. Confira a internet e tente de novo.");
    return false;
  }, [email, etapa]);

  const entrar = useCallback(async () => {
    if (!/^\d{6}$/.test(codigo)) { setErro("O código tem 6 números."); return; }
    setErro(null); setOcupado(true);
    const r = await signIn("credentials", { email: limparEmail(email), codigo, redirect: false }).catch(() => null);
    if (r?.ok && !r.error) { aoEntrar(); return; }
    setOcupado(false);
    setErro("Esse código não vale. Confira os 6 números, ou peça outro. O código vale por 10 minutos.");
  }, [codigo, email, aoEntrar]);

  /** só números, até 6 */
  const setCodigo = (v: string) => setCodigoCru(v.replace(/\D/g, "").slice(0, 6));
  const trocarEmail = () => { setEtapa("email"); setCodigoCru(""); setErro(null); };

  return { etapa, email, setEmail, codigo, setCodigo, erro, ocupado, espera, mandar, entrar, trocarEmail };
}
