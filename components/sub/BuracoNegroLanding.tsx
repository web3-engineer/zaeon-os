"use client";

import { useEffect, useRef } from "react";

export default function BuracoNegroLanding() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const elemento = video.current;
    if (!elemento) return;
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cena = elemento.parentElement?.parentElement;
    const sincronizar = () => {
      const tempo = cena?.getAnimations()[0]?.currentTime;
      const ciclo = typeof tempo === "number" ? tempo % 83000 : 0;
      const visivel = !document.hidden && !elemento.closest("[data-fundo-pausado]");
      if (!movimento.matches && visivel && ciclo >= 61400 && ciclo <= 69800) {
        if (elemento.paused) void elemento.play().catch(() => {});
      } else if (!elemento.paused) elemento.pause();
    };
    sincronizar();
    const timer = window.setInterval(sincronizar, 300);
    document.addEventListener("visibilitychange", sincronizar);
    movimento.addEventListener("change", sincronizar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sincronizar);
      movimento.removeEventListener("change", sincronizar);
      elemento.pause();
    };
  }, []);

  return <video ref={video} className="block h-full w-full object-contain" muted loop playsInline preload="none"
    poster="/videos/visio-blackhole.jpg" src="/videos/visio-blackhole.webm" />;
}
