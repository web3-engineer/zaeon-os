"use client";

import { useEffect, useRef } from "react";

export default function BuracoNegroLanding() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const elemento = video.current;
    if (!elemento) return;
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sincronizar = () => {
      if (movimento.matches) elemento.pause();
      else void elemento.play().catch(() => {});
    };
    sincronizar();
    movimento.addEventListener("change", sincronizar);
    return () => { movimento.removeEventListener("change", sincronizar); elemento.pause(); };
  }, []);

  return <video ref={video} className="block h-full w-full object-contain" muted loop playsInline
    poster="/videos/visio-blackhole.jpg" src="/videos/visio-blackhole.webm" />;
}
