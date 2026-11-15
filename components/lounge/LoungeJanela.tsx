"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import CyberCta from "@/components/main/CyberCta";
import { EVENTO_ABRIR_LOGIN } from "@/components/sub/hero-content";
const NaveHorizonte = dynamic(() => import("./NaveHorizonte"), { ssr: false });
const CosmicLounge = dynamic(() => import("@/components/cyber/CosmicLounge"), { ssr: false, loading: () => <div className="h-full w-full bg-[#03030a]" /> });

/**
 * Landing: só a VISTA do cyberespaço (o avatar meditando no menu, sem textos). A entrada é o CyberCta (botão com a
 * barra da pré-carga), CENTRALIZADO em cima do módulo — ele libera quando a pré-carga acaba; deslogado, pede o login
 * do hero (EVENTO_ABRIR_LOGIN). A cena 3D só monta PERTO da tela (e desmonta longe): a landing pode ter mais de uma
 * janela e uma cena WebGL fora da vista é só custo.
 * `destaque` = o painel do Figma ("Um lugar para estudar junto", out/2026): a largura toda, panorâmico, o botão no
 * CENTRO e os anéis de luz roxo/rosa no pé — a mesma vista ao vivo dentro.
 */
export default function LoungeJanela({ className = "", destaque = false }: { className?: string; destaque?: boolean }) {
  const { t } = useTranslation();
  const { status } = useSession();
  const ref = useRef<HTMLElement>(null);
  const [perto, setPerto] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") { setPerto(true); return; }
    const io = new IntersectionObserver(([e]) => setPerto(!!e?.isIntersecting), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-label={t("landing.interface.cyber_titulo", { defaultValue: "" })}
      className={destaque
        ? `relative mt-10 w-full ${className} overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#07061a] shadow-[0_30px_90px_-30px_rgba(139,92,246,0.55)] aspect-[16/10] md:aspect-[21/8] min-h-[300px]`
        : `relative mt-10 self-start w-full max-w-3xl ${className} overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#03030a] shadow-[0_0_60px_-20px_rgba(34,211,238,0.45)] aspect-[16/10] min-h-[260px]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#344b78,transparent_65%)]">
        {perto && (destaque ? <NaveHorizonte /> : <CosmicLounge modo="janela" />)}
      </div>
      <div className={destaque ? "absolute bottom-4 left-1/2 z-40 w-[min(92%,300px)] -translate-x-1/2" : "absolute left-1/2 top-3 z-40 -translate-x-1/2 w-[min(92%,300px)]"}>
        <CyberCta logado={status === "authenticated"} onLogin={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_LOGIN, { detail: { jogo: true } }))} className="dark !w-full !min-w-0 !bg-[#d6f7ff] !text-slate-900 shadow-lg" />
      </div>
    </section>
  );
}
