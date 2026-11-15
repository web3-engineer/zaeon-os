"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { criarMarDaNave } from "@/components/cyber/MarDaNave";
import { criarNaveMini } from "@/components/cyber/NaveMini";

export default function NaveHorizonte() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      return;
    }

    const cena = new THREE.Scene();
    const nave = criarNaveMini({ low: true, submersa: true });
    const mar = criarMarDaNave(true);
    cena.add(nave.group, mar.group, new THREE.HemisphereLight(0xc7e8ff, 0x34485c, 1.5));

    const camera = new THREE.PerspectiveCamera(58, 1, .08, 350);
    const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    let quadro = 0;
    let anterior = 0;
    const desenhar = (agora: number) => {
      const t = movimento.matches ? 0 : agora / 1000;
      const dt = anterior ? Math.min((agora - anterior) / 1000, .05) : 0;
      anterior = agora;
      camera.position.set(.55 + Math.sin(t * .28) * .25, 2.22, -3);
      camera.lookAt(-3.8, 2.05, 2.1);
      nave.atualizar(dt, t);
      mar.atualizar(t);
      renderer.render(cena, camera);
      if (!movimento.matches) quadro = requestAnimationFrame(desenhar);
    };
    const ajustar = () => {
      cancelAnimationFrame(quadro);
      anterior = 0;
      camera.aspect = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight);
      camera.fov = camera.aspect < 1.35 ? 68 : 58;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      desenhar(performance.now());
    };
    const tamanho = new ResizeObserver(ajustar);
    tamanho.observe(canvas);
    movimento.addEventListener("change", ajustar);
    ajustar();
    return () => {
      cancelAnimationFrame(quadro);
      tamanho.disconnect();
      movimento.removeEventListener("change", ajustar);
      nave.dispose();
      mar.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="block h-full w-full bg-[#082849]" />;
}
