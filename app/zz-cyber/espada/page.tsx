"use client";
// (página de TESTE local, não vai pro repo: a Espada Espiritual girando, como na arte de referência)
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { criarEspadaEspiritual } from "@/components/cyber/EspadaEspiritual";
export default function Page() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(600, 900); R.setClearColor(0x16201d); R.domElement.style.cssText = "position:fixed;left:0;top:0;z-index:10000"; document.body.appendChild(R.domElement);
    const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 600 / 900, 0.05, 20); cam.position.set(0, 0.55, 3); cam.lookAt(0, 0.55, 0);
    cena.add(new THREE.AmbientLight(0xffffff, 0.35)); const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(1, 2, 2); cena.add(d);
    const e = criarEspadaEspiritual({ low: false }); cena.add(e.group);
    const t0 = performance.now(); let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); const t = (performance.now() - t0) / 1000; const q = new URLSearchParams(location.search);
      const rev = q.has("revela") ? Number(q.get("revela")) : Math.min(1, t / 1.2); e.group.rotation.y = q.has("giro") ? Number(q.get("giro")) : t * 0.6; e.atualizar(t, rev); R.render(cena, cam); };
    loop(); (window as unknown as { pronto: boolean }).pronto = true;
    return () => { cancelAnimationFrame(raf); e.dispose(); R.dispose(); R.domElement.remove(); };
  }, []);
  return <div ref={ref} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#16201d", display: "flex", justifyContent: "center" }} />;
}
