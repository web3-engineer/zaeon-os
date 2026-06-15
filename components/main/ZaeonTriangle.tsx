"use client";

/**
 * ZaeonTriangle — o ícone característico da Zaeon: o triângulo ⟁ girando.
 *
 * - Em descanso, gira suave (presença).
 * - REAGE a pesquisas: sempre que QUALQUER agente faz uma busca/chamada de IA,
 *   uma luz azul pisca de leve no centro do triângulo. Isso é disparado por um
 *   interceptor global de fetch (instalado uma única vez) que emite o evento
 *   "zaeon:pulse" quando a URL bate com rotas de IA/busca.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

let patched = false;
// Rotas de IA/busca que fazem o triângulo reagir (qualquer agente).
const PULSE_RX = /\/api\/(ai|scholar|agentic|research|projects\/agent)|search|summariz|relate|deepthink|agent|omega|study/i;
const fire = (url: string) => { try { if (url && PULSE_RX.test(url)) window.dispatchEvent(new CustomEvent("zaeon:pulse")); } catch { /* noop */ } };

function installPulseInterceptor() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  // 1) fetch
  if (window.fetch) {
    const orig = window.fetch.bind(window);
    window.fetch = ((...args: any[]) => {
      const a0 = args[0];
      fire(typeof a0 === "string" ? a0 : (a0 && a0.url) || "");
      return orig(...(args as [any, any]));
    }) as typeof window.fetch;
  }
  // 2) EventSource (streaming de pesquisa / SSE)
  if (window.EventSource) {
    const OrigES = window.EventSource;
    function PatchedES(this: any, url: string | URL, init?: EventSourceInit) {
      fire(String(url));
      return new OrigES(url, init);
    }
    PatchedES.prototype = OrigES.prototype;
    (PatchedES as any).CONNECTING = OrigES.CONNECTING; (PatchedES as any).OPEN = OrigES.OPEN; (PatchedES as any).CLOSED = OrigES.CLOSED;
    window.EventSource = PatchedES as any;
  }
  // 3) XMLHttpRequest
  if (window.XMLHttpRequest) {
    const origOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (this: any, method: string, url: string | URL, ...rest: any[]) {
      fire(String(url));
      return origOpen.call(this, method, url as any, ...(rest as []));
    } as any;
  }
}

/** Dispara o pulso manualmente (ex.: ações que não passam por fetch). */
export function pulseZaeon() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("zaeon:pulse"));
}

export default function ZaeonTriangle({
  size = 32,
  spinning = true,
  className = "",
}: { size?: number; spinning?: boolean; className?: string }) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    installPulseInterceptor();
    const onPulse = () => setPulse((p) => p + 1);
    window.addEventListener("zaeon:pulse", onPulse);
    return () => window.removeEventListener("zaeon:pulse", onPulse);
  }, []);

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* luz azul central — pisca a cada pesquisa */}
      {pulse > 0 && (
        <motion.span
          key={pulse}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.95, 0], scale: [0.2, 1.5, 0.2] }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.5, height: size * 0.5,
            background: "radial-gradient(circle, rgba(56,189,248,0.95), rgba(34,211,238,0.25) 55%, transparent 70%)",
          }}
        />
      )}
      {/* o triângulo girando */}
      <motion.span
        animate={spinning ? { rotate: 360 } : undefined}
        transition={spinning ? { repeat: Infinity, duration: 12, ease: "linear" } : undefined}
        className="relative font-black select-none leading-none"
        style={{ fontSize: size, color: "#22d3ee", textShadow: "0 0 8px rgba(34,211,238,0.55)" }}
      >
        ⟁
      </motion.span>
    </div>
  );
}
