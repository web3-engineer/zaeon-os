"use client";

/**
 * AvisoVersaoNova — #756: quando entra um deploy com a aba aberta.
 *  - pedaço do site que sumiu (ChunkLoadError, o "Application error") → recarrega sozinha, no máximo 1× por minuto;
 *  - o commit do ar mudou (/api/versao, perguntado ao voltar para a aba e a cada 10 min) → faixa "Tem uma versão nova
 *    da Zaeon" com o botão Atualizar. Não recarrega sozinha nesse caso: a pessoa pode estar escrevendo.
 */
import { useEffect, useRef, useState } from "react";
import { ehErroDeChunk, podeRecarregar, versaoMudou } from "@/lib/ui/versaoNova";

const CHAVE = "zaeon:recarga-por-versao";
const A_CADA_MS = 10 * 60_000;

async function commitDoAr(): Promise<string | null> {
  try {
    const r = await fetch("/api/versao", { cache: "no-store" });
    if (!r.ok) return null;
    const d = (await r.json()) as { commit?: unknown };
    return typeof d.commit === "string" ? d.commit : null;
  } catch { return null; }   // sem internet: nada a dizer
}

export function AvisoVersaoNova() {
  const [nova, setNova] = useState(false);
  const daAba = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let vivo = true;

    const recarregarSePuder = (e: unknown) => {
      if (!ehErroDeChunk(e)) return;
      let ultima: number | null = null;
      try { const v = sessionStorage.getItem(CHAVE); ultima = v ? Number(v) : null; } catch { /* sem storage */ }
      if (podeRecarregar(Date.now(), ultima)) {
        try { sessionStorage.setItem(CHAVE, String(Date.now())); } catch { /* sem storage */ }
        window.location.reload();
      } else if (vivo) setNova(true);   // já recarregou há pouco: mostra a faixa em vez de entrar em laço
    };
    const aoErro = (ev: ErrorEvent) => recarregarSePuder(ev.error ?? ev.message);
    const aoPromessa = (ev: PromiseRejectionEvent) => recarregarSePuder(ev.reason);
    window.addEventListener("error", aoErro);
    window.addEventListener("unhandledrejection", aoPromessa);

    const conferir = async () => {
      const c = await commitDoAr();
      if (!vivo || !c) return;
      if (daAba.current === null) { daAba.current = c; return; }
      if (versaoMudou(daAba.current, c)) setNova(true);
    };
    conferir();
    const aoVoltar = () => { if (document.visibilityState === "visible") conferir(); };
    document.addEventListener("visibilitychange", aoVoltar);
    const t = setInterval(conferir, A_CADA_MS);

    return () => {
      vivo = false;
      window.removeEventListener("error", aoErro);
      window.removeEventListener("unhandledrejection", aoPromessa);
      document.removeEventListener("visibilitychange", aoVoltar);
      clearInterval(t);
    };
  }, []);

  if (!nova) return null;
  return (
    <div role="status" data-aviso-versao className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 rounded-2xl border border-cyan-400/40 bg-white/95 dark:bg-[#0b0f1f]/95 px-4 py-2.5 shadow-lg text-[13px] text-slate-800 dark:text-white/90 max-w-[calc(100vw-2rem)]">
      <span>Tem uma versão nova da Zaeon.</span>
      <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-1 text-[12px]">
        Atualizar
      </button>
    </div>
  );
}

export default AvisoVersaoNova;
