"use client";

/**
 * ChatZoom — o A− / A+ do chat (acessibilidade), discreto, igual ao zoom do leitor de PDF.
 * `useChatFontScale` devolve o `style` com `--chat-font-scale` pra pôr na raiz do chat; o
 * texto das mensagens usa `fonteChat(px)` (lib/ui/chatFontScale) e só ele muda de tamanho.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { EVT_ESCALA, ESCALA_PADRAO, PASSOS, gravarEscala, lerEscala, passo } from "@/lib/ui/chatFontScale";

export function useChatFontScale() {
  // Começa no padrão (SSR) e lê o aparelho depois de montar — evita divergência de hidratação.
  const [escala, setEscala] = useState<number>(ESCALA_PADRAO);
  const escalaRef = useRef(escala);
  escalaRef.current = escala;
  useEffect(() => {
    setEscala(lerEscala(typeof localStorage === "undefined" ? null : localStorage));
    const on = (e: Event) => setEscala((e as CustomEvent<number>).detail);
    window.addEventListener(EVT_ESCALA, on);
    return () => window.removeEventListener(EVT_ESCALA, on);
  }, []);
  // Calcula fora do updater (no StrictMode ele roda duas vezes) e avisa todo mundo — inclusive
  // a outra sala, montada escondida, que acompanha na hora.
  const mudar = useCallback((direcao: 1 | -1) => {
    const nova = passo(escalaRef.current, direcao);
    gravarEscala(typeof localStorage === "undefined" ? null : localStorage, nova);
    window.dispatchEvent(new CustomEvent(EVT_ESCALA, { detail: nova }));
  }, []);
  return {
    escala,
    menor: () => mudar(-1),
    maior: () => mudar(1),
    style: { ["--chat-font-scale" as string]: String(escala) } as React.CSSProperties,
  };
}

export default function ChatZoom({ escala, menor, maior, className = "", alvo = "texto" }: {
  escala: number;
  menor: () => void;
  maior: () => void;
  className?: string;
  /** #749: com um diagrama aberto na aba, os mesmos botões dão zoom nele (antes não faziam nada ali) */
  alvo?: "texto" | "diagrama";
}) {
  const noDiagrama = alvo === "diagrama";
  const noMin = !noDiagrama && escala <= PASSOS[0];
  const noMax = !noDiagrama && escala >= PASSOS[PASSOS.length - 1];
  const [rotMenor, rotMaior] = noDiagrama ? ["Afastar o diagrama", "Aproximar o diagrama"] : ["Diminuir o texto", "Aumentar o texto"];
  const btn = "w-7 h-7 rounded-full flex items-center justify-center font-semibold leading-none transition-colors disabled:opacity-30 disabled:cursor-default text-slate-600 dark:text-white/60 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500";
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} role="group" aria-label={noDiagrama ? "Zoom do diagrama" : `Tamanho do texto: ${Math.round(escala * 100)}%`}>
      <button type="button" onClick={menor} disabled={noMin} className={`${btn} text-[11px]`} aria-label={rotMenor} title={rotMenor}>A−</button>
      <button type="button" onClick={maior} disabled={noMax} className={`${btn} text-[14px]`} aria-label={rotMaior} title={rotMaior}>A+</button>
    </div>
  );
}
